import React from 'react';
import { useParams, Link } from 'react-router-dom';
import { Check, Film, ArrowLeft, Ticket, Copy, CheckCircle2, AlertCircle, Download, Loader2 } from 'lucide-react';
import { useAsync } from '../hooks/useAsync';
import { getBooking, downloadTicketPdf, savePdfBlob } from '../services/bookingService';
import { BookingDetails } from '../services/bookingService';
import { LoadingState } from '../components/LoadingState';
import { ErrorState } from '../components/ErrorState';
import { Button } from '../components/Button';
import { Badge } from '../components/Badge';
import { Card, CardContent } from '../components/Card';
import { formatCurrency } from '../utils/formatters';

export const BookingPage: React.FC = () => {
  const { bookingId } = useParams<{ bookingId: string }>();
  const [copied, setCopied] = React.useState(false);
  const [downloading, setDownloading] = React.useState(false);
  const [downloadError, setDownloadError] = React.useState<string | null>(null);

  const {
    data: booking,
    loading,
    error,
    refetch,
  } = useAsync<BookingDetails | null>(
    () => (bookingId ? getBooking(bookingId) : Promise.reject('No booking ID')),
    [bookingId]
  );

  const handleCopyRef = () => {
    if (!booking?.bookingId) return;
    navigator.clipboard.writeText(booking.bookingId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadTicket = async () => {
    if (!bookingId) return;
    setDownloading(true);
    setDownloadError(null);
    try {
      const blob = await downloadTicketPdf(bookingId);
      savePdfBlob(blob, `cinemaseat-ticket-${bookingId}.pdf`);
    } catch (err: unknown) {
      setDownloadError(
        (err as { message?: string })?.message ||
          'Could not download the ticket. Please try again.'
      );
    } finally {
      setDownloading(false);
    }
  };

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

  // Resolve display fields, supporting either nested or flat backend shapes
  const customer = (booking.customer as { name?: string; phone?: string; email?: string } | undefined) || {};
  const displaySeats =
    booking.seatsFormatted ||
    (Array.isArray(booking.seats) ? booking.seats.join(', ') : '') ||
    (Array.isArray(booking.seatIds) ? (booking.seatIds as string[]).join(', ') : '');

  return (
    <div className="py-8 sm:py-12 max-w-xl mx-auto px-4 space-y-6 animate-fade-in">
      <Card className="bg-neutral-900 border-neutral-800 shadow-2xl rounded-2xl overflow-hidden">
        {/* Top Header with Checkmark Icon */}
        <div className="p-8 text-center bg-gradient-to-b from-emerald-950/40 to-neutral-900 border-b border-neutral-800/80 space-y-3">
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
          {/* Booking Reference */}
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

          {/* Booking Information */}
          <div className="space-y-4 font-mono text-xs">
            <div className="pb-3 border-b border-neutral-800 flex items-center justify-between">
              <span className="text-neutral-400">Movie</span>
              <span className="font-bold text-white text-sm text-right">
                {booking.movieTitle || '—'}
              </span>
            </div>

            <div className="pb-3 border-b border-neutral-800 flex items-center justify-between">
              <span className="text-neutral-400">Date</span>
              <span className="font-bold text-neutral-200">{booking.date || '—'}</span>
            </div>

            <div className="pb-3 border-b border-neutral-800 flex items-center justify-between">
              <span className="text-neutral-400">Show Time</span>
              <span className="font-bold text-red-400">{booking.showtime || '—'}</span>
            </div>

            <div className="pb-3 border-b border-neutral-800 flex items-center justify-between">
              <span className="text-neutral-400">Cinema / Hall</span>
              <span className="font-bold text-neutral-200">{booking.hallName || '—'}</span>
            </div>

            <div className="pb-3 border-b border-neutral-800 flex items-center justify-between">
              <span className="text-neutral-400">Seats</span>
              <span className="font-extrabold text-emerald-400 text-sm">{displaySeats || '—'}</span>
            </div>

            <div className="pb-3 border-b border-neutral-800 flex items-center justify-between">
              <span className="text-neutral-400">Name</span>
              <span className="font-bold text-neutral-200">{customer.name || '—'}</span>
            </div>

            <div className="pb-3 border-b border-neutral-800 flex items-center justify-between">
              <span className="text-neutral-400">Phone</span>
              <span className="font-bold text-neutral-200">{customer.phone || '—'}</span>
            </div>

            <div className="pb-3 border-b border-neutral-800 flex items-center justify-between">
              <span className="text-neutral-400">Email</span>
              <span className="font-bold text-neutral-200 truncate max-w-[60%] text-right">
                {customer.email || '—'}
              </span>
            </div>

            <div className="pb-3 border-b border-neutral-800 flex items-center justify-between">
              <span className="text-neutral-400">Total Amount</span>
              <span className="font-bold text-white">
                {formatCurrency(booking.totalAmountUSD ?? 0)}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-neutral-400">Booking Status</span>
              <Badge variant="success" size="sm" className="font-bold uppercase tracking-wider">
                {booking.status || 'confirmed'}
              </Badge>
            </div>
          </div>

          {/* Download error */}
          {downloadError && (
            <div className="p-3 rounded-xl bg-red-950/80 border border-red-800 text-red-200 text-xs font-mono flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
              <span>{downloadError}</span>
            </div>
          )}

          {/* Page Actions */}
          <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Button
              variant="primary"
              className="w-full sm:w-auto flex-1 font-bold bg-red-600 hover:bg-red-500 text-white"
              onClick={handleDownloadTicket}
              disabled={downloading}
              icon={
                downloading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Download className="w-4 h-4" />
                )
              }
            >
              {downloading ? 'Downloading...' : 'Download Ticket'}
            </Button>

            <Link to="/movies" className="w-full sm:w-auto flex-1">
              <Button
                variant="outline"
                className="w-full font-bold text-xs"
                icon={<Film className="w-4 h-4" />}
              >
                Back to Movies
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
