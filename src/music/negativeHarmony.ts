import { CHORD_START_TOLERANCE_BEATS, groupChordEvents } from "./chordGrouping";
import { pitchClass, uniquePitchClasses } from "./pitch";
import type { ChordEvent, MidiNote } from "./types";

export type KeyCenter = {
  name: string;
  pitchClass: number;
};

export const FIFTH_CIRCLE_KEY_CENTERS = [
  { name: "C", pitchClass: 0 },
  { name: "G", pitchClass: 7 },
  { name: "D", pitchClass: 2 },
  { name: "A", pitchClass: 9 },
  { name: "E", pitchClass: 4 },
  { name: "B", pitchClass: 11 },
  { name: "Gb", pitchClass: 6 },
  { name: "Db", pitchClass: 1 },
  { name: "Ab", pitchClass: 8 },
  { name: "Eb", pitchClass: 3 },
  { name: "Bb", pitchClass: 10 },
  { name: "F", pitchClass: 5 },
] as const satisfies readonly KeyCenter[];

const MAJOR_KEY_PROFILE = [6.35, 2.23, 3.48, 2.33, 4.38, 4.09, 2.52, 5.19, 2.39, 3.66, 2.29, 2.88];
const MINOR_KEY_PROFILE = [6.33, 2.68, 3.52, 5.38, 2.6, 3.53, 2.54, 4.75, 3.98, 2.69, 3.34, 3.17];

type IndexedNote = {
  index: number;
  note: MidiNote;
};

type VoicingCandidate = {
  pitch: number;
  cost: number;
  pitches: number[];
  usedMask: number;
};

function signedPitchClassDelta(fromPc: number, toPc: number): number {
  const delta = pitchClass(toPc - fromPc);
  return delta > 6 ? delta - 12 : delta;
}

function chordDuration(chord: ChordEvent): number {
  return Math.max(0, chord.endTime - chord.startTime);
}

function triadRootCandidates(pitchClasses: number[]): number[] {
  const pcs = new Set(uniquePitchClasses(pitchClasses));
  const candidates: number[] = [];

  for (let root = 0; root < 12; root += 1) {
    const hasRoot = pcs.has(root);
    const hasFifth = pcs.has(pitchClass(root + 7));
    const hasMajorThird = pcs.has(pitchClass(root + 4));
    const hasMinorThird = pcs.has(pitchClass(root + 3));
    if (hasRoot && hasFifth && (hasMajorThird || hasMinorThird)) candidates.push(root);
  }

  return candidates;
}

function groupNoteEntriesByOnset(notes: MidiNote[], toleranceBeats = CHORD_START_TOLERANCE_BEATS): IndexedNote[][] {
  const active = notes
    .map((note, index) => ({ index, note }))
    .filter((entry) => !entry.note.muted)
    .sort((a, b) => a.note.startTime - b.note.startTime || a.note.pitch - b.note.pitch || a.index - b.index);

  const groups: IndexedNote[][] = [];
  for (const entry of active) {
    const last = groups[groups.length - 1];
    if (!last) {
      groups.push([entry]);
      continue;
    }

    const anchor = last[0]!.note.startTime;
    if (Math.abs(entry.note.startTime - anchor) <= toleranceBeats) {
      last.push(entry);
    } else {
      groups.push([entry]);
    }
  }

  return groups;
}

function candidatePitchesForPitchClass(pc: number, minPitch: number, maxPitch: number): number[] {
  const normalized = pitchClass(pc);
  const candidates: number[] = [];
  for (let pitch = minPitch; pitch <= maxPitch; pitch += 1) {
    if (pitchClass(pitch) === normalized) candidates.push(pitch);
  }
  return candidates;
}

