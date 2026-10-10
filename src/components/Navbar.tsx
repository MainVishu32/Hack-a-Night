import React, { useState } from 'react';
import { Menu, ShieldCheck, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext.tsx';

interface NavbarProps {
  currentPage: string;
  onNavigate: (page: string) => void;
}

export const Navbar: React.FC<NavbarProps> = ({ currentPage, onNavigate }) => {
  const { user, logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const go = (page: string) => {
    setMenuOpen(false);
    onNavigate(page);
  };
  const linkClass = (active: boolean) => `flash-nav-link${active ? ' is-active' : ''}`;

  return (
    <header className="flash-header">
      <div className="flash-nav-shell">
        <button onClick={() => go(user?.role === 'admin' ? 'dashboard' : 'landing')} className="flash-brand" aria-label="Spotly home">
          <img src="/spotly-logo.png" alt="Spotly" />
        </button>

        <nav className="flash-desktop-nav" aria-label="Main navigation">
          <button onClick={() => go('landing')} className={linkClass(currentPage === 'landing')}>Home</button>
          {user?.role === 'admin' ? (
            <>
              <button onClick={() => go('admin')} className={linkClass(currentPage === 'admin' || currentPage === 'dashboard')}><ShieldCheck size={15} />Operations</button>
              <button onClick={() => go('bookings')} className={linkClass(currentPage === 'bookings')}>Booking reports</button>
            </>
          ) : (
            <>
              <button onClick={() => go('events')} className={linkClass(currentPage === 'events' || currentPage === 'seats')}>Explore events</button>
              {user && <button onClick={() => go('bookings')} className={linkClass(currentPage === 'bookings')}>My tickets</button>}
            </>
          )}
        </nav>

        <div className="flash-nav-actions">
          {user ? (
            <>
              <span className="flash-user-name">{user.name}</span>
              <button onClick={() => { void logout().then(() => go('landing')); }} className="flash-outline-button">Sign out</button>
            </>
          ) : (
            <>
              <button onClick={() => go('login')} className="flash-signin">Sign in</button>
              <button onClick={() => go('register')} className="flash-account-button">Join for free</button>
            </>
          )}
        </div>
        <button className="flash-menu-toggle" onClick={() => setMenuOpen(!menuOpen)} aria-label={menuOpen ? 'Close menu' : 'Open menu'} aria-expanded={menuOpen}>
          {menuOpen ? <X size={21} /> : <Menu size={21} />}
        </button>
      </div>
      {menuOpen && (
        <nav className="flash-mobile-nav" aria-label="Mobile navigation">
          <button onClick={() => go('landing')}>Home</button>
          {user?.role === 'admin' ? (
            <><button onClick={() => go('admin')}>Operations dashboard</button><button onClick={() => go('bookings')}>Booking reports</button></>
          ) : (
            <><button onClick={() => go('events')}>Explore events</button>{user && <button onClick={() => go('bookings')}>My tickets</button>}</>
          )}
          {!user && <><button onClick={() => go('login')}>Sign in</button><button onClick={() => go('register')}>Join for free</button></>}
        </nav>
      )}
    </header>
  );
};
