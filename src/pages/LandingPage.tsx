import React from 'react';
import { ArrowRight, Layers, Zap, Shield, RotateCcw, Activity, Cpu } from 'lucide-react';


interface LandingPageProps {
  onNavigate: (page: string) => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({ onNavigate }) => {
  return (
    <div className="min-h-screen bg-[#0B1220] text-[#F8FAFC]">
      
      {/* Demo Environment Bar */}
      <div className="bg-[#111C2E] border-b border-[#293548] py-2 px-4 text-xs text-[#A8B3C7] text-center">
        <div className="max-w-7xl mx-auto flex items-center justify-center gap-3">
          <span className="inline-flex items-center gap-1.5 text-[#2DD4BF] font-medium">
            <span className="w-2 h-2 rounded-full bg-[#2DD4BF]" />
            Local Sandbox Engine Active
          </span>
          <span aria-hidden="true" className="text-[#293548]">·</span>
          <span>PostgreSQL Strict Invariants + Redis Lua Coordination Connected</span>
          <span aria-hidden="true" className="text-[#293548]">·</span>
          <button
            onClick={() => onNavigate('seats')}
            className="text-[#2DD4BF] hover:underline font-medium"
          >
            Launch Interactive 200-Seat Demo →
          </button>
        </div>
      </div>

      {/* Hero Section */}
      <section className="relative pt-12 pb-20 overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            
            {/* Left Content Column */}
            <div className="lg:col-span-7 space-y-6">
              
              <div className="text-xs uppercase tracking-wider text-[#2DD4BF] font-semibold font-mono">
                Distributed High-Contention Reservation Architecture
              </div>

              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-[#F8FAFC] leading-[1.1] text-balance">
                Reserve at Scale. <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#2DD4BF] to-[#60A5FA]">
                  Recover Automatically.
                </span>
              </h1>

              <p className="text-lg text-[#A8B3C7] max-w-2xl leading-relaxed">
                When thousands of users compete for limited seats in the same sub-second window, traditional databases deadlock and double-book. PulseReserve coordinates atomic temporary holds via Redis Lua scripts, fences stale releases, and reconciles state in the background.
              </p>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center gap-4 pt-2">
                <button
                  onClick={() => onNavigate('seats')}
                  className="px-6 py-3.5 rounded-lg text-sm font-semibold text-[#0B1220] bg-[#2DD4BF] hover:bg-[#2DD4BF]/90 transition-colors shadow-sm flex items-center gap-2"
                >
                  <span>Explore Live Seat Grid</span>
                  <ArrowRight className="w-4 h-4" />
                </button>

                <button
                  onClick={() => onNavigate('dashboard')}
                  className="px-6 py-3.5 rounded-lg text-sm font-medium text-[#F8FAFC] bg-[#111C2E] hover:bg-[#17243B] border border-[#293548] transition-colors"
                >
                  View Engine Metrics
                </button>
              </div>

              {/* Unboxed Metadata Metrics */}
              <div className="pt-6 border-t border-[#293548]/70 flex flex-wrap items-center gap-6 text-xs text-[#A8B3C7]">
                <div>
                  <span className="font-mono text-sm font-semibold text-[#F8FAFC]">200 Units</span>
                  <div className="text-[#A8B3C7]/80">Demo Keynote Arena</div>
                </div>
                <span aria-hidden="true" className="text-[#293548]">/</span>
                <div>
                  <span className="font-mono text-sm font-semibold text-[#2DD4BF]">0 Double Bookings</span>
                  <div className="text-[#A8B3C7]/80">Guaranteed Invariant</div>
                </div>
                <span aria-hidden="true" className="text-[#293548]">/</span>
                <div>
                  <span className="font-mono text-sm font-semibold text-[#60A5FA]">5m Temporary Hold</span>
                  <div className="text-[#A8B3C7]/80">Server-Authoritative Expiry</div>
                </div>
              </div>

            </div>

            {/* Right Media Hero Card */}
            <div className="lg:col-span-5 relative">
              <div className="relative rounded-2xl overflow-hidden border border-[#293548] shadow-2xl bg-[#111C2E]">
                <img
                 src="https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=1600&q=80"
                  alt="High throughput server architecture"
                  className="w-full h-80 object-cover"
                />
                <div className="p-5 border-t border-[#293548] space-y-3 bg-[#111C2E]">
                  <div className="flex items-center justify-between text-xs text-[#A8B3C7]">
                    <span className="font-mono font-medium text-[#F8FAFC]">Cluster Telemetry</span>
                    <span className="text-[#2DD4BF] font-mono">Sub-10ms Batching</span>
                  </div>
                  <div className="text-xs text-[#A8B3C7] leading-relaxed">
                    Redis single-threaded script execution isolates concurrent seat claims into atomic transactions, preventing race conditions before persisting to PostgreSQL.
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* Key Architectural Capabilities Section */}
      <section className="py-20 bg-[#0B1220] border-t border-[#293548]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="max-w-3xl mb-14">
            <h2 className="text-xs font-mono uppercase tracking-wider text-[#2DD4BF] font-semibold mb-2">
              Core System Architecture
            </h2>
            <h3 className="text-3xl font-bold tracking-tight text-[#F8FAFC]">
              Engineered for High-Contention Reliability
            </h3>
            <p className="mt-3 text-sm text-[#A8B3C7] leading-relaxed">
              Every stage of the reservation lifecycle enforces strict mathematical invariants to protect inventory integrity under intense flash-sale traffic.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            
            {/* Capability 1 */}
            <div className="bg-[#111C2E] border border-[#293548] rounded-xl p-6 space-y-3">
              <div className="w-10 h-10 rounded-lg bg-[#2DD4BF]/10 flex items-center justify-center text-[#2DD4BF]">
                <Zap className="w-5 h-5" />
              </div>
              <h4 className="text-base font-semibold text-[#F8FAFC]">Atomic Lua Coordination</h4>
              <p className="text-xs text-[#A8B3C7] leading-relaxed">
                Redis Lua scripts atomically inspect unit status, verify hold expiry, assign fencing generation tokens, and apply TTL in a single non-preemptible operation.
              </p>
            </div>

            {/* Capability 2 */}
            <div className="bg-[#111C2E] border border-[#293548] rounded-xl p-6 space-y-3">
              <div className="w-10 h-10 rounded-lg bg-[#60A5FA]/10 flex items-center justify-center text-[#60A5FA]">
                <Shield className="w-5 h-5" />
              </div>
              <h4 className="text-base font-semibold text-[#F8FAFC]">Stale-Request Fencing</h4>
              <p className="text-xs text-[#A8B3C7] leading-relaxed">
                Monotonically increasing generation tokens prevent stale clients or delayed network packets from releasing or overwriting a newer reservation hold.
              </p>
            </div>

            {/* Capability 3 */}
            <div className="bg-[#111C2E] border border-[#293548] rounded-xl p-6 space-y-3">
              <div className="w-10 h-10 rounded-lg bg-[#2DD4BF]/10 flex items-center justify-center text-[#2DD4BF]">
                <RotateCcw className="w-5 h-5" />
              </div>
              <h4 className="text-base font-semibold text-[#F8FAFC]">Self-Healing Reconciler</h4>
              <p className="text-xs text-[#A8B3C7] leading-relaxed">
                A background worker periodically scans for unreleased expired holds, heals transient Redis-PostgreSQL cache drift, and recovers failed outbox persist events.
              </p>
            </div>

            {/* Capability 4 */}
            <div className="bg-[#111C2E] border border-[#293548] rounded-xl p-6 space-y-3">
              <div className="w-10 h-10 rounded-lg bg-[#60A5FA]/10 flex items-center justify-center text-[#60A5FA]">
                <Layers className="w-5 h-5" />
              </div>
              <h4 className="text-base font-semibold text-[#F8FAFC]">Transactional Outbox</h4>
              <p className="text-xs text-[#A8B3C7] leading-relaxed">
                Persistence and notification events are saved inside the transactional database boundaries, ensuring zero dropped confirmations even during worker interruptions.
              </p>
            </div>

            {/* Capability 5 */}
            <div className="bg-[#111C2E] border border-[#293548] rounded-xl p-6 space-y-3">
              <div className="w-10 h-10 rounded-lg bg-[#2DD4BF]/10 flex items-center justify-center text-[#2DD4BF]">
                <Cpu className="w-5 h-5" />
              </div>
              <h4 className="text-base font-semibold text-[#F8FAFC]">Adaptive Micro-Batching</h4>
              <p className="text-xs text-[#A8B3C7] leading-relaxed">
                An optional scheduler groups requests into sub-10ms micro-batches, assigns sequential numbers, measures queue delay, and dampens thundering-herd database strain.
              </p>
            </div>

            {/* Capability 6 */}
            <div className="bg-[#111C2E] border border-[#293548] rounded-xl p-6 space-y-3">
              <div className="w-10 h-10 rounded-lg bg-[#60A5FA]/10 flex items-center justify-center text-[#60A5FA]">
                <Activity className="w-5 h-5" />
              </div>
              <h4 className="text-base font-semibold text-[#F8FAFC]">Real Observability</h4>
              <p className="text-xs text-[#A8B3C7] leading-relaxed">
                Live metrics stream p50, p95, and p99 latencies, collision rejection rates, worker backlog, and an experimental ML autoregressive traffic-spike forecaster.
              </p>
            </div>

          </div>

        </div>
      </section>

      {/* Live System Architecture Diagram Section */}
      <section className="py-20 bg-[#111C2E]/40 border-t border-[#293548]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="text-center max-w-2xl mx-auto mb-12">
            <h2 className="text-xs font-mono uppercase tracking-wider text-[#2DD4BF] font-semibold mb-2">
              Data Flow & Invariant Enforcement
            </h2>
            <h3 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#F8FAFC]">
              How PulseReserve Prevents Double Bookings
            </h3>
          </div>

          <div className="bg-[#111C2E] border border-[#293548] rounded-2xl p-8 max-w-5xl mx-auto">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 relative">
              
              <div className="bg-[#0B1220] border border-[#293548] rounded-xl p-5 space-y-2">
                <div className="text-xs font-mono text-[#A8B3C7]">Step 01</div>
                <div className="text-sm font-semibold text-[#F8FAFC]">Client Request</div>
                <p className="text-xs text-[#A8B3C7]">
                  User requests seat with optional idempotency key. Token-bucket rate limiter admits request.
                </p>
              </div>

              <div className="bg-[#0B1220] border border-[#293548] rounded-xl p-5 space-y-2">
                <div className="text-xs font-mono text-[#2DD4BF]">Step 02</div>
                <div className="text-sm font-semibold text-[#F8FAFC]">Redis Lua Fencing</div>
                <p className="text-xs text-[#A8B3C7]">
                  Atomic script inspects seat status. Exactly one request wins hold; competing requests receive 409 collision rejection.
                </p>
              </div>

              <div className="bg-[#0B1220] border border-[#293548] rounded-xl p-5 space-y-2">
                <div className="text-xs font-mono text-[#60A5FA]">Step 03</div>
                <div className="text-sm font-semibold text-[#F8FAFC]">PostgreSQL Source</div>
                <p className="text-xs text-[#A8B3C7]">
                  Database enforces UNIQUE constraint on (event_id, unit_id). Booking persisted with outbox event.
                </p>
              </div>

              <div className="bg-[#0B1220] border border-[#293548] rounded-xl p-5 space-y-2">
                <div className="text-xs font-mono text-[#10B981]">Step 04</div>
                <div className="text-sm font-semibold text-[#F8FAFC]">Self-Healing Loop</div>
                <p className="text-xs text-[#A8B3C7]">
                  Worker clears unconfirmed holds past 300s. Periodic reconciler heals discrepancies safely.
                </p>
              </div>

            </div>

            <div className="mt-8 pt-6 border-t border-[#293548] flex flex-wrap items-center justify-between gap-4 text-xs text-[#A8B3C7]">
              <div className="flex items-center gap-2">
                <span className="text-[#2DD4BF] font-semibold">Zero Phantom Holds:</span>
                <span>Browser countdown is display-only; server timestamp governs validation.</span>
              </div>
              <button
                onClick={() => onNavigate('seats')}
                className="text-[#2DD4BF] hover:underline font-semibold"
              >
                Launch Reservation Flow →
              </button>
            </div>
          </div>

        </div>
      </section>

    </div>
  );
};
