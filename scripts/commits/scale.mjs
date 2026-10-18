// Log scale of the lines-by-quarter chart. The axis sits at the floor,
// so a quarter at or below it has no bar.
export const FLOOR = 100;

// Bar height in px: zero up to the floor, then perDecade px for every tenfold.
export function logHeight(value, floor, perDecade) {
  return value > floor ? Math.log10(value / floor) * perDecade : 0;
}

// Floor, then powers of ten up to the first one that covers max; never less than one decade.
export function logTicks(floor, max) {
  const ticks = [floor];
  while (ticks.at(-1) < max || ticks.length < 2) ticks.push(ticks.at(-1) * 10);
  return ticks;
}
