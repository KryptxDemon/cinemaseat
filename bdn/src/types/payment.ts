export type PaymentStatusType = 'pending' | 'successful' | 'failed';

export interface PaymentRequest {
  holdId: string;
  amountUSD: number;
  paymentMethod?: string;
}

export interface PaymentResponse {
  paymentId: string;
  holdId: string;
  status: PaymentStatusType;
  amountUSD: number;
  createdAt: string;
  transactionRef?: string;
  errorMessage?: string;
}
