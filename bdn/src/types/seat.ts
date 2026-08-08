export type SeatStatus = 'available' | 'reserved' | 'selected' | 'held' | 'wheelchair';
export type SeatTier = 'standard' | 'premium' | 'vip';

export interface Seat {
  id: string;
  row: string;
  number: number;
  tier: SeatTier;
  priceModifier: number; // multiplier e.g. 1.0, 1.25, 1.5
  status: SeatStatus;
}