function chooseOrderedChordVoicing(entries: IndexedNote[], tonicPitchClass: number): Map<number, number> {
  const voices = [...entries].sort((a, b) => a.note.pitch - b.note.pitch || a.note.startTime - b.note.startTime || a.index - b.index);
  const originalPitches = voices.map((entry) => entry.note.pitch);
  const transformedPitchClasses = voices.map((entry) => negativePitchClass(entry.note.pitch, tonicPitchClass));
  const minPitch = Math.max(0, Math.min(...originalPitches) - 24);
  const maxPitch = Math.min(127, Math.max(...originalPitches) + 24);
  let previousStates: VoicingCandidate[] = [{ pitch: minPitch - 1, cost: 0, pitches: [], usedMask: 0 }];

  for (let voiceIndex = 0; voiceIndex < voices.length; voiceIndex += 1) {
    const target = voices[voiceIndex]!.note.pitch;
    const nextStates: VoicingCandidate[] = [];

    for (const previous of previousStates) {
      for (let pcIndex = 0; pcIndex < transformedPitchClasses.length; pcIndex += 1) {
        if (previous.usedMask & (1 << pcIndex)) continue;
        if (voiceIndex === 0 && pcIndex !== 0) continue;
        const pitches = candidatePitchesForPitchClass(transformedPitchClasses[pcIndex]!, minPitch, maxPitch);
        for (const pitch of pitches) {
          if (pitch <= previous.pitch) continue;
          const interval = pitch - previous.pitch;
          const wideGapPenalty = voiceIndex > 0 && interval > 12 ? (interval - 12) * 0.6 : 0;
          const identityPenalty = voiceIndex === pcIndex ? 0 : 0.2;
          nextStates.push({
            pitch,
            cost: previous.cost + Math.abs(pitch - target) + wideGapPenalty + identityPenalty,
            pitches: [...previous.pitches, pitch],
            usedMask: previous.usedMask | (1 << pcIndex),
          });
        }
      }
    }

    if (nextStates.length === 0) return new Map(voices.map((entry) => [entry.index, negativeHarmonyPitch(entry.note.pitch, tonicPitchClass)]));
    previousStates = nextStates.sort((a, b) => a.cost - b.cost).slice(0, 256);
  }

  const best = previousStates.sort((a, b) => a.cost - b.cost)[0];
  if (!best) return new Map();

  return new Map(voices.map((entry, index) => [entry.index, best.pitches[index] ?? negativeHarmonyPitch(entry.note.pitch, tonicPitchClass)]));
}

export function negativePitchClass(inputPitchClass: number, tonicPitchClass: number): number {
  return pitchClass(2 * tonicPitchClass + 7 - inputPitchClass);
}

export function negativeHarmonyPitch(pitch: number, tonicPitchClass: number): number {
  const fromPc = pitchClass(pitch);
  const toPc = negativePitchClass(fromPc, tonicPitchClass);
  return pitch + signedPitchClassDelta(fromPc, toPc);
}

export function applyNegativeHarmonyToNotes(notes: MidiNote[], tonicPitchClass: number): MidiNote[] {
  const converted = notes.map((note) => ({
    ...note,
    pitch: negativeHarmonyPitch(note.pitch, tonicPitchClass),
  }));

  for (const group of groupNoteEntriesByOnset(notes)) {
    if (group.length < 2) continue;
    const voicing = chooseOrderedChordVoicing(group, tonicPitchClass);
    for (const [index, pitch] of voicing) {
      converted[index] = { ...converted[index]!, pitch };
    }
  }

  return converted;
}

export function inferNegativeHarmonyKeyCenter(
  notes: MidiNote[],
  startTime: number,
  endTime: number,
  fallbackPitchClass = 0,
): number {
  const activeNotes = notes.filter((note) => !note.muted && note.startTime < endTime && note.startTime + note.duration > startTime);
  if (activeNotes.length === 0) return pitchClass(fallbackPitchClass);

  const pitchClassWeights = Array.from({ length: 12 }, () => 0);
  for (const note of activeNotes) {
    const overlapStart = Math.max(startTime, note.startTime);
    const overlapEnd = Math.min(endTime, note.startTime + note.duration);
    pitchClassWeights[pitchClass(note.pitch)]! += Math.max(0.1, overlapEnd - overlapStart);
  }

  const scores = Array.from({ length: 12 }, (_, tonic) => {
    let score = 0;
    for (let pc = 0; pc < 12; pc += 1) {
      const degree = pitchClass(pc - tonic);
      score += pitchClassWeights[pc]! * Math.max(MAJOR_KEY_PROFILE[degree]!, MINOR_KEY_PROFILE[degree]!);
    }
    return score;
  });

  const chords = groupChordEvents(activeNotes, startTime, endTime).filter((chord) => chord.pitchClasses.length >= 3);
  if (chords.length >= 2) {
    for (const chord of chords) {
      const duration = chordDuration(chord);
      for (const root of triadRootCandidates(chord.pitchClasses)) {
        scores[root]! += duration * 3;
      }
      scores[pitchClass(chord.bassPitch)]! += duration * 0.75;
    }

    const firstChord = chords[0]!;
    const lastChord = chords[chords.length - 1]!;
    for (const root of triadRootCandidates(firstChord.pitchClasses)) {
      scores[root]! += 2;
    }
    for (const root of triadRootCandidates(lastChord.pitchClasses)) {
      scores[root]! += 7;
      scores[pitchClass(root - 5)]! += 3;
      scores[pitchClass(root + 5)]! += 2;
    }
    scores[pitchClass(lastChord.bassPitch)]! += 2;
  }

  return scores.reduce((best, score, pc) => (score > scores[best]! ? pc : best), pitchClass(fallbackPitchClass));
}
