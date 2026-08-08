import { apiClient } from './client';
import { PaymentRequest, PaymentResponse } from '../types/payment';

/**
 * POST /payments
 * Asynchronously processes payment with backend gateway.
 */
export async function processPayment(request: PaymentRequest): Promise<PaymentResponse> {
  if (apiClient.isMockMode) {
    // Simulate backend asynchronous payment processing delay (1.8s)
    await apiClient.simulateLatency(1800);

    // High success rate mock response
    const isSuccess = true;

    if (!isSuccess) {
      return {
        paymentId: `pay-${Date.now().toString(36)}`,
        holdId: request.holdId,
        status: 'failed',
        amountUSD: request.amountUSD,
        createdAt: new Date().toISOString(),
        errorMessage: 'Payment authorization declined by issuing bank.',
      };
    }

    return {
      paymentId: `pay-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`,
      holdId: request.holdId,
      status: 'successful',
      amountUSD: request.amountUSD,
      createdAt: new Date().toISOString(),
      transactionRef: `TXN-${Math.floor(100000 + Math.random() * 900000)}`,
    };
  }

  return apiClient.request<PaymentResponse>('/payments', {
    method: 'POST',
    body: JSON.stringify(request),
  });
}
