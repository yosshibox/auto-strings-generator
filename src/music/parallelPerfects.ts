export function hasParallelPerfectInterval(prevA: number, prevB: number, nextA: number, nextB: number): boolean {
  const prevInterval = Math.abs(prevA - prevB) % 12;
  const nextInterval = Math.abs(nextA - nextB) % 12;
  const isPerfectPrev = prevInterval === 0 || prevInterval === 7;
  const isPerfectNext = nextInterval === 0 || nextInterval === 7;
  const motionA = nextA - prevA;
  const motionB = nextB - prevB;
  const sameDirection = Math.sign(motionA) === Math.sign(motionB) && Math.sign(motionA) !== 0;
  return isPerfectPrev && isPerfectNext && sameDirection;
}
