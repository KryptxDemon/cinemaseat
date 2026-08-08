import React, { useEffect, useRef, useState } from 'react';
import { useParams, useLocation, Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, CreditCard, ShieldCheck, AlertCircle, Loader2 } from 'lucide-react';
import { Button } from '../components/Button';
import { Badge } from '../components/Badge';
import { Card, CardHeader, CardTitle, CardContent } from '../components/Card';
import { formatCurrency } from '../utils/formatters';
import {
  createPayment,
  pollBookingUntilFinal,
  isSuccessfulStatus,
  isFinalStatus,
} from '../services/paymentService';
import {
  BookingDetails,
  HoldResponse,
  ShowDetails,
} from '../services/bookingService';

interface CheckoutCustomer {
  name: string;
  phone: string;
  email: string;
}

interface HeldSeatLite {
  id: string;
  row?: string;
  number?: number;
  priceUSD?: number;
}

interface NavigationState {
  hold?: HoldResponse;
  show?: ShowDetails;
  heldSeats?: HeldSeatLite[];
}

interface BookingContext {
  movieTitle: string;
  hallName: string;
  showtime: string;
  date: string;
  format: string;
  totalAmountUSD: number;
  seatsFormatted: string;
}

export const PaymentPage: React.FC = () => {
  const { bookingId } = useParams<{ bookingId: string }>();
  const location = useLocation();
  const navigate = useNavigate();

  // bookingId here is the holdId from the URL, but we re-use the
  // route param to preserve the existing flow.
  const holdId = bookingId ?? '';

  const navState = (location.state as NavigationState | null) ?? null;

  // Try to recover hold context from sessionStorage if the user
  // landed directly on the URL (no navigation state). This keeps
  // the page working on refresh / shared links.
  const recoverHoldFromStorage = (): HoldResponse | null => {
    if (typeof window === 'undefined') return null;
    try {
      const keys = Object.keys(window.sessionStorage).filter((k) =>
        k.startsWith('cinemaseat_hold_')
      );
      for (const key of keys) {
        const raw = window.sessionStorage.getItem(key);
        if (!raw) continue;
        const parsed = JSON.parse(raw) as HoldResponse;
        if (parsed?.holdId && parsed.holdId === holdId) return parsed;
      }
    } catch {
      /* ignore */
    }
    return null;
  };

  const [hold, setHold] = useState<HoldResponse | null>(
    navState?.hold ?? recoverHoldFromStorage()
  );
  const [show] = useState<ShowDetails | null>(navState?.show ?? null);
  const [heldSeats] = useState<HeldSeatLite[]>(navState?.heldSeats ?? []);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [customer, setCustomer] = useState<CheckoutCustomer>({
    name: '',
    phone: '',
    email: '',
  });
  const [formError, setFormError] = useState<string | null>(null);

  const [paymentStatus, setPaymentStatus] = useState<'idle' | 'pending' | 'successful' | 'failed'>('idle');
  const [paymentMessage, setPaymentMessage] = useState<string | null>(null);
  const [confirmedBooking, setConfirmedBooking] = useState<BookingDetails | null>(null);

  const pollAbortRef = useRef<AbortController | null>(null);

  // NOTE: We intentionally do NOT call `getBooking(holdId)` here.
  // `GET /bookings/{id}` is for *confirmed* bookings; an active hold
  // is not yet a booking, so it would 404 and the summary would show
  // a 0 total. We already have the hold + show + heldSeats from
  // navigation state (or sessionStorage fallback).
  useEffect(() => {
    if (!holdId) {
      setLoadError('Missing hold id.');
      return;
    }
    if (!hold) {
      setLoadError(
        'We could not recover your hold. Please go back and re-select your seats.'
      );
    }
  }, [holdId, hold]);

  // Cancel any polling on unmount
  useEffect(() => {
    return () => {
      pollAbortRef.current?.abort();
    };
  }, []);

  const validateForm = (): string | null => {
    if (!customer.name.trim()) return 'Please enter your name.';
    if (!customer.phone.trim()) return 'Please enter your phone number.';
    if (!customer.email.trim()) return 'Please enter your email address.';
    // Lightweight email shape check only
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customer.email.trim())) {
      return 'Please enter a valid email address.';
    }
    return null;
  };

  const handlePayNow = async () => {
    const validationError = validateForm();
    if (validationError) {
      setFormError(validationError);
      return;
    }
    setFormError(null);
    setPaymentStatus('pending');
    setPaymentMessage('Payment processing...');
    setConfirmedBooking(null);

    try {
      const res = await createPayment({
        holdId,
        amountUSD: ctx.totalAmountUSD,
        name: customer.name.trim(),
        phone: customer.phone.trim(),
        email: customer.email.trim(),
      });

      // If backend already returns a final state, honor it.
      if (res.status === 'successful' || res.status === 'failed') {
        setPaymentStatus(res.status);
        setPaymentMessage(
          res.status === 'successful'
            ? 'Payment successful. Confirming your booking...'
            : 'Payment failed. Please try again.'
        );
      }

      // Determine which booking id to poll.
      const targetBookingId = res.bookingId ?? holdId;

      // If the backend returned a booking id, poll until final.
      if (targetBookingId) {
        const ac = new AbortController();
        pollAbortRef.current = ac;

        try {
          const finalBooking = await pollBookingUntilFinal(targetBookingId, {
            signal: ac.signal,
            intervalMs: 2000,
            timeoutMs: 5 * 60 * 1000,
          });

          if (isSuccessfulStatus(finalBooking.status)) {
            setConfirmedBooking(finalBooking);
            setPaymentStatus('successful');
            setPaymentMessage('Booking confirmed.');
          } else if (isFinalStatus(finalBooking.status)) {
            setPaymentStatus('failed');
            setPaymentMessage('Payment failed. Please try again.');
          }
        } catch (pollErr) {
          // Keep the last known status; surface a friendly message
          if ((pollErr as Error)?.message !== 'Polling cancelled') {
            setPaymentMessage('Still waiting for confirmation. Please retry.');
          }
        }
      }
    } catch (err: unknown) {
      setPaymentStatus('failed');
      const message =
        (err as { message?: string })?.message || 'Payment could not be initiated.';
      setPaymentMessage(message);
    }
  };

  // While polling, if we got a successful state, redirect to booking page
  useEffect(() => {
    if (paymentStatus === 'successful' && confirmedBooking?.bookingId) {
      const id = confirmedBooking.bookingId;
      const timer = setTimeout(() => {
        navigate(`/booking/${encodeURIComponent(id)}`);
      }, 1200);
      return () => clearTimeout(timer);
    }
  }, [paymentStatus, confirmedBooking, navigate]);

