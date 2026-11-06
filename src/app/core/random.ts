/** All entropy is explicit. A retried database transaction reproduces its result. */
export interface RandomState {
  rngState: number;
}

const RANGE = 0x100000000;

export function nextUint32(state: RandomState): number {
  state.rngState = (Math.imul(1664525, state.rngState) + 1013904223) >>> 0;
  // An invertible mixing permutation avoids exposing the LCG's short low-bit cycles.
  let value = state.rngState;
  value = Math.imul(value ^ (value >>> 16), 0x21f0aaad);
  value = Math.imul(value ^ (value >>> 15), 0x735a2d97);
  return (value ^ (value >>> 15)) >>> 0;
}

export function randomInt(state: RandomState, upperExclusive: number): number {
  if (!Number.isInteger(upperExclusive) || upperExclusive < 1 || upperExclusive > RANGE)
    throw new RangeError('Invalid random bound');
  const limit = RANGE - (RANGE % upperExclusive);
  let value: number;
  do {
    value = nextUint32(state);
  } while (value >= limit);
  return value % upperExclusive; // Rejection above eliminates modulo bias.
}

export function shuffled<T>(items: readonly T[], state: RandomState): T[] {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = randomInt(state, i + 1);
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

export function freshSeed(): number {
  return crypto.getRandomValues(new Uint32Array(1))[0];
}

export function randomId(): string {
  return Array.from(crypto.getRandomValues(new Uint8Array(16)), (byte) =>
    byte.toString(16).padStart(2, '0'),
  ).join('');
}
