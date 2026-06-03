import type { MidiNote } from "./types";

const EPSILON = 0.0001;

function canMerge(a: MidiNote, b: MidiNote): boolean {
  return (
    a.pitch === b.pitch &&
    Math.abs(a.startTime + a.duration - b.startTime) <= EPSILON &&
    a.velocity === b.velocity &&
    a.muted === b.muted
  );
}

export function mergeAdjacentSamePitch(notes: MidiNote[]): MidiNote[] {
  const sorted = [...notes].sort((a, b) => a.startTime - b.startTime || a.pitch - b.pitch);
  const out: MidiNote[] = [];

  for (const note of sorted) {
    const last = out[out.length - 1];
    if (last && canMerge(last, note)) {
      last.duration = note.startTime + note.duration - last.startTime;
    } else {
      out.push({ ...note });
    }
  }

  return out;
}
