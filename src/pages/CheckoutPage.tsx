import React, { useState, useEffect } from 'react';
import {
  CreditCard,
  ShieldCheck,
  Clock,
  AlertTriangle,
  CheckCircle2,
  Lock,
  ArrowLeft,
  Copy,
  Check
} from 'lucide-react';
import { api } from '../services/api.ts';
import { ReservationDetail, Booking } from '../types/index.ts';
import { CountdownTimer } from '../components/CountdownTimer.tsx';

interface CheckoutPageProps {
  reservationId: string;
  onNavigate: (page: string, params?: any) => void;
}

export const CheckoutPage: React.FC<CheckoutPageProps> = ({ reservationId, onNavigate }) => {
  const [data, setData] = useState<ReservationDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [serverTimeOffset, setServerTimeOffset] = useState(0);

  // Simulated Payment Form State
  const [cardName, setCardName] = useState('Alex Mercer');
  const [cardNumber, setCardNumber] = useState('•••• •••• •••• 4242');
  const [cardExpiry, setCardExpiry] = useState('12/28');
  const [cardCvc, setCardCvc] = useState('888');

  // Confirmation submission state
  const [submitting, setSubmitting] = useState(false);
  const [confirmedBooking, setConfirmedBooking] = useState<Booking | null>(null);
  const [isExpired, setIsExpired] = useState(false);
  const [copiedRef, setCopiedRef] = useState(false);

  // Idempotency key generated once per checkout session
  const [idempotencyKey] = useState<string>(() => `idemp_${reservationId}_${Date.now()}`);

  const loadReservation = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.getReservation(reservationId);
      setData(res);

      const localNow = Date.now();
      setServerTimeOffset(res.serverTime - localNow);

      if (res.reservation.status === 'CONFIRMED') {
        const bookings = await api.getBookings();
        const b = bookings.bookings.find(item => item.reservation_id === reservationId);
        if (b) setConfirmedBooking(b);
      } else if (res.reservation.status === 'EXPIRED') {
        setIsExpired(true);
      }
    } catch (err: any) {
      setError(err.message || 'Unable to load reservation');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReservation();
  }, [reservationId]);

  const handleConfirmBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting || isExpired) return;

    try {
      setSubmitting(true);
      setError(null);

      const result = await api.confirmReservation(
        reservationId,
        idempotencyKey,
        'sim_card_token_4242'
      );

      setConfirmedBooking(result.booking);
    } catch (err: any) {
      setError(err.message || 'Booking confirmation failed.');
      if (err.message && err.message.toLowerCase().includes('expired')) {
        setIsExpired(true);
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancel = async () => {
    try {
      await api.cancelReservation(reservationId);
      onNavigate('seats');
    } catch (err: any) {
      setError(err.message || 'Unable to cancel reservation');
    }
  };

  const copyBookingReference = () => {
    if (confirmedBooking) {
      navigator.clipboard.writeText(confirmedBooking.booking_reference);
      setCopiedRef(true);
      setTimeout(() => setCopiedRef(false), 2000);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center bg-[#0B1220]">
        <div className="text-sm text-[#A8B3C7] font-mono">Verifying server reservation hold...</div>
      </div>
    );
  }

  // --- CONFIRMED BOOKING SUCCESS VIEW ---
  if (confirmedBooking) {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center px-4 py-12 bg-[#0B1220]">
        <div className="w-full max-w-lg bg-[#111C2E] border border-[#293548] rounded-2xl p-8 shadow-2xl space-y-6 text-center">
          
          <div className="w-14 h-14 bg-[#10B981]/10 border border-[#10B981]/30 text-[#10B981] rounded-2xl flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-8 h-8" />
          </div>

          <div className="space-y-1">
            <h1 className="text-2xl font-bold tracking-tight text-[#F8FAFC]">Booking Confirmed!</h1>
            <p className="text-xs text-[#A8B3C7]">
              Your place is saved. We can’t wait to see you there.
            </p>
          </div>

          <div className="p-4 bg-[#0B1220] border border-[#293548] rounded-xl space-y-3 text-left">
            <div className="flex justify-between items-center text-xs">
              <span className="text-[#A8B3C7]">Reference Code</span>
              <div className="flex items-center gap-2">
                <span className="font-mono font-bold text-[#2DD4BF] text-sm">
                  {confirmedBooking.booking_reference}
                </span>
                <button
                  onClick={copyBookingReference}
                  className="p-1 hover:text-[#2DD4BF] text-[#A8B3C7] transition-colors"
                  title="Copy reference code"
                >
                  {copiedRef ? <Check className="w-3.5 h-3.5 text-[#10B981]" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>

            <div className="flex justify-between text-xs text-[#A8B3C7]">
              <span>Event</span>
              <span className="text-[#F8FAFC] font-medium">{data?.event?.title}</span>
            </div>

            <div className="flex justify-between text-xs text-[#A8B3C7]">
              <span>Reserved Unit</span>
              <span className="text-[#F8FAFC] font-mono font-semibold">{data?.unit?.unit_code} ({data?.unit?.tier})</span>
            </div>

            <div className="flex justify-between text-xs text-[#A8B3C7]">
              <span>Amount Persisted</span>
              <span className="text-[#10B981] font-mono font-bold">${confirmedBooking.amount.toFixed(2)}</span>
            </div>

            <div className="flex justify-between text-xs text-[#A8B3C7] pt-2 border-t border-[#293548]">
              <span>Confirmed At</span>
              <span className="font-mono text-[11px]">{new Date(confirmedBooking.created_at).toLocaleString()}</span>
            </div>
          </div>

          <div className="flex items-center gap-3 pt-2">
            <button
              onClick={() => onNavigate('bookings')}
              className="flex-1 py-3 px-4 rounded-lg text-xs font-semibold text-[#0B1220] bg-[#2DD4BF] hover:bg-[#2DD4BF]/90 transition-colors shadow-sm"
            >
              View in Booking History
            </button>
            <button
              onClick={() => onNavigate('seats')}
              className="py-3 px-4 rounded-lg text-xs font-medium text-[#F8FAFC] bg-[#0B1220] border border-[#293548] hover:bg-[#17243B] transition-colors"
            >
              Explore More Seats
            </button>
          </div>

        </div>
      </div>
    );
  }

  // --- ACTIVE CHECKOUT VIEW ---
  return (
    <div className="min-h-[calc(100vh-4rem)] px-4 py-10 bg-[#0B1220] text-[#F8FAFC]">
      <div className="max-w-4xl mx-auto space-y-6">
        
        {/* Navigation Breadcrumb */}
        <button
          onClick={() => onNavigate('seats')}
          className="text-xs text-[#A8B3C7] hover:text-[#2DD4BF] flex items-center gap-1.5 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to seat selection</span>
        </button>

        {/* Expiry Banner or Warning */}
        {isExpired && (
          <div className="p-4 bg-[#EF4444]/10 border border-[#EF4444]/40 rounded-xl text-xs text-[#EF4444] flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 shrink-0" />
              <span>Your reservation hold has expired. The inventory has been returned to the available pool.</span>
            </div>
            <button
              onClick={() => onNavigate('seats')}
              className="px-3 py-1.5 bg-[#EF4444] text-white rounded-lg text-xs font-semibold whitespace-nowrap shrink-0"
            >
              Select New Seat
            </button>
          </div>
        )}

        {error && !isExpired && (
          <div className="p-4 bg-[#EF4444]/10 border border-[#EF4444]/40 rounded-xl text-xs text-[#EF4444] flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
          
          {/* Left Column: Reservation Summary */}
          <div className="md:col-span-5 bg-[#111C2E] border border-[#293548] rounded-2xl p-6 space-y-6 shadow-xl">
            
            <div className="flex items-center justify-between pb-4 border-b border-[#293548]">
              <div>
                <h1 className="text-lg font-bold text-[#F8FAFC]">Order Summary</h1>
                <p className="text-xs text-[#A8B3C7]">Temporary hold active</p>
              </div>

              {data?.reservation && !isExpired && (
                <CountdownTimer
                  expiresAt={data.reservation.expires_at}
                  serverTimeOffset={serverTimeOffset}
                  onExpire={() => setIsExpired(true)}
                />
              )}
            </div>

            <div className="space-y-3.5 text-xs text-[#A8B3C7]">
              <div>
                <div className="text-[11px] font-semibold text-[#2DD4BF]">YOUR EVENT</div>
                <div className="text-[#F8FAFC] font-semibold text-sm mt-0.5">{data?.event?.title}</div>
                <div className="text-[11px] text-[#A8B3C7]/80">{data?.event?.venue}</div>
              </div>

              <div className="pt-3 border-t border-[#293548] flex justify-between">
                <span>Your seat</span>
                <span className="font-mono font-bold text-[#F8FAFC]">{data?.unit?.unit_code}</span>
              </div>

              <div className="flex justify-between">
                <span>Ticket type</span>
                <span className="text-[#F8FAFC] font-medium">{data?.unit?.tier}</span>
              </div>

              <div className="flex justify-between">
                <span>Reserved at</span>
                <span className="font-mono text-[11px]">{new Date(data?.reservation?.created_at || '').toLocaleTimeString()}</span>
              </div>

              <div className="flex justify-between">
                <span>Ticket status</span>
                <span className="font-medium text-[#60A5FA]">Held for you</span>
              </div>

              <div className="pt-3 border-t border-[#293548] flex justify-between text-sm">
                <span className="font-medium text-[#F8FAFC]">Total Due</span>
                <span className="font-mono font-bold text-[#2DD4BF] text-base">
                  ${data?.unit?.price.toFixed(2)}
                </span>
              </div>
            </div>

            <div className="pt-2">
              <button
                type="button"
                onClick={handleCancel}
                disabled={submitting}
                className="w-full py-2.5 px-3 text-xs text-[#A8B3C7] hover:text-[#EF4444] border border-[#293548] hover:border-[#EF4444]/40 rounded-lg transition-colors"
              >
                Cancel Reservation Hold
              </button>
            </div>

          </div>

          {/* Right Column: Simulated Payment Form */}
          <div className="md:col-span-7 bg-[#111C2E] border border-[#293548] rounded-2xl p-6 sm:p-8 space-y-6 shadow-xl">
            
            <div className="flex items-center justify-between pb-4 border-b border-[#293548]">
              <div>
                <h2 className="text-lg font-bold text-[#F8FAFC]">Finish your booking</h2>
                <p className="text-xs text-[#A8B3C7]">
                  Demo checkout · no real payment will be taken.
                </p>
              </div>
              <div className="w-8 h-8 rounded-lg bg-[#0B1220] border border-[#293548] flex items-center justify-center text-[#2DD4BF]">
                <Lock className="w-4 h-4" />
              </div>
            </div>

            <form onSubmit={handleConfirmBooking} className="space-y-4">
              
              <div>
                <label className="block text-xs font-medium text-[#A8B3C7] mb-1">Cardholder Name</label>
                <input
                  type="text"
                  required
                  value={cardName}
                  onChange={e => setCardName(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-[#0B1220] border border-[#293548] rounded-lg text-sm text-[#F8FAFC] focus:outline-none focus:border-[#2DD4BF]"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[#A8B3C7] mb-1">Simulated Card Number</label>
                <div className="relative">
                  <CreditCard className="w-4 h-4 text-[#A8B3C7] absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    value={cardNumber}
                    onChange={e => setCardNumber(e.target.value)}
                    className="w-full pl-9 pr-3.5 py-2.5 bg-[#0B1220] border border-[#293548] rounded-lg text-sm font-mono text-[#F8FAFC] focus:outline-none focus:border-[#2DD4BF]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-[#A8B3C7] mb-1">Expiration</label>
                  <input
                    type="text"
                    required
                    value={cardExpiry}
                    onChange={e => setCardExpiry(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-[#0B1220] border border-[#293548] rounded-lg text-sm font-mono text-[#F8FAFC] focus:outline-none focus:border-[#2DD4BF]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#A8B3C7] mb-1">CVC Code</label>
                  <input
                    type="text"
                    required
                    value={cardCvc}
                    onChange={e => setCardCvc(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-[#0B1220] border border-[#293548] rounded-lg text-sm font-mono text-[#F8FAFC] focus:outline-none focus:border-[#2DD4BF]"
                  />
                </div>
              </div>

              <div className="rounded-lg border border-[#293548] bg-[#0B1220] p-3 text-xs text-[#A8B3C7]">
                Your seat is held just for you while you complete this demo checkout.
              </div>

              <button
                type="submit"
                disabled={submitting || isExpired}
                className="w-full py-3.5 px-4 rounded-lg text-xs font-semibold text-[#0B1220] bg-[#2DD4BF] hover:bg-[#2DD4BF]/90 disabled:opacity-50 transition-colors shadow-sm flex items-center justify-center gap-2"
              >
                <ShieldCheck className="w-4 h-4" />
                <span>{submitting ? 'Confirming your tickets…' : `Confirm booking · $${data?.unit?.price.toFixed(2)}`}</span>
              </button>

            </form>

          </div>

        </div>

      </div>
    </div>
  );
};
