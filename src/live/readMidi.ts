import { MidiClip, MidiTrack } from "@ableton-extensions/sdk";
import type { MidiNote } from "../music/types";

function overlaps(startA: number, endA: number, startB: number, endB: number): boolean {
  return startA < endB && endA > startB;
}

export function readArrangementMidiNotes(
  track: MidiTrack<"1.0.0">,
  selectionStart: number,
  selectionEnd: number,
): MidiNote[] {
  const notes: MidiNote[] = [];

  for (const clip of track.arrangementClips) {
    if (!(clip instanceof MidiClip)) continue;
    if (!overlaps(clip.startTime, clip.endTime, selectionStart, selectionEnd)) continue;

    for (const note of clip.notes) {
      const absoluteStart = clip.startTime + note.startTime;
      const absoluteEnd = absoluteStart + note.duration;
      if (!overlaps(absoluteStart, absoluteEnd, selectionStart, selectionEnd)) continue;
      notes.push({
        ...note,
        startTime: absoluteStart,
      });
    }
  }

  return notes.sort((a, b) => a.startTime - b.startTime || a.pitch - b.pitch);
}

export function readClipMidiNotes(clip: MidiClip<"1.0.0">): MidiNote[] {
  return clip.notes.map((note) => ({ ...note, startTime: clip.startTime + note.startTime }));
}

export function arrangementMidiNoteRange(
  ...tracks: MidiTrack<"1.0.0">[]
): { startTime: number; endTime: number } | null {
  let startTime = Number.POSITIVE_INFINITY;
  let endTime = Number.NEGATIVE_INFINITY;

  for (const track of tracks) {
    for (const clip of track.arrangementClips) {
      if (!(clip instanceof MidiClip)) continue;
      let hasUnmutedNote = false;
      for (const note of clip.notes) {
        if (note.muted) continue;
        hasUnmutedNote = true;
        const noteStart = clip.startTime + note.startTime;
        startTime = Math.min(startTime, noteStart);
      }
      if (hasUnmutedNote) endTime = Math.max(endTime, clip.endTime);
    }
  }

  if (!Number.isFinite(startTime) || !Number.isFinite(endTime) || endTime <= startTime) return null;
  return { startTime, endTime };
}
