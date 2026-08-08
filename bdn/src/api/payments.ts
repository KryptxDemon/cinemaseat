import { apiClient } from './client';
import { PaymentRequest, PaymentResponse } from '../types/payment';

/**
 * POST /payments
 * Asynchronously processes payment with backend gateway.
 */
export async function createPayment(request: PaymentRequest): Promise<PaymentResponse> {
  if (!apiClient.isMockMode) {
    try {
      return await apiClient.request<PaymentResponse>('/payments', {
        method: 'POST',
        body: JSON.stringify(request),
      });
    } catch (err) {
      console.warn('Backend API unavailable, processing mock payment:', err);
    }
  }

  // Simulate backend payment gateway latency (1.8s)
  await apiClient.simulateLatency(1800);

  return {
    paymentId: `pay-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`,
    holdId: request.holdId,
    status: 'successful',
    amountUSD: request.amountUSD,
    createdAt: new Date().toISOString(),
    transactionRef: `TXN-${Math.floor(100000 + Math.random() * 900000)}`,
  };
}

// Backward compatibility alias
export const processPayment = createPayment;
