import React, { useState, useEffect } from 'react';
import {
  Ticket,
  Search,
  CheckCircle2,
  Calendar,
  MapPin,
  RefreshCw,
  QrCode,
  X,
  ArrowRight
} from 'lucide-react';
import { api } from '../services/api.ts';
import { Booking } from '../types/index.ts';
import { useAuth } from '../context/AuthContext.tsx';

interface BookingHistoryPageProps {
  onNavigate: (page: string, params?: any) => void;
}

export const BookingHistoryPage: React.FC<BookingHistoryPageProps> = ({ onNavigate }) => {
  const { user } = useAuth();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTicket, setSelectedTicket] = useState<Booking | null>(null);

  const loadBookings = async () => {
    try {
      setLoading(true);
      const res = await api.getBookings();
      setBookings(res.bookings);
    } catch (err) {
      console.error('Failed to load bookings:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBookings();
  }, []);

  const filtered = bookings.filter(b => {
    const q = searchQuery.toLowerCase();
    return (
      b.booking_reference.toLowerCase().includes(q) ||
      (b.unitCode && b.unitCode.toLowerCase().includes(q)) ||
      (b.eventTitle && b.eventTitle.toLowerCase().includes(q))
    );
  });

  return (
    <div className="min-h-screen bg-[#0B1220] py-8 text-[#F8FAFC]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-[#293548]">
          <div>
            <div className="text-xs uppercase tracking-wider text-[#2DD4BF] font-semibold font-mono">
              PostgreSQL Verified Records
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#F8FAFC]">
              {user?.role === 'admin' ? 'Booking Reports' : 'My Booking History'}
            </h1>
            <p className="text-xs text-[#A8B3C7] mt-1">
              {user?.role === 'admin'
                ? 'Observability view: Showing all bookings across participants.'
                : 'Showing confirmed reservations issued to your authenticated account.'}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="w-4 h-4 text-[#A8B3C7] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search reference or seat..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="pl-9 pr-3 py-1.5 bg-[#111C2E] border border-[#293548] rounded-lg text-xs text-[#F8FAFC] placeholder-[#A8B3C7]/40 focus:outline-none focus:border-[#2DD4BF]"
              />
            </div>

            <button
              onClick={loadBookings}
              className="p-2 bg-[#111C2E] hover:bg-[#17243B] border border-[#293548] rounded-lg text-[#A8B3C7] hover:text-[#F8FAFC] transition-colors"
              title="Refresh bookings"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Content Table or Cards */}
        {loading ? (
          <div className="py-20 text-center text-sm text-[#A8B3C7]">
            <RefreshCw className="w-5 h-5 animate-spin text-[#2DD4BF] mx-auto mb-2" />
            <span>Retrieving confirmed booking records...</span>
          </div>
        ) : filtered.length === 0 ? (
          <div className="bg-[#111C2E] border border-[#293548] rounded-2xl p-12 text-center space-y-4 max-w-lg mx-auto">
            <Ticket className="w-10 h-10 text-[#293548] mx-auto" />
            <div>
              <h2 className="text-base font-bold text-[#F8FAFC]">No Confirmed Bookings Found</h2>
              <p className="text-xs text-[#A8B3C7] mt-1">
                You haven't completed any reservations yet. Select an available unit on the 200-seat arena grid to get started.
              </p>
            </div>
            <button
              onClick={() => onNavigate('seats')}
              className="px-4 py-2.5 rounded-lg text-xs font-semibold text-[#0B1220] bg-[#2DD4BF] hover:bg-[#2DD4BF]/90 transition-colors shadow-sm inline-flex items-center gap-1.5"
            >
              <span>Explore Live Seat Grid</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        ) : (
          <div className="bg-[#111C2E] border border-[#293548] rounded-2xl overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#0B1220] border-b border-[#293548] text-[#A8B3C7] font-mono uppercase text-[11px]">
                  <tr>
                    <th className="py-3.5 px-4 font-semibold">Reference</th>
                    <th className="py-3.5 px-4 font-semibold">Event</th>
                    <th className="py-3.5 px-4 font-semibold">Seat Unit</th>
                    <th className="py-3.5 px-4 font-semibold">Tier</th>
                    <th className="py-3.5 px-4 font-semibold text-right">Amount</th>
                    <th className="py-3.5 px-4 font-semibold">Confirmed At</th>
                    <th className="py-3.5 px-4 font-semibold text-center">Status</th>
                    <th className="py-3.5 px-4 font-semibold text-right">Ticket</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#293548]/60 font-sans">
                  {filtered.map(b => (
                    <tr key={b.id} className="hover:bg-[#17243B]/50 transition-colors">
                      <td className="py-3.5 px-4 font-mono font-bold text-[#2DD4BF]">
                        {b.booking_reference}
                      </td>
                      <td className="py-3.5 px-4 text-[#F8FAFC] font-medium max-w-xs truncate">
                        {b.eventTitle || 'Global Tech Summit 2026 Keynote'}
                      </td>
                      <td className="py-3.5 px-4 font-mono font-semibold text-[#F8FAFC]">
                        {b.unitCode}
                      </td>
                      <td className="py-3.5 px-4 text-[#A8B3C7]">
                        {b.tier}
                      </td>
                      <td className="py-3.5 px-4 font-mono font-semibold text-right text-[#10B981]">
                        ${b.amount.toFixed(2)}
                      </td>
                      <td className="py-3.5 px-4 font-mono text-[11px] text-[#A8B3C7]">
                        {new Date(b.created_at).toLocaleString()}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <span className="inline-flex items-center gap-1 text-[11px] font-mono text-[#10B981]">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>CONFIRMED</span>
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <button
                          onClick={() => setSelectedTicket(b)}
                          className="px-2.5 py-1 text-[11px] font-medium text-[#2DD4BF] hover:text-[#0B1220] hover:bg-[#2DD4BF] border border-[#2DD4BF]/40 rounded transition-colors"
                        >
                          View Pass
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Ticket Modal */}
        {selectedTicket && (
          <div className="fixed inset-0 z-50 bg-[#0B1220]/80 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-[#111C2E] border border-[#293548] rounded-2xl p-6 sm:p-8 max-w-md w-full shadow-2xl relative space-y-6">
              
              <button
                onClick={() => setSelectedTicket(null)}
                className="absolute top-4 right-4 text-[#A8B3C7] hover:text-[#F8FAFC] p-1"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="border-b border-[#293548] pb-4">
                <div className="text-[11px] font-mono text-[#2DD4BF]">ADMISSION PASS</div>
                <h3 className="text-xl font-bold text-[#F8FAFC] mt-1">{selectedTicket.eventTitle}</h3>
                <div className="text-xs text-[#A8B3C7] flex items-center gap-1.5 mt-1">
                  <MapPin className="w-3.5 h-3.5 text-[#60A5FA]" />
                  <span>{selectedTicket.venue || 'Metropolis Convention Arena · Grand Hall A'}</span>
                </div>
              </div>

              <div className="bg-[#0B1220] border border-[#293548] rounded-xl p-4 grid grid-cols-2 gap-4 text-xs">
                <div>
                  <span className="text-[#A8B3C7]">Seat Unit</span>
                  <div className="text-lg font-mono font-bold text-[#2DD4BF] mt-0.5">{selectedTicket.unitCode}</div>
                </div>
                <div>
                  <span className="text-[#A8B3C7]">Tier</span>
                  <div className="text-base font-medium text-[#F8FAFC] mt-0.5">{selectedTicket.tier}</div>
                </div>
                <div>
                  <span className="text-[#A8B3C7]">Pass Reference</span>
                  <div className="font-mono text-[11px] text-[#F8FAFC] mt-0.5">{selectedTicket.booking_reference}</div>
                </div>
                <div>
                  <span className="text-[#A8B3C7]">Amount Paid</span>
                  <div className="font-mono text-sm font-semibold text-[#10B981] mt-0.5">${selectedTicket.amount.toFixed(2)}</div>
                </div>
              </div>

              {/* Digital Check-in QR Simulation */}
              <div className="p-4 bg-[#0B1220] border border-[#293548] rounded-xl flex items-center justify-between gap-4">
                <div className="text-left text-xs">
                  <span className="font-mono text-[#10B981] text-[11px] block">VERIFIED IN POSTGRESQL</span>
                  <span className="text-[#A8B3C7] text-[11px]">Present at gate for high-speed barcode validation.</span>
                </div>
                <div className="w-14 h-14 bg-[#111C2E] border border-[#293548] rounded-lg flex items-center justify-center text-[#2DD4BF] shrink-0">
                  <QrCode className="w-10 h-10" />
                </div>
              </div>

              <button
                onClick={() => setSelectedTicket(null)}
                className="w-full py-2.5 text-xs font-semibold text-[#0B1220] bg-[#2DD4BF] hover:bg-[#2DD4BF]/90 rounded-lg transition-colors"
              >
                Done
              </button>

            </div>
          </div>
        )}

      </div>
    </div>
  );
};
