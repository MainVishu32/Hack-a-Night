import React from 'react';
import { useAuth } from '../context/AuthContext.tsx';
import { ShieldCheck } from 'lucide-react';

interface NavbarProps {
  currentPage: string;
  onNavigate: (page: string) => void;
}

export const Navbar: React.FC<NavbarProps> = ({ currentPage, onNavigate }) => {
  const { user, logout } = useAuth();
  const linkClass = (active: boolean) => `transition-colors whitespace-nowrap ${active ? 'text-[#2DD4BF] font-semibold' : 'text-[#A8B3C7] hover:text-[#F8FAFC]'}`;

  return (
    <header className="sticky top-0 z-50 w-full border-b border-[#293548] bg-[#0B1220]/95 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-6 px-4 sm:px-6 lg:px-8">
        <button onClick={() => onNavigate(user?.role === 'admin' ? 'dashboard' : 'landing')} className="flex shrink-0 items-center gap-2.5 whitespace-nowrap text-lg font-bold tracking-tight text-[#F8FAFC] transition-colors hover:text-[#2DD4BF]">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-tr from-[#2DD4BF] to-[#60A5FA] text-sm font-black text-[#0B1220]">P</span>
          <span>PulseReserve</span>
        </button>

        <nav className="hidden items-center gap-5 text-sm font-medium md:flex">
          <button onClick={() => onNavigate('landing')} className={linkClass(currentPage === 'landing')}>Home</button>
          {user?.role === 'admin' && <>
            <button onClick={() => onNavigate('admin')} className={linkClass(currentPage === 'admin' || currentPage === 'dashboard')}><ShieldCheck className="mr-1 inline h-4 w-4" />Operations Dashboard</button>
            <button onClick={() => onNavigate('admin')} className={linkClass(currentPage === 'admin')}>Reports & Controls</button>
            <button onClick={() => onNavigate('bookings')} className={linkClass(currentPage === 'bookings')}>Booking Reports</button>
          </>}
          {user?.role !== 'admin' && <>
            <button onClick={() => onNavigate('events')} className={linkClass(currentPage === 'events' || currentPage === 'seats')}>Browse Shows</button>
            {user && <button onClick={() => onNavigate('bookings')} className={linkClass(currentPage === 'bookings')}>My Bookings</button>}
          </>}
        </nav>

        <div className="flex shrink-0 items-center gap-3">
          {user ? <div className="flex items-center gap-3">
            <div className="hidden flex-col text-right text-xs sm:flex"><span className="leading-none font-medium text-[#F8FAFC]">{user.name}</span><span className="text-[11px] leading-tight font-mono text-[#A8B3C7]">{user.role === 'admin' ? 'ADMINISTRATOR' : 'ATTENDEE'}</span></div>
            <button onClick={() => { void logout().then(() => onNavigate('landing')); }} className="whitespace-nowrap rounded-lg border border-[#293548] px-3.5 py-1.5 text-xs font-medium text-[#A8B3C7] transition-colors hover:border-[#EF4444]/40 hover:text-[#EF4444]">Sign Out</button>
          </div> : <div className="flex items-center gap-2">
            <button onClick={() => onNavigate('login')} className="whitespace-nowrap px-3.5 py-1.5 text-xs font-medium text-[#F8FAFC] transition-colors hover:text-[#2DD4BF]">Sign In</button>
            <button onClick={() => onNavigate('register')} className="whitespace-nowrap rounded-lg bg-[#2DD4BF] px-4 py-2 text-xs font-semibold text-[#0B1220] shadow-sm transition hover:bg-[#2DD4BF]/90">Create Account</button>
          </div>}
        </div>
      </div>
    </header>
  );
};
