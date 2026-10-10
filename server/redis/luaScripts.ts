// ==============================================================================
// PulseReserve Redis Lua Scripts for Atomic High-Contention Coordination
// ==============================================================================

/**
 * 1. CLAIM HOLD SCRIPT
 * Atomically checks unit availability, verifies or resets expired generations,
 * assigns fencing generation token and hold TTL.
 *
 * KEYS[1]: inventory:{eventId}:{unitId}
 * ARGV[1]: userId
 * ARGV[2]: holdToken
 * ARGV[3]: holdDurationMs (e.g. 300000 = 5 minutes)
 * ARGV[4]: currentTimestampMs
 */
export const CLAIM_HOLD_LUA = `
local key = KEYS[1]
local userId = ARGV[1]
local holdToken = ARGV[2]
local holdDurationMs = tonumber(ARGV[3])
local nowMs = tonumber(ARGV[4])

local status = redis.call("HGET", key, "status")
local currentGen = tonumber(redis.call("HGET", key, "generation") or "0")
local expiresAt = tonumber(redis.call("HGET", key, "expires_at") or "0")

-- Fail closed: inventory must be initialized from PostgreSQL before claims are accepted.
if not status then return { 0, "INVENTORY_NOT_INITIALIZED", "0" } end

-- Unit is available if marked AVAILABLE or its previous hold has strictly expired.
if status == "AVAILABLE" or (status == "HELD" and expiresAt <= nowMs) then
    local nextGen = currentGen + 1
    local newExpiresAt = nowMs + holdDurationMs

    redis.call("HSET", key, 
        "status", "HELD",
        "user_id", userId,
        "hold_token", holdToken,
        "generation", nextGen,
        "expires_at", newExpiresAt,
        "claimed_at", nowMs
    )
    -- Keep the inventory hash persistent so generation fencing survives hold expiry.
    -- expires_at is enforced atomically by every claim/confirm/reconcile script.

    return { 1, tostring(nextGen), tostring(newExpiresAt) }
else
    -- Locked: either active valid HELD or already CONFIRMED
    return { 0, status, tostring(expiresAt) }
end
`;

/**
 * 2. CONFIRM HOLD SCRIPT
 * Validates active hold token, fencing generation, and expiry time.
 * Transitions state to CONFIRMED and removes temporary hold TTL.
 *
 * KEYS[1]: inventory:{eventId}:{unitId}
 * ARGV[1]: userId
 * ARGV[2]: holdToken
 * ARGV[3]: expectedGeneration
 * ARGV[4]: currentTimestampMs
 */
export const CONFIRM_HOLD_LUA = `
local key = KEYS[1]
local userId = ARGV[1]
local holdToken = ARGV[2]
local expectedGen = tonumber(ARGV[3])
local nowMs = tonumber(ARGV[4])

local status = redis.call("HGET", key, "status")
local currentHolder = redis.call("HGET", key, "user_id")
local currentToken = redis.call("HGET", key, "hold_token")
local currentGen = tonumber(redis.call("HGET", key, "generation") or "0")
local expiresAt = tonumber(redis.call("HGET", key, "expires_at") or "0")

if not status then
    return { 0, "NOT_FOUND" }
end

if status == "CONFIRMED" then
    -- Idempotent check: if same holder and token confirmed already
    if currentToken == holdToken then
        return { 1, "ALREADY_CONFIRMED" }
    else
        return { 0, "ALREADY_CONFIRMED_BY_OTHER" }
    end
end

if status ~= "HELD" then
    return { 0, "INVALID_STATE_" .. status }
end

if currentGen ~= expectedGen then
    return { 0, "STALE_GENERATION" }
end

if currentToken ~= holdToken then
    return { 0, "INVALID_HOLD_TOKEN" }
end

if expiresAt <= nowMs then
    return { 0, "HOLD_EXPIRED" }
end

-- Confirm booking atomically
local nextGen = currentGen + 1
redis.call("HSET", key,
    "status", "CONFIRMED",
    "generation", nextGen,
    "confirmed_at", nowMs
)
-- Remove temporary TTL since confirmed units persist
redis.call("PERSIST", key)

return { 1, "CONFIRMED", tostring(nextGen) }
`;

