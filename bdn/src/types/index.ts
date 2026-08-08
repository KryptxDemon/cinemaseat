export * from './movie';
export * from './showtime';
export * from './seat';
export * from './payment';
export * from './booking';
export * from './api';

export interface Theatre {
  id: string;
  name: string;
  location: string;
  hallsCount?: number;
}

export type Hold = import('./seat').HoldResponse;
export type Booking = import('./booking').BookingDetails;
export type Payment = import('./payment').PaymentResponse;
export type PaymentStatus = import('./payment').PaymentStatusType;
