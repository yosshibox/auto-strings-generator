import type { MidiNote, VoiceName, VoiceOutput } from "../music/types";

const START_TOLERANCE_BEATS = 0.001;
const VOICES: VoiceName[] = ["violin1", "violin2", "viola", "cello"];

function inRange(note: MidiNote, startTime: number, endTime: number): boolean {
  return !note.muted && note.startTime < endTime && note.startTime + note.duration > startTime;
}

function isActiveAt(note: MidiNote, time: number, toleranceBeats: number): boolean {
  return note.startTime <= time + toleranceBeats && note.startTime + note.duration > time + toleranceBeats;
}

function selectStringVoices(activeAtStart: MidiNote[]): MidiNote[] {
  if (activeAtStart.length === 4) return activeAtStart;
  return [activeAtStart[0]!, activeAtStart[1]!, activeAtStart[2]!, activeAtStart[activeAtStart.length - 1]!];
}

export function splitFourVoiceClip(
  notes: MidiNote[],
  startTime: number,
  endTime: number,
  toleranceBeats = START_TOLERANCE_BEATS,
): VoiceOutput {
  const output: VoiceOutput = { violin1: [], violin2: [], viola: [], cello: [] };
  const active = notes
    .filter((note) => inRange(note, startTime, endTime))
    .sort((a, b) => a.startTime - b.startTime || b.pitch - a.pitch);

  if (active.length === 0) {
    throw new Error("Selected clip has no MIDI notes in its clip range.");
  }

  for (const note of active) {
    const activeAtStart = active
      .filter((candidate) => inRange(candidate, startTime, endTime))
      .filter((candidate) => isActiveAt(candidate, note.startTime, toleranceBeats))
      .sort((a, b) => b.pitch - a.pitch || a.startTime - b.startTime);

    if (activeAtStart.length < 4) {
      throw new Error(`Expected at least 4 notes active at beat ${note.startTime}, but found ${activeAtStart.length}.`);
    }

    const stringVoices = selectStringVoices(activeAtStart);
    const voiceIndex = stringVoices.indexOf(note);
    if (voiceIndex < 0) continue;
    output[VOICES[voiceIndex]!].push({ ...note });
  }

  return output;
}
