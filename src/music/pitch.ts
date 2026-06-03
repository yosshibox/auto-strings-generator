export function pitchClass(pitch: number): number {
  return ((pitch % 12) + 12) % 12;
}

export function uniquePitchClasses(pitches: number[]): number[] {
  const seen = new Set<number>();
  const out: number[] = [];
  for (const pitch of pitches) {
    const pc = pitchClass(pitch);
    if (!seen.has(pc)) {
      seen.add(pc);
      out.push(pc);
    }
  }
  return out;
}

export function expandPitchClassToRange(pc: number, min: number, max: number): number[] {
  const normalized = pitchClass(pc);
  const out: number[] = [];
  for (let pitch = min; pitch <= max; pitch += 1) {
    if (pitchClass(pitch) === normalized) out.push(pitch);
  }
  return out;
}

export function nearestPitchForPitchClass(pc: number, target: number, min: number, max: number): number {
  const candidates = expandPitchClassToRange(pc, min, max);
  if (candidates.length === 0) return Math.min(max, Math.max(min, target));
  return candidates.sort((a, b) => Math.abs(a - target) - Math.abs(b - target))[0]!;
}

export function isChordTone(pitch: number, pitchClasses: number[]): boolean {
  return pitchClasses.includes(pitchClass(pitch));
}
