/**
 * Utility for conditional class names joining without external dependencies
 */
export function cn(...classes: (string | boolean | undefined | null)[]): string {
  return classes.filter(Boolean).join(' ');
}
