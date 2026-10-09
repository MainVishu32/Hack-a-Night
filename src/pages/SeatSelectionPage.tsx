import React, { useState, useEffect } from 'react';
import {
  Layers,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  ShieldCheck,
  AlertCircle,
  RefreshCw,
  ArrowRight,
  Flame,
  XCircle,
  Check
} from 'lucide-react';
import { api } from '../services/api.ts';
import { EventItem, InventoryUnit } from '../types/index.ts';
import { useAuth } from '../context/AuthContext.tsx';
import { CountdownTimer } from '../components/CountdownTimer.tsx';


interface SeatSelectionPageProps {
  onNavigate: (page: string, params?: any) => void;
  eventId?: string;
}

export const SeatSelectionPage: React.FC<SeatSelectionPageProps> = ({ onNavigate, eventId: selectedEventId }) => {
  const eventId = selectedEventId || 'evt_summit_2026';
  const { user } = useAuth();
  const [event, setEvent] = useState<EventItem | null>(null);
  const [units, setUnits] = useState<InventoryUnit[]>([]);
  const [summary, setSummary] = useState({ total: 200, available: 196, held: 0, confirmed: 4 });
  const [loading, setLoading] = useState(true);
  const [inventoryError, setInventoryError] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [serverTimeOffset, setServerTimeOffset] = useState(0);

  // Filters
  const [selectedTier, setSelectedTier] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Selected Seat & Reservation details
  const [selectedUnit, setSelectedUnit] = useState<InventoryUnit | null>(null);
  const [activeReservationId, setActiveReservationId] = useState<string | null>(null);
  const [holdExpiresAt, setHoldExpiresAt] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);

  const fetchInventory = async (isManual = false) => {
    if (isManual) setRefreshing(true);
    try {
      const data = await api.getEventInventory(eventId);
      setInventoryError('');
      setEvent(data.event);
      setUnits(data.units);
      setSummary(data.summary);

      // Compute server clock offset
      const localNow = Date.now();
      setServerTimeOffset(data.serverTime - localNow);

      // Check if current user has an active hold
      const myHeldUnit = data.units.find(u => u.isMine && u.status === 'HELD');
      if (myHeldUnit && myHeldUnit.expiresAt) {
        setHoldExpiresAt(myHeldUnit.expiresAt);
      }
    } catch (err: any) {
      setInventoryError(err instanceof Error ? err.message : 'Could not load ticket availability.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchInventory();
    const interval = setInterval(() => fetchInventory(false), 2500);
    return () => clearInterval(interval);
  }, [eventId]);

  // Filtered units
  const filteredUnits = units.filter(u => {
    const matchesTier = selectedTier === 'ALL' || u.tier === selectedTier;
    const matchesSearch = searchQuery === '' || u.unitCode.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesTier && matchesSearch;
  });
  const tierOptions = [
    { value: 'ALL', label: `All tickets (${summary.total})` },
    ...(['VIP', 'PREMIUM', 'STANDARD'] as const)
      .map(tier => {
        const tierUnits = units.filter(unit => unit.tier === tier);
        const price = tierUnits.length ? Math.min(...tierUnits.map(unit => unit.price)) : null;
        const name = tier === 'PREMIUM' ? 'Premium' : tier === 'STANDARD' ? 'Standard' : 'VIP';
        return { value: tier, label: `${name} (${tierUnits.length})${price === null ? '' : ` · from $${price.toFixed(0)}`}` };
      })
      .filter(option => units.some(unit => unit.tier === option.value)),
  ];

  // Group by Row
  const rows = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'];

  const handleSelectUnit = (unit: InventoryUnit) => {
    setSelectedUnit(unit);
    setFeedback(null);
  };

  const handleCreateHold = async () => {
    if (!user) {
      onNavigate('login');
      return;
    }

    if (!selectedUnit) return;

    try {
      setActionLoading(true);
      setFeedback(null);

      const idempotencyKey = `hold_${user.id}_${selectedUnit.id}_${Date.now()}`;
      const result = await api.createHold(eventId, selectedUnit.id, idempotencyKey);

      setActiveReservationId(result.reservationId);
      setHoldExpiresAt(result.expiresAt);
      setFeedback({
        type: 'success',
        message: 'Reservation hold created. Proceed to checkout before your hold expires.'
      });

      // Refresh inventory immediately to sync Redis state
      await fetchInventory(false);
      
      // Update selected unit reference
      setSelectedUnit(prev => prev ? { ...prev, status: 'HELD', isMine: true, expiresAt: result.expiresAt } : null);
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: err.message || 'This seat is no longer available. Please select another seat.'
      });
      await fetchInventory(false);
    } finally {
      setActionLoading(false);
    }
  };

  const handleCancelHold = async () => {
    if (!activeReservationId) return;

    try {
      setActionLoading(true);
      await api.cancelReservation(activeReservationId);
      setActiveReservationId(null);
      setHoldExpiresAt(null);
      setFeedback({
        type: 'info',
        message: 'Reservation cancelled. Inventory returned to available pool.'
      });
      await fetchInventory(false);
      setSelectedUnit(prev => prev ? { ...prev, status: 'AVAILABLE', isMine: false, expiresAt: null } : null);
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: err.message || 'Unable to cancel reservation.'
      });
    } finally {
      setActionLoading(false);
    }
  };

  const handleProceedToCheckout = () => {
    if (activeReservationId) {
      onNavigate('checkout', { reservationId: activeReservationId });
    }
  };

  if (loading && units.length === 0) {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center bg-[#0B1220]">
        <div className="flex items-center gap-3 text-sm text-[#A8B3C7]">
          <RefreshCw className="w-5 h-5 animate-spin text-[#2DD4BF]" />
          <span>Getting tickets ready…</span>
        </div>
      </div>
    );
  }

  if (inventoryError && units.length === 0) {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center px-4 py-12 bg-[#0B1220]">
        <div className="max-w-md rounded-2xl border border-[#293548] bg-[#111C2E] p-8 text-center">
          <AlertCircle className="mx-auto h-9 w-9 text-[#F26B4F]" />
          <h1 className="mt-4 text-xl font-bold text-[#F8FAFC]">Tickets aren’t available right now</h1>
          <p className="mt-2 text-sm text-[#A8B3C7]">{inventoryError}</p>
          <button onClick={() => { void fetchInventory(true); }} className="mt-5 rounded-xl bg-[#2DD4BF] px-5 py-2.5 text-sm font-semibold text-[#0B1220]">
            Try again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0B1220] py-8 text-[#F8FAFC]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        
        {/* Event Header Banner */}
        <div className="bg-[#111C2E] border border-[#293548] rounded-2xl overflow-hidden shadow-xl grid grid-cols-1 lg:grid-cols-12">
          
          <div className="lg:col-span-8 p-6 sm:p-8 space-y-4 flex flex-col justify-between">
            <div className="space-y-2">
              <div className="flex items-center gap-3 text-xs text-[#2DD4BF]">
                <span className="font-semibold">TICKETS & SEATS</span>
                <span aria-hidden="true" className="text-[#293548]">·</span>
                <span>{summary.total} {summary.total === 1 ? 'spot' : 'spots'}</span>
              </div>

              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#F8FAFC]">
                {event?.title || 'Global Tech Summit 2026 Keynote'}
              </h1>

              <p className="text-xs sm:text-sm text-[#A8B3C7] max-w-2xl leading-relaxed">
                {event?.description || 'A gathering for people curious about the technology shaping tomorrow.'}
              </p>
            </div>

            {/* Inventory Distribution Strip */}
            <div className="pt-4 border-t border-[#293548] flex flex-wrap items-center gap-6 text-xs text-[#A8B3C7]">
              <div>
                <span className="text-sm font-bold font-mono text-[#10B981] tabular-nums">{summary.available}</span>
                <div className="text-[11px]">Available</div>
              </div>
              <span aria-hidden="true" className="text-[#293548]">·</span>
              <div>
                <span className="text-sm font-bold font-mono text-[#F59E0B] tabular-nums">{summary.held}</span>
                <div className="text-[11px]">Temporarily Held</div>
              </div>
              <span aria-hidden="true" className="text-[#293548]">·</span>
              <div>
                <span className="text-sm font-bold font-mono text-[#60A5FA] tabular-nums">{summary.confirmed}</span>
                <div className="text-[11px]">Booked</div>
              </div>
              <span aria-hidden="true" className="text-[#293548]">·</span>
              <div className="flex items-center gap-1.5 font-mono text-[11px]">
                <Clock className="w-3.5 h-3.5 text-[#2DD4BF]" />
                <span>We’ll hold your seat for {Math.ceil((event?.hold_duration_seconds ?? 300) / 60)} minutes</span>
              </div>
            </div>
          </div>

          <div className="lg:col-span-4 relative hidden lg:block">
            <img
           src="https://images.unsplash.com/photo-1540575467063-178a50c2df87?auto=format&fit=crop&w=1200&q=80"  
              alt="Auditorium stage"
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-[#111C2E] via-transparent to-transparent" />
          </div>

        </div>

        {inventoryError && (
          <div className="flex items-center justify-between gap-3 rounded-xl border border-[#F59E0B]/30 bg-[#F59E0B]/10 px-4 py-3 text-xs text-[#A15D16]" role="status">
            <span>Availability may be out of date. {inventoryError}</span>
            <button onClick={() => { void fetchInventory(true); }} className="shrink-0 font-semibold underline">Refresh tickets</button>
          </div>
        )}

        {/* Filter & Search Bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 bg-[#111C2E] border border-[#293548] rounded-xl">
          
          {/* Segmented Tier Controls (Interactive Functional Buttons) */}
          <div className="flex items-center gap-1 p-1 bg-[#0B1220] rounded-lg border border-[#293548]">
            {tierOptions.map(option => (
              <button
                key={option.value}
                onClick={() => setSelectedTier(option.value)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                  selectedTier === option.value
                    ? 'bg-[#111C2E] text-[#2DD4BF] shadow-sm'
                    : 'text-[#A8B3C7] hover:text-[#F8FAFC]'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>

          {/* Search Box & Refresh Trigger */}
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <div className="relative flex-1 sm:w-56">
              <Search className="w-4 h-4 text-[#A8B3C7] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search seat e.g. A-05"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 bg-[#0B1220] border border-[#293548] rounded-lg text-xs text-[#F8FAFC] placeholder-[#A8B3C7]/40 focus:outline-none focus:border-[#2DD4BF]"
              />
            </div>

            <button
              onClick={() => fetchInventory(true)}
              className="p-2 bg-[#0B1220] hover:bg-[#17243B] border border-[#293548] rounded-lg text-[#A8B3C7] hover:text-[#F8FAFC] transition-colors"
              title="Refresh ticket availability"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin text-[#2DD4BF]' : ''}`} />
            </button>
          </div>

        </div>

        {/* Legend */}
        <div className="flex flex-wrap items-center justify-between gap-4 px-2 text-xs text-[#A8B3C7]">
          <div className="flex items-center gap-6">
            <span className="flex items-center gap-2">
              <span className="w-3.5 h-3.5 rounded bg-[#111C2E] border border-[#293548]" />
              <span>Available</span>
            </span>
            <span className="flex items-center gap-2">
              <span className="w-3.5 h-3.5 rounded bg-[#2DD4BF] border border-[#2DD4BF] text-[#0B1220]" />
              <span>Your Active Hold</span>
            </span>
            <span className="flex items-center gap-2">
              <span className="w-3.5 h-3.5 rounded bg-[#F59E0B]/20 border border-[#F59E0B]" />
              <span>Held by Others</span>
            </span>
            <span className="flex items-center gap-2">
              <span className="w-3.5 h-3.5 rounded bg-[#60A5FA]/20 border border-[#60A5FA]" />
              <span>Sold out</span>
            </span>
          </div>

          <div className="text-[11px] font-mono text-[#A8B3C7]/80">
            Stage front is toward Row A
          </div>
        </div>

        {/* Grid and Detail Panel Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* Interactive seat map */}
          <div className="lg:col-span-8 bg-[#111C2E] border border-[#293548] rounded-2xl p-6 space-y-6 shadow-xl">
            
            {/* Stage Indicator Bar */}
            <div className="w-full py-2 bg-[#0B1220] border border-[#293548] rounded-lg text-center text-xs font-mono text-[#2DD4BF] tracking-wider uppercase">
              Stage
            </div>

            {/* Seat Matrix */}
            <div className="space-y-3 overflow-x-auto pb-2">
              {rows.map(rowLetter => {
                const rowUnits = filteredUnits.filter(u => u.rowLabel === rowLetter);
                if (rowUnits.length === 0) return null;

                const isVipRow = rowLetter === 'A' || rowLetter === 'B';
                const isPremiumRow = rowLetter === 'C' || rowLetter === 'D' || rowLetter === 'E';

                return (
                  <div key={rowLetter} className="flex items-center gap-2 min-w-[620px]">
                    <div className="w-6 text-center text-xs font-mono font-bold text-[#A8B3C7] shrink-0">
                      {rowLetter}
                    </div>

                    <div className="grid grid-cols-20 gap-1.5 flex-1">
                      {rowUnits.map(unit => {
                        const isSelected = selectedUnit?.id === unit.id;
                        const isMyHold = unit.isMine && unit.status === 'HELD';

                        let seatColor = 'bg-[#0B1220] border-[#293548] text-[#A8B3C7] hover:border-[#2DD4BF] hover:text-[#F8FAFC]';

                        if (unit.status === 'CONFIRMED') {
                          seatColor = 'bg-[#60A5FA]/15 border-[#60A5FA]/50 text-[#60A5FA] cursor-not-allowed opacity-80';
                        } else if (isMyHold) {
                          seatColor = 'bg-[#2DD4BF] border-[#2DD4BF] text-[#0B1220] font-bold shadow-md';
                        } else if (unit.status === 'HELD') {
                          seatColor = 'bg-[#F59E0B]/15 border-[#F59E0B]/50 text-[#F59E0B] cursor-not-allowed';
                        }

                        if (isSelected && !isMyHold) {
                          seatColor += ' ring-2 ring-[#2DD4BF] ring-offset-2 ring-offset-[#0B1220]';
                        }

                        return (
                          <button
                            key={unit.id}
                            onClick={() => handleSelectUnit(unit)}
                            disabled={unit.status === 'CONFIRMED'}
                            className={`h-8 rounded border text-[11px] font-mono flex items-center justify-center transition-all ${seatColor}`}
                            title={`${unit.unitCode} (${unit.tier}) - $${unit.price} [${unit.status}]`}
                          >
                            {unit.seatNumber}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>

          </div>

          {/* Selected ticket details */}
          <div className="lg:col-span-4 bg-[#111C2E] border border-[#293548] rounded-2xl p-6 space-y-6 shadow-xl sticky top-24">
            
            <div className="flex items-center justify-between pb-4 border-b border-[#293548]">
              <h2 className="text-base font-bold text-[#F8FAFC]">Your selection</h2>
              {selectedUnit && (
                <span className="font-mono text-xs px-2.5 py-1 bg-[#0B1220] border border-[#293548] rounded text-[#2DD4BF]">
                  {selectedUnit.unitCode}
                </span>
              )}
            </div>

            {feedback && (
              <div
                className={`p-3 rounded-lg text-xs flex items-center gap-2 border ${
                  feedback.type === 'success'
                    ? 'bg-[#10B981]/10 border-[#10B981]/30 text-[#10B981]'
                    : feedback.type === 'error'
                    ? 'bg-[#EF4444]/10 border-[#EF4444]/30 text-[#EF4444]'
                    : 'bg-[#60A5FA]/10 border-[#60A5FA]/30 text-[#60A5FA]'
                }`}
              >
                {feedback.type === 'success' && <CheckCircle2 className="w-4 h-4 shrink-0" />}
                {feedback.type === 'error' && <AlertCircle className="w-4 h-4 shrink-0" />}
                {feedback.type === 'info' && <Clock className="w-4 h-4 shrink-0" />}
                <span>{feedback.message}</span>
              </div>
            )}

            {selectedUnit ? (
              <div className="space-y-5">
                
                <div className="space-y-3 bg-[#0B1220] border border-[#293548] rounded-xl p-4">
                  <div className="flex justify-between text-xs text-[#A8B3C7]">
                    <span>Ticket type</span>
                    <span className="text-[#F8FAFC] font-semibold">{selectedUnit.tier}</span>
                  </div>
                  <div className="flex justify-between text-xs text-[#A8B3C7]">
                    <span>Location</span>
                    <span className="text-[#F8FAFC]">Row {selectedUnit.rowLabel}, Seat {selectedUnit.seatNumber}</span>
                  </div>
                  <div className="flex justify-between text-xs text-[#A8B3C7]">
                    <span>Ticket price</span>
                    <span className="text-[#2DD4BF] font-mono font-bold text-sm">${selectedUnit.price.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-xs text-[#A8B3C7] pt-2 border-t border-[#293548]">
                    <span>Availability</span>
                    <span
                      className={`font-semibold font-mono ${
                        selectedUnit.status === 'AVAILABLE'
                          ? 'text-[#10B981]'
                          : selectedUnit.status === 'CONFIRMED'
                          ? 'text-[#60A5FA]'
                          : 'text-[#F59E0B]'
                      }`}
                    >
                      {selectedUnit.isMine ? 'Held for you' : selectedUnit.status === 'AVAILABLE' ? 'Available' : selectedUnit.status === 'CONFIRMED' ? 'Sold out' : 'Temporarily unavailable'}
                    </span>
                  </div>
                </div>

                {/* Hold Expiry Countdown if held by current user */}
                {selectedUnit.isMine && holdExpiresAt && (
                  <div className="p-3 bg-[#111C2E] border border-[#2DD4BF]/40 rounded-xl space-y-2">
                    <div className="text-[11px] text-[#A8B3C7] flex items-center justify-between">
                      <span>Your ticket is held for</span>
                      <CountdownTimer
                        expiresAt={holdExpiresAt}
                        serverTimeOffset={serverTimeOffset}
                        onExpire={() => {
                          setFeedback({
                            type: 'error',
                            message: 'Your reservation hold has expired. Please select a seat again.'
                          });
                          fetchInventory(false);
                        }}
                      />
                    </div>
                  </div>
                )}

                {/* Primary Action Buttons */}
                <div className="space-y-2.5 pt-2">
                  {selectedUnit.status === 'AVAILABLE' && (
                    <button
                      onClick={handleCreateHold}
                      disabled={actionLoading}
                      className="w-full py-3 px-4 rounded-lg text-xs font-semibold text-[#0B1220] bg-[#2DD4BF] hover:bg-[#2DD4BF]/90 disabled:opacity-50 transition-colors shadow-sm flex items-center justify-center gap-2"
                    >
                      {actionLoading ? 'Saving your seat…' : 'Reserve this seat'}
                    </button>
                  )}

                  {selectedUnit.isMine && (
                    <>
                      <button
                        onClick={handleProceedToCheckout}
                        className="w-full py-3 px-4 rounded-lg text-xs font-semibold text-[#0B1220] bg-[#2DD4BF] hover:bg-[#2DD4BF]/90 transition-colors shadow-sm flex items-center justify-center gap-2"
                      >
                        <span>Continue to checkout</span>
                        <ArrowRight className="w-4 h-4" />
                      </button>

                      <button
                        onClick={handleCancelHold}
                        disabled={actionLoading}
                        className="w-full py-2.5 px-4 rounded-lg text-xs font-medium text-[#A8B3C7] hover:text-[#EF4444] border border-[#293548] hover:border-[#EF4444]/40 transition-colors"
                      >
                        Release Hold
                      </button>
                    </>
                  )}

                  {selectedUnit.status === 'HELD' && !selectedUnit.isMine && (
                    <div className="p-3 text-center text-xs text-[#F59E0B] bg-[#F59E0B]/10 border border-[#F59E0B]/30 rounded-lg">
                      Currently held by another attendee. Released automatically if checkout is not completed.
                    </div>
                  )}

                  {selectedUnit.status === 'CONFIRMED' && (
                    <div className="p-3 text-center text-xs text-[#60A5FA] bg-[#60A5FA]/10 border border-[#60A5FA]/30 rounded-lg">
                      This unit has been confirmed and locked.
                    </div>
                  )}
                </div>

              </div>
            ) : (
              <div className="text-center py-8 text-xs text-[#A8B3C7] space-y-2">
                <Layers className="w-8 h-8 text-[#293548] mx-auto" />
                <p>Choose an available seat to see the ticket price and reserve it for a few minutes.</p>
              </div>
            )}

          </div>

        </div>

      </div>
    </div>
  );
};