// Derived display data — prefer nav-state hold/show/seats,
  // fall back to confirmedBooking fields once a payment succeeds.
  const ctx: BookingContext = {
    movieTitle:
      (show?.movieTitle as string) ||
      (confirmedBooking?.movieTitle as string) ||
      (confirmedBooking?.['title'] as string) ||
      'Movie',
    hallName:
      (show?.hallName as string) ||
      (confirmedBooking?.hallName as string) ||
      'Auditorium',
    showtime:
      (show?.startTime as string) ||
      (show?.showtime as string) ||
      (confirmedBooking?.showtime as string) ||
      (confirmedBooking?.['startTime'] as string) ||
      '',
    date:
      (show?.date as string) ||
      (confirmedBooking?.date as string) ||
      '',
    format:
      (show?.format as string) ||
      (confirmedBooking?.format as string) ||
      '',
    totalAmountUSD:
      (typeof hold?.totalPriceUSD === 'number' ? hold.totalPriceUSD : 0) ||
      (typeof confirmedBooking?.totalAmountUSD === 'number'
        ? confirmedBooking.totalAmountUSD
        : 0),
    seatsFormatted:
      heldSeats.length > 0
        ? heldSeats
            .map((s) => `${s.row ?? ''}${s.number ?? ''}`.trim())
            .filter(Boolean)
            .join(', ')
        : confirmedBooking?.seatsFormatted ||
          ((confirmedBooking?.['seats'] as unknown[]) || [])
            .map((s) => {
              const seat = s as { row?: string; number?: number; label?: string };
              return seat.label || `${seat.row ?? ''}${seat.number ?? ''}`.trim();
            })
            .filter(Boolean)
            .join(', '),
  };

  if (!holdId) {
    return (
      <div className="py-20 text-center text-neutral-400 font-mono">
        Missing booking reference.
      </div>
    );
  }

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
          Ref: <span className="text-white font-bold ml-1">{holdId}</span>
        </Badge>
      </div>

      <div className="space-y-2">
        <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
          Checkout & Payment
        </h1>
        <p className="text-xs text-neutral-300">
          Confirm your cinema seats and provide your contact details.
        </p>
      </div>

      {loadError && (
        <div className="p-3 rounded-xl bg-amber-950/80 border border-amber-800 text-amber-200 text-xs font-mono flex items-start gap-2">
          <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
          <span>{loadError}</span>
        </div>
      )}

      {/* Initial state: customer info + checkout summary */}
      {paymentStatus === 'idle' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* LEFT: Booking Information (7 cols) */}
          <div className="lg:col-span-7 space-y-6">
            <Card className="bg-neutral-900 border-neutral-800 shadow-xl">
              <CardHeader className="border-b border-neutral-800/80 pb-4">
                <div className="flex items-center justify-between gap-2">
                  <Badge variant="primary" size="sm" className="bg-red-600 text-white font-bold">
                    {ctx.format || 'Standard'}
                  </Badge>
                  <span className="text-xs font-semibold text-neutral-400">Locked Seats</span>
                </div>
                <CardTitle className="text-xl font-bold text-white pt-1">
                  {ctx.movieTitle}
                </CardTitle>
              </CardHeader>

              <CardContent className="py-6 space-y-5">
                <div className="grid grid-cols-2 gap-4 text-xs">
                  <div className="p-3.5 rounded-xl bg-neutral-950/80 border border-neutral-800 space-y-1">
                    <span className="text-[11px] text-neutral-400 uppercase font-semibold block">
                      Cinema / Hall
                    </span>
                    <span className="font-bold text-white text-sm block">{ctx.hallName}</span>
                  </div>

                  <div className="p-3.5 rounded-xl bg-neutral-950/80 border border-neutral-800 space-y-1">
                    <span className="text-[11px] text-neutral-400 uppercase font-semibold block">
                      Show Time
                    </span>
                    <span className="font-bold text-red-400 text-sm block">
                      {ctx.showtime || '—'}
                      {ctx.date ? ` • ${ctx.date}` : ''}
                    </span>
                  </div>

                  <div className="p-3.5 rounded-xl bg-neutral-950/80 border border-neutral-800 space-y-1">
                    <span className="text-[11px] text-neutral-400 uppercase font-semibold block">
                      Selected Seats
                    </span>
                    <span className="font-bold text-amber-300 text-sm block">
                      {ctx.seatsFormatted || '—'}
                    </span>
                  </div>

                  <div className="p-3.5 rounded-xl bg-neutral-950/80 border border-neutral-800 space-y-1">
                    <span className="text-[11px] text-neutral-400 uppercase font-semibold block">
                      Total Price
                    </span>
                    <span className="font-bold text-emerald-400 text-sm block">
                      {formatCurrency(ctx.totalAmountUSD)}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* RIGHT: Customer + Pay (5 cols) */}
          <div className="lg:col-span-5 space-y-6">
            <Card className="bg-neutral-900 border-neutral-800 shadow-2xl sticky top-20">
              <CardHeader className="border-b border-neutral-800 pb-4">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-red-950 border border-red-800/80 flex items-center justify-center text-red-500">
                    <CreditCard className="w-4 h-4" />
                  </div>
                  <div>
                    <CardTitle className="text-lg font-bold text-white">Your Details</CardTitle>
                    <p className="text-[11px] text-neutral-400">We only need a few basics.</p>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="py-6 space-y-5">
                {/* Name */}
                <div className="space-y-1.5">
                  <label className="block text-[11px] font-semibold uppercase tracking-wider text-neutral-300">
                    Full Name
                  </label>
                  <input
                    type="text"
                    value={customer.name}
                    onChange={(e) => setCustomer((c) => ({ ...c, name: e.target.value }))}
                    placeholder="Jane Doe"
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2.5 text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-red-600 focus:ring-1 focus:ring-red-600/50"
                  />
                </div>

                {/* Phone */}
                <div className="space-y-1.5">
                  <label className="block text-[11px] font-semibold uppercase tracking-wider text-neutral-300">
                    Phone
                  </label>
                  <input
                    type="tel"
                    value={customer.phone}
                    onChange={(e) => setCustomer((c) => ({ ...c, phone: e.target.value }))}
                    placeholder="+1 555 123 4567"
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2.5 text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-red-600 focus:ring-1 focus:ring-red-600/50"
                  />
                </div>

                {/* Email */}
                <div className="space-y-1.5">
                  <label className="block text-[11px] font-semibold uppercase tracking-wider text-neutral-300">
                    Email
                  </label>
                  <input
                    type="email"
                    value={customer.email}
                    onChange={(e) => setCustomer((c) => ({ ...c, email: e.target.value }))}
                    placeholder="jane@example.com"
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2.5 text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-red-600 focus:ring-1 focus:ring-red-600/50"
                  />
                </div>

                {/* Total */}
                <div className="p-4 rounded-xl bg-neutral-950 border border-neutral-800/80 space-y-2">
                  <span className="text-xs text-neutral-400 font-semibold uppercase block">
                    Total Payable
                  </span>
                  <div className="flex items-baseline justify-between">
                    <span className="text-3xl font-extrabold text-white">
                      {formatCurrency(ctx.totalAmountUSD)}
                    </span>
                  </div>
                </div>

                {/* Security */}
                <div className="p-3.5 rounded-xl bg-neutral-950/60 border border-neutral-800 text-xs text-neutral-400 space-y-1.5">
                  <div className="flex items-center gap-1.5 text-neutral-300 font-bold">
                    <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>Secure Checkout</span>
                  </div>
                  <p className="text-[11px] text-neutral-400 leading-relaxed">
                    Your seat reservation is locked while payment is being processed.
                  </p>
                </div>

                {formError && (
                  <div className="p-3 rounded-xl bg-red-950/80 border border-red-800 text-red-200 text-xs font-mono flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                    <span>{formError}</span>
                  </div>
                )}

                <Button
                  variant="primary"
                  className="w-full py-3.5 text-sm font-bold bg-red-600 hover:bg-red-500 text-white shadow-xl shadow-red-950/60"
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

      {/* Pending state */}
      {paymentStatus === 'pending' && (
        <div className="p-8 sm:p-12 rounded-2xl bg-neutral-900 border border-neutral-800 text-center space-y-6 shadow-2xl animate-fade-in">
          <div className="relative w-16 h-16 mx-auto flex items-center justify-center">
            <div className="absolute inset-0 rounded-full border-4 border-red-600/20 animate-ping" />
            <div className="w-16 h-16 rounded-full bg-red-950/80 border border-red-700/80 flex items-center justify-center text-red-500 shadow-xl shadow-red-950/50">
              <Loader2 className="w-8 h-8 animate-spin" />
            </div>
          </div>
          <h2 className="text-xl font-bold text-white tracking-tight">Payment processing...</h2>
          <p className="text-xs text-neutral-400 font-mono max-w-sm mx-auto">
            {paymentMessage || 'Please wait while the backend finalizes your payment.'}
          </p>
        </div>
      )}

      {/* Success state */}
      {paymentStatus === 'successful' && confirmedBooking && (
        <div className="p-8 sm:p-10 rounded-2xl bg-neutral-900 border border-emerald-900/60 text-center space-y-6 shadow-2xl animate-fade-in">
          <div className="w-16 h-16 mx-auto rounded-full bg-emerald-950 border border-emerald-600/80 flex items-center justify-center text-emerald-400 shadow-xl shadow-emerald-950/80">
            <ShieldCheck className="w-9 h-9" />
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-black text-white tracking-tight">Booking Confirmed</h2>
            <p className="text-xs text-neutral-300 font-mono">
              Your seats are reserved. Redirecting to your booking...
            </p>
          </div>
        </div>
      )}

      {/* Failed state */}
      {paymentStatus === 'failed' && (
        <div className="p-8 sm:p-10 rounded-2xl bg-neutral-900 border border-red-900/60 text-center space-y-6 shadow-2xl animate-fade-in">
          <div className="w-16 h-16 mx-auto rounded-full bg-red-950 border border-red-700/80 flex items-center justify-center text-red-500 shadow-xl shadow-red-950/80">
            <AlertCircle className="w-9 h-9" />
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-black text-white tracking-tight">Payment failed</h2>
            <p className="text-xs text-neutral-300 font-mono max-w-sm mx-auto">
              {paymentMessage || 'The payment could not be completed.'}
            </p>
          </div>
          <div className="flex items-center justify-center gap-3">
            <Button
              variant="primary"
              onClick={() => {
                setPaymentStatus('idle');
                setPaymentMessage(null);
              }}
            >
              Try Again
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};
