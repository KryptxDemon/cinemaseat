import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, CreditCard, ShieldCheck, Ticket, AlertCircle, Sparkles, Check } from 'lucide-react';
import { HoldResponse } from '../types/seat';
import { PaymentStatusType, PaymentResponse } from '../types/payment';
import { processPayment } from '../api/payments';
import { saveMockBooking } from '../api/bookings';
import { HoldTimer } from '../components/HoldTimer';
import { PaymentStatus } from '../components/PaymentStatus';
import { Button } from '../components/Button';
import { Badge } from '../components/Badge';
import { Card, CardHeader, CardTitle, CardContent } from '../components/Card';
import { formatCurrency, formatTime } from '../utils/formatters';

interface StoredHoldDetails {
  hold: HoldResponse;
  movieTitle?: string;
  moviePosterUrl?: string;
  hallName?: string;
  showtime?: string;
  date?: string;
  format?: string;
  seatsFormatted?: string;
}

export const PaymentPage: React.FC = () => {
  const { bookingId } = useParams<{ bookingId: string }>();
  const navigate = useNavigate();

  const [holdDetails, setHoldDetails] = useState<StoredHoldDetails | null>(null);
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatusType | 'idle'>('idle');
  const [paymentResponse, setPaymentResponse] = useState<PaymentResponse | null>(null);
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [isExpired, setIsExpired] = useState<boolean>(false);

  // Load hold information from sessionStorage or mock fallback
  useEffect(() => {
    if (!bookingId) return;

    // Search sessionStorage for hold matching bookingId
    let foundHold: StoredHoldDetails | null = null;

    for (let i = 0; i < sessionStorage.length; i++) {
      const key = sessionStorage.key(i);
      if (key && key.startsWith('cinemaseat_hold_')) {
        try {
          const raw = sessionStorage.getItem(key);
          if (raw) {
            const parsed: HoldResponse = JSON.parse(raw);
            if (parsed.holdId === bookingId) {
              foundHold = {
                hold: parsed,
                movieTitle: 'Inception: 10th Anniversary',
                hallName: 'IMAX Laser Hall 1',
                showtime: '19:30',
                date: '2026-08-08',
                format: 'IMAX 3D',
                seatsFormatted: parsed.seatIds.map((id) => id.split('-').pop()).join(', '),
              };
              break;
            }
          }
        } catch {
          // ignore parsing error
        }
      }
    }

    // Fallback mock details if direct URL navigation
    if (!foundHold) {
      const fallbackExpiresAt = new Date(Date.now() + 600 * 1000).toISOString();
      foundHold = {
        hold: {
          holdId: bookingId,
          showId: 'show-1',
          seatIds: ['E6', 'E7'],
          expiresAt: fallbackExpiresAt,
          expiresInSeconds: 600,
          totalPriceUSD: 29.5,
          status: 'active',
        },
        movieTitle: 'Dune: Part Two',
        moviePosterUrl: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?w=500&auto=format&fit=crop',
        hallName: 'Auditorium A',
        showtime: '20:15',
        date: '2026-08-08',
        format: '4K Dolby Atmos',
        seatsFormatted: 'E6, E7',
      };
    }

    setHoldDetails(foundHold);
  }, [bookingId]);

  // Handle hold timer expiry
  const handleHoldExpired = useCallback(() => {
    setIsExpired(true);
    setPaymentError('Your seat hold timer expired. Please return and select seats again.');
  }, []);

  // Handle "Pay Now" action
  const handlePayNow = async () => {
    if (!holdDetails || isExpired) return;

    setPaymentStatus('pending');
    setPaymentError(null);

    try {
      // POST /payments API call
      const res = await processPayment({
        holdId: holdDetails.hold.holdId,
        amountUSD: holdDetails.hold.totalPriceUSD,
        paymentMethod: 'mock_gateway',
      });

      setPaymentResponse(res);
      setPaymentStatus(res.status);

      if (res.status === 'successful') {
        // Save confirmed booking object
        saveMockBooking({
          bookingId: holdDetails.hold.holdId,
          movieTitle: holdDetails.movieTitle || 'Movie Ticket',
          moviePosterUrl: holdDetails.moviePosterUrl,
          hallName: holdDetails.hallName || 'Hall 1',
          showtime: holdDetails.showtime || '19:30',
          date: holdDetails.date || '2026-08-08',
          format: holdDetails.format || 'Standard',
          seats: holdDetails.hold.seatIds,
          seatsFormatted: holdDetails.seatsFormatted || holdDetails.hold.seatIds.join(', '),
          totalAmountUSD: holdDetails.hold.totalPriceUSD,
          totalAmountBDT: Math.round(holdDetails.hold.totalPriceUSD * 110),
          status: 'confirmed',
          createdAt: new Date().toISOString(),
          paymentRef: res.transactionRef,
        });

        // Clear hold from session storage after successful payment
        for (let i = 0; i < sessionStorage.length; i++) {
          const key = sessionStorage.key(i);
          if (key && key.startsWith('cinemaseat_hold_')) {
            sessionStorage.removeItem(key);
          }
        }
      }
    } catch (err: unknown) {
      setPaymentStatus('failed');
      setPaymentError((err as { message?: string })?.message || 'Payment processing failed');
    }
  };

  if (!holdDetails) {
    return (
      <div className="py-20 text-center text-neutral-400 font-mono">
        Loading booking details...
      </div>
    );
  }

  const { hold, movieTitle, hallName, showtime, date, format, seatsFormatted } = holdDetails;

  // Approximate Taka / USD currency displays as per prompt requirement (৳450)
  const amountBDT = Math.round(hold.totalPriceUSD * 110);

  return (
    <div className="space-y-6 pb-20 max-w-5xl mx-auto">
      {/* Top Header */}
      <div className="flex items-center justify-between gap-4">
        <Link to="/showtimes">
          <Button variant="ghost" size="sm" icon={<ArrowLeft className="w-4 h-4" />}>
            Back to Showtimes
          </Button>
        </Link>

        <Badge variant="outline" size="sm" className="font-mono text-neutral-300">
          Ref: <span className="text-white font-bold ml-1">{hold.holdId}</span>
        </Badge>
      </div>

      <div className="space-y-2">
        <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
          Checkout & Payment
        </h1>
        <p className="text-xs text-neutral-400 font-mono">
          Confirm your cinema seats and authorize payment.
        </p>
      </div>

      {/* Main Two-Part Layout */}
      {paymentStatus !== 'idle' ? (
        // When payment process has been initiated (Pending, Success, Failed)
        <PaymentStatus
          status={paymentStatus as PaymentStatusType}
          paymentData={paymentResponse}
          errorMessage={paymentError}
          onRetry={handlePayNow}
          bookingRef={hold.holdId}
          movieTitle={movieTitle}
        />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* LEFT: Booking Information (7 cols) */}
          <div className="lg:col-span-7 space-y-6">
            <Card className="bg-neutral-900 border-neutral-800 shadow-xl">
              <CardHeader className="border-b border-neutral-800/80 pb-4">
                <div className="flex items-center justify-between gap-2">
                  <Badge variant="primary" size="sm" className="bg-red-600 text-white font-bold">
                    {format || 'Standard'}
                  </Badge>
                  <span className="text-xs font-mono text-neutral-400">Locked Seats</span>
                </div>
                <CardTitle className="text-xl font-bold text-white pt-1">{movieTitle}</CardTitle>
              </CardHeader>

              <CardContent className="py-6 space-y-5">
                {/* Details Grid */}
                <div className="grid grid-cols-2 gap-4 text-xs font-mono">
                  <div className="p-3.5 rounded-xl bg-neutral-950/80 border border-neutral-800 space-y-1">
                    <span className="text-[10px] text-neutral-500 uppercase block">Theatre & Hall</span>
                    <span className="font-bold text-white text-sm block">{hallName}</span>
                  </div>

                  <div className="p-3.5 rounded-xl bg-neutral-950/80 border border-neutral-800 space-y-1">
                    <span className="text-[10px] text-neutral-500 uppercase block">Showtime</span>
                    <span className="font-bold text-red-400 text-sm block">{showtime} • {date}</span>
                  </div>

                  <div className="p-3.5 rounded-xl bg-neutral-950/80 border border-neutral-800 space-y-1">
                    <span className="text-[10px] text-neutral-500 uppercase block">Seats</span>
                    <span className="font-bold text-emerald-300 text-sm block">{seatsFormatted || hold.seatIds.join(', ')}</span>
                  </div>

                  <div className="p-3.5 rounded-xl bg-neutral-950/80 border border-neutral-800 space-y-1">
                    <span className="text-[10px] text-neutral-500 uppercase block">Booking Reference</span>
                    <span className="font-bold text-neutral-300 text-xs truncate block">{hold.holdId}</span>
                  </div>
                </div>

                {/* Visible Hold Timer */}
                <div className="pt-2">
                  <span className="text-xs font-mono text-neutral-400 uppercase tracking-wider block mb-2">
                    Active Seat Reservation Timer
                  </span>
                  <HoldTimer
                    expiresAt={hold.expiresAt}
                    onExpire={handleHoldExpired}
                  />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* RIGHT: Payment Section (5 cols) */}
          <div className="lg:col-span-5 space-y-6">
            <Card className="bg-neutral-900 border-neutral-800 shadow-2xl sticky top-20">
              <CardHeader className="border-b border-neutral-800 pb-4">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-red-950 border border-red-800/80 flex items-center justify-center text-red-500">
                    <CreditCard className="w-4 h-4" />
                  </div>
                  <div>
                    <CardTitle className="text-lg font-bold text-white">Payment</CardTitle>
                    <p className="text-[11px] text-neutral-400 font-mono">FastAPI Secure Gateway Mock</p>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="py-6 space-y-6">
                {/* Amount Display */}
                <div className="p-4 rounded-xl bg-neutral-950 border border-neutral-800/80 space-y-2">
                  <span className="text-xs text-neutral-400 font-mono uppercase block">Total Payable Amount</span>
                  <div className="flex items-baseline justify-between">
                    <span className="text-3xl font-black text-white font-mono">
                      {formatCurrency(hold.totalPriceUSD)}
                    </span>
                    <span className="text-sm font-mono text-emerald-400 font-bold">
                      ৳{amountBDT.toLocaleString()}
                    </span>
                  </div>
                  <p className="text-[10px] text-neutral-500 font-mono">
                    Includes screen charges, booking fees, and local taxes.
                  </p>
                </div>

                {/* Hackathon Mock Notice */}
                <div className="p-3.5 rounded-xl bg-neutral-950/60 border border-neutral-800 text-xs font-mono text-neutral-400 space-y-1.5">
                  <div className="flex items-center gap-1.5 text-neutral-300 font-bold">
                    <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>Mock Gateway Mode</span>
                  </div>
                  <p className="text-[11px] text-neutral-400 leading-relaxed">
                    No actual credit card credentials or sensitive financial data are collected. Clicking "Pay Now" submits an asynchronous request to <code className="text-white">POST /payments</code>.
                  </p>
                </div>

                {/* Error Banner */}
                {paymentError && (
                  <div className="p-3 rounded-xl bg-red-950/80 border border-red-800 text-red-200 text-xs font-mono flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                    <span>{paymentError}</span>
                  </div>
                )}

                {/* Pay Now Button */}
                <Button
                  variant="primary"
                  className="w-full py-3.5 text-sm font-bold bg-red-600 hover:bg-red-500 text-white shadow-xl shadow-red-950/60"
                  disabled={isExpired}
                  onClick={handlePayNow}
                  icon={<CreditCard className="w-4 h-4" />}
                >
                  Pay Now
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
};
