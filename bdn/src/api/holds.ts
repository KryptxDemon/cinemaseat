/**
 * Holds API — POST /holds
 *
 * This module owns the seat hold contract.
 * The implementation lives in bookings.ts alongside getBooking
 * because a hold record is tightly coupled to booking state.
 */
export { holdSeat, createSeatHold, createHold } from './bookings';
