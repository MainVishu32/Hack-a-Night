import React from 'react';
import { useAuth } from '../context/AuthContext.tsx';
import { ShieldCheck, UserCheck } from 'lucide-react';

interface NavbarProps {
  currentPage: string;
  onNavigate: (page: string) => void;
}

export const Navbar: React.FC<NavbarProps> = ({ currentPage, onNavigate }) => {
  const { user, logout } = useAuth();

  return (
    <header className="sticky top-0 z-50 w-full bg-[#0B1220]/95 backdrop-blur-md border-b border-[#293548]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-8">
        
        {/* Zone 1: Brand Wordmark */}
        <button
          onClick={() => onNavigate('landing')}
          className="text-lg font-bold tracking-tight text-[#F8FAFC] hover:text-[#2DD4BF] transition-colors whitespace-nowrap shrink-0 flex items-center gap-2.5 focus:outline-none"
        >
          <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-[#2DD4BF] to-[#60A5FA] flex items-center justify-center text-[#0B1220] font-black text-sm">
            P
          </div>
          <span>PulseReserve</span>
        </button>

        {/* Zone 2: 4–5 Clean Single-Line Navigation Links */}
        <nav className="hidden md:flex items-center gap-7 text-sm font-medium text-[#A8B3C7]">
          <button
            onClick={() => onNavigate('landing')}
            className={`transition-colors whitespace-nowrap shrink-0 ${
              currentPage === 'landing' ? 'text-[#2DD4BF] font-semibold' : 'hover:text-[#F8FAFC]'
            }`}
          >
            Overview
          </button>
          
          <button
            onClick={() => onNavigate('seats')}
            className={`transition-colors whitespace-nowrap shrink-0 ${
              currentPage === 'seats' ? 'text-[#2DD4BF] font-semibold' : 'hover:text-[#F8FAFC]'
            }`}
          >
            Live Grid
          </button>

          <button
            onClick={() => onNavigate('dashboard')}
            className={`transition-colors whitespace-nowrap shrink-0 ${
              currentPage === 'dashboard' ? 'text-[#2DD4BF] font-semibold' : 'hover:text-[#F8FAFC]'
            }`}
          >
            Engine Metrics
          </button>

          <button
            onClick={() => onNavigate('bookings')}
            className={`transition-colors whitespace-nowrap shrink-0 ${
              currentPage === 'bookings' ? 'text-[#2DD4BF] font-semibold' : 'hover:text-[#F8FAFC]'
            }`}
          >
            History
          </button>

          <button
            onClick={() => onNavigate('admin')}
            className={`transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5 ${
              currentPage === 'admin' ? 'text-[#2DD4BF] font-semibold' : 'hover:text-[#F8FAFC]'
            }`}
          >
            <ShieldCheck className="w-4 h-4 text-[#60A5FA]" />
            <span>Observability</span>
          </button>
        </nav>

        {/* Zone 3: 1 Primary Action */}
        <div className="flex items-center gap-3 shrink-0">
          {user ? (
            <div className="flex items-center gap-3">
              <div className="hidden sm:flex flex-col text-right text-xs">
                <span className="text-[#F8FAFC] font-medium leading-none">{user.name}</span>
                <span className="text-[#A8B3C7] text-[11px] leading-tight font-mono">{user.role.toUpperCase()}</span>
              </div>
              <button
                onClick={() => logout()}
                className="px-3.5 py-1.5 text-xs font-medium text-[#A8B3C7] hover:text-[#EF4444] border border-[#293548] rounded-lg hover:border-[#EF4444]/40 transition-colors whitespace-nowrap shrink-0"
              >
                Sign Out
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <button
                onClick={() => onNavigate('login')}
                className="px-3.5 py-1.5 text-xs font-medium text-[#F8FAFC] hover:text-[#2DD4BF] transition-colors whitespace-nowrap shrink-0"
              >
                Sign In
              </button>
              <button
                onClick={() => onNavigate('register')}
                className="px-4 py-2 text-xs font-semibold text-[#0B1220] bg-[#2DD4BF] hover:bg-[#2DD4BF]/90 rounded-lg transition-colors whitespace-nowrap shrink-0 shadow-sm"
              >
                Create Account
              </button>
            </div>
          )}
        </div>

      </div>
    </header>
  );
};
