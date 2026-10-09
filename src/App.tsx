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
import { DashboardPage } from './pages/DashboardPage.tsx';
import { SeatSelectionPage } from './pages/SeatSelectionPage.tsx';
import { CheckoutPage } from './pages/CheckoutPage.tsx';
import { BookingHistoryPage } from './pages/BookingHistoryPage.tsx';
import { AdminObservabilityPage } from './pages/AdminObservabilityPage.tsx';

function MainApp() {
  const [currentPage, setCurrentPage] = useState<string>('landing');
  const [navParams, setNavParams] = useState<any>({});

  const handleNavigate = (page: string, params: any = {}) => {
    setCurrentPage(page);
    setNavParams(params);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#0B1220] text-[#F8FAFC]">
      <Navbar currentPage={currentPage} onNavigate={handleNavigate} />
      
      <main className="flex-1">
        {currentPage === 'landing' && <LandingPage onNavigate={handleNavigate} />}
        {currentPage === 'login' && <LoginPage onNavigate={handleNavigate} />}
        {currentPage === 'register' && <RegisterPage onNavigate={handleNavigate} />}
        {currentPage === 'dashboard' && <DashboardPage onNavigate={handleNavigate} />}
        {currentPage === 'seats' && <SeatSelectionPage onNavigate={handleNavigate} />}
        {currentPage === 'checkout' && (
          <CheckoutPage
            reservationId={navParams.reservationId}
            onNavigate={handleNavigate}
          />
        )}
        {currentPage === 'bookings' && <BookingHistoryPage onNavigate={handleNavigate} />}
        {currentPage === 'admin' && <AdminObservabilityPage onNavigate={handleNavigate} />}
      </main>

      <Footer />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <MainApp />
    </AuthProvider>
  );
}
