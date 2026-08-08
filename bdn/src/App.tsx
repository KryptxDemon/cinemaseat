import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import { Film, Server } from 'lucide-react';
import { Navbar } from './components/Navbar';
import { AuthProvider, ProtectedRoute } from './auth';
import { MoviesPage } from './pages/MoviesPage';
import { MovieDetailsPage } from './pages/MovieDetailsPage';
import { ShowtimesPage } from './pages/ShowtimesPage';
import { SeatsPage } from './pages/SeatsPage';
import { PaymentPage } from './pages/PaymentPage';
import { BookingPage } from './pages/BookingPage';
import { NotFoundPage } from './pages/NotFoundPage';

export default function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="min-h-screen bg-[#141414] text-white flex flex-col font-sans selection:bg-red-600 selection:text-white">
          {/* Global Navigation Header */}
          <Navbar />

          {/* Main Responsive Content Frame */}
          <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 pt-6">
            <Routes>
              {/* Public Routes */}
              <Route path="/" element={<MoviesPage />} />
              <Route path="/movies" element={<MoviesPage />} />
              <Route path="/movies/:movieId" element={<MovieDetailsPage />} />
              <Route path="/showtimes" element={<ShowtimesPage />} />
              <Route path="/shows/:showId/seats" element={<SeatsPage />} />

              {/* Protected Routes */}
              <Route
                path="/payment/:bookingId"
                element={
                  <ProtectedRoute>
                    <PaymentPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/booking/:bookingId"
                element={
                  <ProtectedRoute>
                    <BookingPage />
                  </ProtectedRoute>
                }
              />

              <Route path="*" element={<NotFoundPage />} />
            </Routes>
          </main>

        {/* Shared Netflix Dark Footer */}
        <footer className="border-t border-neutral-800 bg-neutral-950 py-8 text-xs text-neutral-400 mt-auto">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded bg-[#E50914] flex items-center justify-center text-white text-xs font-bold shadow-md shadow-red-950/50">
                <Film className="w-3.5 h-3.5 fill-white" />
              </div>
              <span className="font-extrabold text-white tracking-tight">CINEMA<span className="text-[#E50914]">SEAT</span></span>
              <span className="text-neutral-700">•</span>
              <span className="font-mono text-[11px] text-neutral-400">Official Ticketing Platform</span>
            </div>

            <div className="flex items-center gap-6 text-neutral-300">
              <Link to="/movies" className="hover:text-white transition-colors">
                Movies
              </Link>
              <Link to="/showtimes" className="hover:text-white transition-colors">
                Showtimes
              </Link>
            </div>

            <div className="text-[11px] text-neutral-500">
              © {new Date().getFullYear()} CinemaSeat. All rights reserved.
            </div>
          </div>
        </footer>
      </div>
    </Router>
  </AuthProvider>
  );
}
