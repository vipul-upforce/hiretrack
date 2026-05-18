/**
 * Returns the provider slot for `itemIndex` when cycling through `providerCount` providers.
 * Example: 3 providers → indices 0,1,2,0,1,2,…
 */
export function resolveRoundRobinIndex(
  itemIndex: number,
  providerCount: number,
): number {
  if (!Number.isInteger(providerCount) || providerCount <= 0) {
    throw new Error('resolveRoundRobinIndex: providerCount must be a positive integer');
  }
  return ((itemIndex % providerCount) + providerCount) % providerCount;
}
