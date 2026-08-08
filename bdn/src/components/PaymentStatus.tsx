import React from 'react';
import { Loader2, CheckCircle2, XCircle, Ticket, ArrowLeft, RefreshCw } from 'lucide-react';
import { PaymentStatusType, PaymentResponse } from '../types/payment';
import { Button } from './Button';
import { formatCurrency } from '../utils/formatters';
import { Link } from 'react-router-dom';

interface PaymentStatusProps {
  status: PaymentStatusType;
  paymentData: PaymentResponse | null;
  errorMessage?: string | null;
  onRetry?: () => void;
  bookingRef?: string;
  movieTitle?: string;
}

export const PaymentStatus: React.FC<PaymentStatusProps> = ({
  status,
  paymentData,
  errorMessage,
  onRetry,
  bookingRef,
  movieTitle,
}) => {
  if (status === 'pending') {
    return (
      <div className="p-8 sm:p-12 rounded-2xl bg-neutral-900 border border-neutral-800 text-center space-y-6 shadow-2xl animate-fade-in">
        <div className="relative w-16 h-16 mx-auto flex items-center justify-center">
          <div className="absolute inset-0 rounded-full border-4 border-red-600/20 animate-ping" />
          <div className="w-16 h-16 rounded-full bg-red-950/80 border border-red-700/80 flex items-center justify-center text-red-500 shadow-xl shadow-red-950/50">
            <Loader2 className="w-8 h-8 animate-spin" />
          </div>
        </div>

        <div className="space-y-2">
          <h2 className="text-xl font-bold text-white tracking-tight">Payment processing...</h2>
          <p className="text-xs text-neutral-400 font-mono max-w-sm mx-auto">
            Communicating with secure payment server. Please do not refresh or navigate away from this page.
          </p>
        </div>

        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-neutral-950 border border-neutral-800 text-[11px] font-mono text-neutral-400">
          <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
          <span>Gateway Verification Pending</span>
        </div>
      </div>
    );
  }

  if (status === 'successful') {
    return (
      <div className="p-8 sm:p-10 rounded-2xl bg-neutral-900 border border-emerald-900/60 text-center space-y-6 shadow-2xl animate-fade-in">
        <div className="w-16 h-16 mx-auto rounded-full bg-emerald-950 border border-emerald-600/80 flex items-center justify-center text-emerald-400 shadow-xl shadow-emerald-950/80">
          <CheckCircle2 className="w-9 h-9" />
        </div>

        <div className="space-y-2">
          <span className="text-xs font-mono font-bold uppercase tracking-widest text-emerald-400 block">
            Transaction Complete
          </span>
          <h2 className="text-2xl font-black text-white tracking-tight">Payment successful</h2>
          <p className="text-xs text-neutral-300 font-mono">
            Your seats have been confirmed! A digital ticket has been issued.
          </p>
        </div>

        {/* Receipt Box */}
        <div className="p-5 rounded-xl bg-neutral-950/90 border border-neutral-800/80 text-left space-y-3 font-mono text-xs max-w-md mx-auto">
          <div className="flex items-center justify-between text-neutral-400 pb-2 border-b border-neutral-800">
            <span>Transaction Ref</span>
            <span className="font-bold text-white">{paymentData?.transactionRef || 'TXN-99812'}</span>
          </div>

          <div className="flex items-center justify-between text-neutral-400 pb-2 border-b border-neutral-800">
            <span>Booking Hold ID</span>
            <span className="font-bold text-white">{bookingRef || paymentData?.holdId}</span>
          </div>

          <div className="flex items-center justify-between text-neutral-400">
            <span>Total Paid</span>
            <span className="font-black text-base text-emerald-400">
              {formatCurrency(paymentData?.amountUSD || 0)}
            </span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2 max-w-md mx-auto">
          <Link to="/movies" className="w-full sm:w-auto flex-1">
            <Button variant="outline" className="w-full text-xs" icon={<ArrowLeft className="w-4 h-4" />}>
              Back to Movies
            </Button>
          </Link>
          <Link to={`/booking/${bookingRef || paymentData?.holdId}`} className="w-full sm:w-auto flex-1">
            <Button variant="primary" className="w-full text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white" icon={<Ticket className="w-4 h-4" />}>
              View Booking
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  // FAILED state
  return (
    <div className="p-8 sm:p-10 rounded-2xl bg-neutral-900 border border-red-900/60 text-center space-y-6 shadow-2xl animate-fade-in">
      <div className="w-16 h-16 mx-auto rounded-full bg-red-950 border border-red-700/80 flex items-center justify-center text-red-500 shadow-xl shadow-red-950/80">
        <XCircle className="w-9 h-9" />
      </div>

      <div className="space-y-2">
        <span className="text-xs font-mono font-bold uppercase tracking-widest text-red-400 block">
          Transaction Failed
        </span>
        <h2 className="text-2xl font-black text-white tracking-tight">Payment failed</h2>
        <p className="text-xs text-neutral-300 font-mono max-w-sm mx-auto">
          {errorMessage || paymentData?.errorMessage || 'The payment request could not be authorized.'}
        </p>
      </div>

      <div className="flex items-center justify-center gap-3 pt-2">
        {onRetry && (
          <Button
            variant="primary"
            onClick={onRetry}
            icon={<RefreshCw className="w-4 h-4" />}
            className="text-xs font-bold"
          >
            Try Payment Again
          </Button>
        )}
      </div>
    </div>
  );
};
