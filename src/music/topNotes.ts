import type { MidiNote, TopNoteEvent } from "./types";

export function extractTopNotes(
  notes: MidiNote[],
  selectionStart: number,
  selectionEnd: number,
  toleranceBeats = 0.03,
): TopNoteEvent[] {
  const active = notes
    .filter((note) => !note.muted)
    .filter((note) => note.startTime < selectionEnd && note.startTime + note.duration > selectionStart)
    .map((note) => ({
      ...note,
      startTime: Math.max(selectionStart, note.startTime),
      duration: Math.min(selectionEnd, note.startTime + note.duration) - Math.max(selectionStart, note.startTime),
    }))
    .filter((note) => note.duration > 0)
    .sort((a, b) => a.startTime - b.startTime || b.pitch - a.pitch);

  const grouped: MidiNote[][] = [];
  for (const note of active) {
    const last = grouped[grouped.length - 1];
    if (!last) {
      grouped.push([note]);
      continue;
    }
    const anchor = last[0]!.startTime;
    if (Math.abs(note.startTime - anchor) <= toleranceBeats) {
      last.push(note);
    } else {
      grouped.push([note]);
    }
  }

  return grouped.map((group) => {
    const selected = group.sort((a, b) => b.pitch - a.pitch || b.duration - a.duration)[0]!;
    const event: TopNoteEvent = {
      pitch: selected.pitch,
      startTime: selected.startTime,
      endTime: selected.startTime + selected.duration,
    };
    if (selected.velocity != null) event.velocity = selected.velocity;
    return event;
  });
}