/**
 * 3. RELEASE HOLD SCRIPT
 * Safely releases hold only if generation and token match.
 * Prevents stale releases from unclaiming a newer reservation.
 *
 * KEYS[1]: inventory:{eventId}:{unitId}
 * ARGV[1]: holdToken
 * ARGV[2]: expectedGeneration
 */
export const RELEASE_HOLD_LUA = `
local key = KEYS[1]
local holdToken = ARGV[1]
local expectedGen = tonumber(ARGV[2])

local status = redis.call("HGET", key, "status")
local currentToken = redis.call("HGET", key, "hold_token")
local currentGen = tonumber(redis.call("HGET", key, "generation") or "0")

if not status then
    return { 1, "ALREADY_RELEASED" }
end

if status == "CONFIRMED" then
    return { 0, "CANNOT_RELEASE_CONFIRMED" }
end

-- Reject if generation is not current (stale release)
if currentGen ~= expectedGen then
    return { 0, "STALE_GENERATION" }
end

if currentToken ~= holdToken then
    return { 0, "INVALID_HOLD_TOKEN" }
end

-- Safely release
local nextGen = currentGen + 1
redis.call("HSET", key,
    "status", "AVAILABLE",
    "generation", nextGen,
    "user_id", "",
    "hold_token", "",
    "expires_at", "0"
)
redis.call("PERSIST", key)

return { 1, "RELEASED", tostring(nextGen) }
`;

/**
 * 4. RECONCILER EXPIRED HOLD RELEASE SCRIPT
 * Reconciler calls this to clean up expired holds without race conditions.
 *
 * KEYS[1]: inventory:{eventId}:{unitId}
 * ARGV[1]: expectedGeneration
 * ARGV[2]: nowMs
 */
export const RECONCILE_RELEASE_EXPIRED_LUA = `
local key = KEYS[1]
local expectedGen = tonumber(ARGV[1])
local nowMs = tonumber(ARGV[2])

local status = redis.call("HGET", key, "status")
local currentGen = tonumber(redis.call("HGET", key, "generation") or "0")
local expiresAt = tonumber(redis.call("HGET", key, "expires_at") or "0")

if status == "HELD" and currentGen == expectedGen and expiresAt <= nowMs then
    local nextGen = currentGen + 1
    redis.call("HSET", key,
        "status", "AVAILABLE",
        "generation", nextGen,
        "user_id", "",
        "hold_token", "",
        "expires_at", "0"
    )
    redis.call("PERSIST", key)
    return { 1, "EXPIRED_RELEASED", tostring(nextGen) }
else
    return { 0, "SKIPPED_NOT_EXPIRED_OR_STALE" }
end
`;

/**
 * 5. TOKEN BUCKET RATE LIMITER SCRIPT
 *
 * KEYS[1]: ratelimit:{clientKey}
 * ARGV[1]: maxTokens (e.g. 30 requests)
 * ARGV[2]: refillRatePerSec (e.g. 5 tokens/sec)
 * ARGV[3]: nowSeconds
 */
export const TOKEN_BUCKET_RATE_LIMIT_LUA = `
local key = KEYS[1]
local maxTokens = tonumber(ARGV[1])
local refillRate = tonumber(ARGV[2])
local nowSec = tonumber(ARGV[3])

local data = redis.call("HMGET", key, "tokens", "last_updated")
local tokens = tonumber(data[1])
local lastUpdated = tonumber(data[2])

if not tokens then
    tokens = maxTokens - 1
    lastUpdated = nowSec
    redis.call("HMSET", key, "tokens", tokens, "last_updated", lastUpdated)
    redis.call("EXPIRE", key, 60)
    return { 1, tokens }
end

local delta = math.max(0, nowSec - lastUpdated)
tokens = math.min(maxTokens, tokens + delta * refillRate)
lastUpdated = nowSec

if tokens >= 1 then
    tokens = tokens - 1
    redis.call("HMSET", key, "tokens", tokens, "last_updated", lastUpdated)
    redis.call("EXPIRE", key, 60)
    return { 1, tokens }
else
    redis.call("HMSET", key, "tokens", tokens, "last_updated", lastUpdated)
    redis.call("EXPIRE", key, 60)
    return { 0, tokens }
end
`;
