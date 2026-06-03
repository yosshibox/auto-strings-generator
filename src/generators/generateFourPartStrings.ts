import { mergeAdjacentSamePitch } from "../music/noteCleanup";
import { generateVoicingCandidates } from "../music/voicing";
import type { ChordEvent, MidiNote, StringArrangementOptions, TopNoteEvent, VoiceOutput, Voicing } from "../music/types";

const DEFAULT_VELOCITY = 80;
const MIN_TOP_TO_VIOLIN2_SEMITONES = 5;
const TRAILING_SUSTAIN_MAX_EXTENSION_BEATS = 1;
const FINAL_SUSTAIN_TAIL_BEATS = 0.5;
const EPSILON_BEATS = 0.0001;

function topNotesForChord(chord: ChordEvent, topNotes: TopNoteEvent[]): TopNoteEvent[] {
  return topNotes.filter((note) => note.startTime < chord.endTime && note.endTime > chord.startTime);
}

function noteFromTop(top: TopNoteEvent, chord: ChordEvent): MidiNote {
  const startTime = Math.max(top.startTime, chord.startTime);
  const endTime = Math.min(top.endTime, chord.endTime);
  return {
    pitch: top.pitch,
    startTime,
    duration: endTime - startTime,
    velocity: top.velocity ?? DEFAULT_VELOCITY,
  };
}

function blockNote(pitch: number, chord: ChordEvent, velocity: number): MidiNote {
  return {
    pitch,
    startTime: chord.startTime,
    duration: chord.endTime - chord.startTime,
    velocity,
  };
}

function sustainTrailingNoteToEnd(notes: MidiNote[], endTime: number): MidiNote[] {
  if (notes.length === 0) return notes;
  const out = notes.map((note) => ({ ...note }));
  const last = out.reduce((latest, note) => {
    return note.startTime + note.duration > latest.startTime + latest.duration ? note : latest;
  }, out[0]!);
  const noteEnd = last.startTime + last.duration;
  const gap = endTime - noteEnd;
  if (gap > EPSILON_BEATS && gap <= TRAILING_SUSTAIN_MAX_EXTENSION_BEATS) {
    last.duration = endTime - last.startTime;
  }
  return out;
}

export function generateFourPartStrings(
  topNotes: TopNoteEvent[],
  chords: ChordEvent[],
  options: StringArrangementOptions,
): VoiceOutput {
  const outputs: VoiceOutput = { violin1: [], violin2: [], viola: [], cello: [] };
  let previous: Voicing | undefined;
  let lastGeneratedEnd: number | undefined;

  for (const chord of chords) {
    const chordTopNotes = topNotesForChord(chord, topNotes);
    if (chordTopNotes.length === 0) continue;

    const primaryTop = chordTopNotes[0]!;
    const lowestTopPitch = Math.min(...chordTopNotes.map((note) => note.pitch));
    const violin2MaxPitch = lowestTopPitch - MIN_TOP_TO_VIOLIN2_SEMITONES;
    const candidates = generateVoicingCandidates(chord, primaryTop.pitch, previous, options.avoidParallelPerfects, violin2MaxPitch);
    const selected = candidates[0];
    if (!selected) continue;

    for (const top of chordTopNotes) {
      const note = noteFromTop(top, chord);
      if (note.duration > 0) outputs.violin1.push(note);
    }

    const velocity = primaryTop.velocity ?? DEFAULT_VELOCITY;
    outputs.violin2.push(blockNote(selected.violin2, chord, Math.max(1, velocity - 5)));
    outputs.viola.push(blockNote(selected.viola, chord, Math.max(1, velocity - 8)));
    outputs.cello.push(blockNote(selected.cello, chord, Math.max(1, velocity - 6)));
    previous = selected;
    lastGeneratedEnd = chord.endTime;
  }

  const arrangementEnd = lastGeneratedEnd == null ? 0 : lastGeneratedEnd + FINAL_SUSTAIN_TAIL_BEATS;
  return {
    violin1: sustainTrailingNoteToEnd(mergeAdjacentSamePitch(outputs.violin1), arrangementEnd),
    violin2: sustainTrailingNoteToEnd(mergeAdjacentSamePitch(outputs.violin2), arrangementEnd),
    viola: sustainTrailingNoteToEnd(mergeAdjacentSamePitch(outputs.viola), arrangementEnd),
    cello: sustainTrailingNoteToEnd(mergeAdjacentSamePitch(outputs.cello), arrangementEnd),
  };
}
