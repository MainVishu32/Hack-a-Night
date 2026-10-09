/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext.tsx';
import { Navbar } from './components/Navbar.tsx';
import { Footer } from './components/Footer.tsx';
import { LandingPage } from './pages/LandingPage.tsx';
import { LoginPage } from './pages/LoginPage.tsx';
import { RegisterPage } from './pages/RegisterPage.tsx';
import { EventsPage } from './pages/EventsPage.tsx';
import { SeatSelectionPage } from './pages/SeatSelectionPage.tsx';
import { CheckoutPage } from './pages/CheckoutPage.tsx';
import { BookingHistoryPage } from './pages/BookingHistoryPage.tsx';
import { AdminObservabilityPage } from './pages/AdminObservabilityPage.tsx';

function MainApp() {
  const [currentPage, setCurrentPage] = useState<string>('landing');
  const [navParams, setNavParams] = useState<any>({});
  const { user, loading } = useAuth();

  const handleNavigate = (requestedPage: string, params: any = {}) => {
    let page = requestedPage;
    // Admin screens enforce their own role guard; API endpoints also enforce admin authorization.
    // Avoid blocking the immediate post-login redirect before React finishes updating auth state.
    if (user?.role === 'admin' && page === 'checkout') page = 'admin';
    setCurrentPage(page);
    setNavParams(params);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-[#0B1220] text-[#A8B3C7]">Getting Spotly ready…</div>;
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#0B1220] text-[#F8FAFC]">
      <Navbar currentPage={currentPage} onNavigate={handleNavigate} />
      <main className="flex-1">
        {currentPage === 'landing' && <LandingPage onNavigate={handleNavigate} />}
        {currentPage === 'login' && <LoginPage onNavigate={handleNavigate} />}
        {currentPage === 'register' && <RegisterPage onNavigate={handleNavigate} />}
        {currentPage === 'events' && <EventsPage onNavigate={handleNavigate} initialQuery={navParams.query} initialCategory={navParams.category} />}
        {currentPage === 'dashboard' && <AdminObservabilityPage onNavigate={handleNavigate} />}
        {currentPage === 'admin' && <AdminObservabilityPage onNavigate={handleNavigate} />}
        {currentPage === 'seats' && <SeatSelectionPage eventId={navParams.eventId} onNavigate={handleNavigate} />}
        {currentPage === 'checkout' && <CheckoutPage reservationId={navParams.reservationId} onNavigate={handleNavigate} />}
        {currentPage === 'bookings' && <BookingHistoryPage onNavigate={handleNavigate} />}
      </main>
      <Footer />
    </div>
  );
}

export default function App() {
  return <AuthProvider><MainApp /></AuthProvider>;
}
