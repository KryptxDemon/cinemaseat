import React from 'react';
import { useParams, Link } from 'react-router-dom';
import { Check, Film, ArrowLeft, QrCode, Ticket, Copy, CheckCircle2, AlertCircle } from 'lucide-react';
import { useAsync } from '../hooks/useAsync';
import { fetchBookingById } from '../api/bookings';
import { BookingDetails } from '../types/booking';
import { LoadingState } from '../components/LoadingState';
import { ErrorState } from '../components/ErrorState';
import { Button } from '../components/Button';
import { Badge } from '../components/Badge';
import { Card, CardContent } from '../components/Card';
import { formatCurrency } from '../utils/formatters';

export const BookingPage: React.FC = () => {
  const { bookingId } = useParams<{ bookingId: string }>();
  const [copied, setCopied] = React.useState(false);

  // Fetch booking details using GET /bookings/{booking_id} API helper
  const {
    data: booking,
    loading,
    error,
    refetch,
  } = useAsync<BookingDetails | null>(
    () => (bookingId ? fetchBookingById(bookingId) : Promise.reject('No booking ID')),
    [bookingId]
  );

  const handleCopyRef = () => {
    if (!booking) return;
    navigator.clipboard.writeText(booking.bookingId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // 1. Loading state
  if (loading) {
    return (
      <div className="py-20 flex justify-center items-center">
        <LoadingState
          message="Fetching booking confirmation..."
          subtitle="Communicating with GET /bookings/{booking_id}"
        />
      </div>
    );
  }

  // 2. Booking not found / Error state
  if (error || !booking) {
    return (
      <div className="py-16 max-w-lg mx-auto">
        <ErrorState
          title="Booking Not Found"
          message={
            typeof error === 'string'
              ? error
              : (error as { message?: string })?.message ||
                `The booking reference '${bookingId}' could not be found.`
          }
          code={404}
          actionLabel="Back to Movies"
          onRetry={refetch}
        />
        <div className="mt-6 text-center">
          <Link to="/movies">
            <Button variant="outline" size="sm" icon={<ArrowLeft className="w-4 h-4" />}>
              Back to Movies
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  const amountBDT = booking.totalAmountBDT || Math.round(booking.totalAmountUSD * 110);

  // 3. Normal confirmation state
  return (
    <div className="py-8 sm:py-12 max-w-xl mx-auto px-4 space-y-6 animate-fade-in">
      {/* Centered Confirmation Card */}
      <Card className="bg-neutral-900 border-neutral-800 shadow-2xl rounded-2xl overflow-hidden">
        {/* Top Header with Checkmark Icon */}
        <div className="p-8 text-center bg-gradient-to-b from-emerald-950/40 to-neutral-900 border-b border-neutral-800/80 space-y-3">
          {/* ✓ Check Icon Circle */}
          <div className="w-16 h-16 mx-auto rounded-full bg-emerald-500/10 border-2 border-emerald-500 flex items-center justify-center text-emerald-400 shadow-xl shadow-emerald-950/80">
            <Check className="w-9 h-9 stroke-[3]" />
          </div>

          <div className="space-y-1">
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              Booking Confirmed
            </h1>
            <p className="text-sm font-mono text-emerald-400 font-semibold">
              Your seat is reserved.
            </p>
          </div>
        </div>

        <CardContent className="p-6 sm:p-8 space-y-6">
          {/* Visually Prominent Booking Reference Box */}
          <div className="p-4 rounded-xl bg-neutral-950 border border-neutral-800 text-center space-y-1 relative group">
            <span className="text-[10px] font-mono uppercase tracking-widest text-neutral-500 block">
              BOOKING REFERENCE
            </span>
            <div className="flex items-center justify-center gap-2">
              <span className="text-2xl font-black font-mono text-white tracking-wider">
                {booking.bookingId}
              </span>
              <button
                type="button"
                onClick={handleCopyRef}
                className="p-1.5 rounded-md hover:bg-neutral-800 text-neutral-400 hover:text-white transition-colors"
                title="Copy Reference"
              >
                {copied ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
              </button>
            </div>
            {copied && (
              <span className="text-[10px] font-mono text-emerald-400 block animate-fade-in">
                Copied to clipboard!
              </span>
            )}
          </div>

          {/* Booking Information Hierarchy */}
          <div className="space-y-4 font-mono text-xs">
            <div className="pb-3 border-b border-neutral-800 flex items-center justify-between">
              <span className="text-neutral-400">Movie</span>
              <span className="font-bold text-white text-sm text-right">{booking.movieTitle}</span>
            </div>

            <div className="pb-3 border-b border-neutral-800 flex items-center justify-between">
              <span className="text-neutral-400">Theatre & Hall</span>
              <span className="font-bold text-neutral-200">{booking.hallName}</span>
            </div>

            <div className="pb-3 border-b border-neutral-800 flex items-center justify-between">
              <span className="text-neutral-400">Showtime</span>
              <span className="font-bold text-red-400">{booking.showtime} • {booking.date}</span>
            </div>

            <div className="pb-3 border-b border-neutral-800 flex items-center justify-between">
              <span className="text-neutral-400">Seat(s)</span>
              <span className="font-extrabold text-emerald-400 text-sm">
                {booking.seatsFormatted || booking.seats.join(', ')}
              </span>
            </div>

            <div className="pb-3 border-b border-neutral-800 flex items-center justify-between">
              <span className="text-neutral-400">Amount Paid</span>
              <div className="text-right">
                <span className="font-bold text-white block">{formatCurrency(booking.totalAmountUSD)}</span>
                <span className="text-[10px] text-emerald-400">৳{amountBDT.toLocaleString()}</span>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-neutral-400">Booking Status</span>
              <Badge variant="success" size="sm" className="font-bold uppercase tracking-wider">
                {booking.status}
              </Badge>
            </div>
          </div>

          {/* Ticket QR Area Visual Placeholder */}
          <div className="p-5 rounded-xl bg-neutral-950 border border-neutral-800 text-center space-y-3">
            <span className="text-[10px] font-mono uppercase tracking-widest text-neutral-500 block">
              Digital Gate Pass
            </span>

            {/* Custom Grid Pattern QR Visual */}
            <div className="w-36 h-36 mx-auto bg-white p-3 rounded-lg flex flex-col justify-between shadow-lg relative">
              {/* Corner Targets */}
              <div className="flex justify-between">
                <div className="w-7 h-7 bg-black p-1 flex items-center justify-center">
                  <div className="w-3 h-3 bg-white flex items-center justify-center">
                    <div className="w-1.5 h-1.5 bg-black" />
                  </div>
                </div>
                <div className="w-7 h-7 bg-black p-1 flex items-center justify-center">
                  <div className="w-3 h-3 bg-white flex items-center justify-center">
                    <div className="w-1.5 h-1.5 bg-black" />
                  </div>
                </div>
              </div>

              {/* Pseudo QR Data Matrix Rows */}
              <div className="my-1 grid grid-cols-6 gap-1 px-1">
                <div className="h-2 bg-black col-span-2" />
                <div className="h-2 bg-black col-span-1" />
                <div className="h-2 bg-neutral-300 col-span-1" />
                <div className="h-2 bg-black col-span-2" />
                <div className="h-2 bg-black col-span-1" />
                <div className="h-2 bg-neutral-400 col-span-3" />
                <div className="h-2 bg-black col-span-2" />
                <div className="h-2 bg-black col-span-3" />
                <div className="h-2 bg-black col-span-3" />
              </div>

              {/* Bottom Corner Target & Barcode */}
              <div className="flex justify-between items-end">
                <div className="w-7 h-7 bg-black p-1 flex items-center justify-center">
                  <div className="w-3 h-3 bg-white flex items-center justify-center">
                    <div className="w-1.5 h-1.5 bg-black" />
                  </div>
                </div>
                <div className="text-[8px] font-mono text-black font-bold tracking-tighter">
                  CINEMASEAT-PASS
                </div>
              </div>
            </div>

            <p className="text-[11px] font-mono text-neutral-400">
              Scan QR code at auditorium entrance for admission.
            </p>
          </div>

          {/* Page Actions */}
          <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link to="/movies" className="w-full sm:w-auto flex-1">
              <Button
                variant="primary"
                className="w-full font-bold bg-red-600 hover:bg-red-500 text-white"
                icon={<Film className="w-4 h-4" />}
              >
                Back to Movies
              </Button>
            </Link>

            <Link to={`/booking/${booking.bookingId}`} className="w-full sm:w-auto flex-1">
              <Button
                variant="outline"
                className="w-full font-bold text-xs"
                icon={<Ticket className="w-4 h-4" />}
              >
                View Booking
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
