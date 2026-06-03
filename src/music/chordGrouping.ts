import type { ChordEvent, MidiNote } from "./types";
import { uniquePitchClasses } from "./pitch";

export const CHORD_START_TOLERANCE_BEATS = 0.125;

export function groupChordEvents(
  notes: MidiNote[],
  selectionStart: number,
  selectionEnd: number,
  toleranceBeats = CHORD_START_TOLERANCE_BEATS,
): ChordEvent[] {
  const active = notes
    .filter((note) => !note.muted)
    .filter((note) => note.startTime < selectionEnd && note.startTime + note.duration > selectionStart)
    .sort((a, b) => a.startTime - b.startTime || a.pitch - b.pitch);

  const groups: MidiNote[][] = [];
  for (const note of active) {
    const last = groups[groups.length - 1];
    if (!last) {
      groups.push([note]);
      continue;
    }

    const anchor = last[0]!.startTime;
    if (Math.abs(note.startTime - anchor) <= toleranceBeats) {
      last.push(note);
    } else {
      groups.push([note]);
    }
  }

  return groups
    .map((group, index): ChordEvent => {
      const rawPitches = group.map((note) => note.pitch).sort((a, b) => a - b);
      const startTime = Math.max(selectionStart, Math.min(...group.map((note) => note.startTime)));
      const next = groups[index + 1];
      const nextStart = next ? Math.min(...next.map((note) => note.startTime)) : selectionEnd;

      return {
        startTime,
        endTime: Math.min(selectionEnd, nextStart),
        rawPitches,
        pitchClasses: uniquePitchClasses(rawPitches),
        bassPitch: rawPitches[0]!,
        quality: "unknown",
      };
    })
    .filter((chord) => chord.endTime > chord.startTime && chord.pitchClasses.length >= 2);
}
