import { isChordTone, nearestPitchForPitchClass, pitchClass } from "../music/pitch";
import type { ChordEvent, MidiNote, PitchRange } from "../music/types";

function chordAt(time: number, chords: ChordEvent[]): ChordEvent | undefined {
  return chords.find((chord) => time >= chord.startTime && time < chord.endTime) ?? chords[chords.length - 1];
}

function avoidClash(candidate: number, sourcePitch: number): number {
  const interval = Math.abs(candidate - sourcePitch) % 12;
  if (interval === 1 || interval === 11 || interval === 6) return candidate - 2;
  return candidate;
}

function clampToRange(pitch: number, range: PitchRange): number {
  while (pitch < range.min) pitch += 12;
  while (pitch > range.max) pitch -= 12;
  return Math.min(range.max, Math.max(range.min, pitch));
}

function candidateFor(time: number, source: MidiNote, chords: ChordEvent[], range: PitchRange, previous?: number): number {
  const chord = chordAt(time, chords);
  const target = previous == null ? source.pitch - 9 : previous + (source.pitch >= previous ? -2 : 2);
  const preferredPc = chord?.pitchClasses.find((pc) => {
    const p = nearestPitchForPitchClass(pc, target, range.min, range.max);
    const interval = Math.abs(p - source.pitch) % 12;
    return interval === 3 || interval === 4 || interval === 8 || interval === 9;
  });

  let candidate = preferredPc == null ? target : nearestPitchForPitchClass(preferredPc, target, range.min, range.max);
  candidate = avoidClash(candidate, source.pitch);
  candidate = clampToRange(candidate, range);

  if (chord && !isChordTone(candidate, chord.pitchClasses) && Math.abs(time - Math.round(time)) < 0.001) {
    candidate = nearestPitchForPitchClass(chord.pitchClasses[0]!, candidate, range.min, range.max);
  }

  return candidate;
}

export function generateCounterMelody(sourceMelody: MidiNote[], chords: ChordEvent[] = [], range: PitchRange = { min: 55, max: 79 }): MidiNote[] {
  const sorted = sourceMelody
    .filter((note) => !note.muted)
    .sort((a, b) => a.startTime - b.startTime || a.pitch - b.pitch);
  const out: MidiNote[] = [];
  let previousPitch: number | undefined;

  for (const source of sorted) {
    const parts = source.duration >= 2 ? Math.min(4, Math.max(2, Math.floor(source.duration))) : 1;
    const duration = source.duration / parts;
    for (let i = 0; i < parts; i += 1) {
      const startTime = source.startTime + duration * i;
      const pitch = candidateFor(startTime, source, chords, range, previousPitch);
      out.push({
        pitch: pitchClass(pitch) === pitchClass(source.pitch) ? clampToRange(pitch - 3, range) : pitch,
        startTime,
        duration,
        velocity: Math.max(1, (source.velocity ?? 80) - 8),
      });
      previousPitch = out[out.length - 1]!.pitch;
    }
  }

  return out;
}
