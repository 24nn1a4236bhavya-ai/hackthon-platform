import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { Navbar } from './components/Navbar';
import { Footer } from './components/Footer';
import { ProtectedRoute } from './components/ProtectedRoute';

import { HomePage } from './pages/HomePage';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { HackathonsListPage } from './pages/HackathonsListPage';
import { HackathonDetailPage } from './pages/HackathonDetailPage';
import { PublicGalleryPage } from './pages/PublicGalleryPage';
import { JudgeDashboardPage } from './pages/JudgeDashboardPage';
import { ScorecardPage } from './pages/ScorecardPage';
import { AdminDashboardPage } from './pages/AdminDashboardPage';

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <BrowserRouter>
        <div className="min-h-screen flex flex-col bg-slate-950 text-slate-100 font-sans selection:bg-brand-500 selection:text-white">
          <Navbar />
          <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8">
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />
              <Route path="/hackathons" element={<HackathonsListPage />} />
              <Route path="/hackathons/:slug" element={<HackathonDetailPage />} />
              <Route path="/gallery" element={<PublicGalleryPage />} />

              {/* Protected Judge Routes */}
              <Route
                path="/judging"
                element={
                  <ProtectedRoute allowedRoles={['JUDGE', 'ORGANIZER', 'ADMIN']}>
                    <JudgeDashboardPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/scorecard/:hackathonId/:projectId"
                element={
                  <ProtectedRoute allowedRoles={['JUDGE', 'ORGANIZER', 'ADMIN']}>
                    <ScorecardPage />
                  </ProtectedRoute>
                }
              />

              {/* Protected Admin Routes */}
              <Route
                path="/admin"
                element={
                  <ProtectedRoute allowedRoles={['ADMIN']}>
                    <AdminDashboardPage />
                  </ProtectedRoute>
                }
              />

              {/* Fallback */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </main>
          <Footer />
        </div>
      </BrowserRouter>
    </AuthProvider>
  );
};

export default App;
