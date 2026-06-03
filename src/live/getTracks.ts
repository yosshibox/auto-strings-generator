import { MidiTrack, Track } from "@ableton-extensions/sdk";
import type { TrackChoice } from "../ui/dialogTypes";

export type MidiTrackWithIndex = {
  index: number;
  track: MidiTrack<"1.0.0">;
};

export const AUTO_STRINGS_TOP_TRACK_NAME = "autoStrings_top";
export const AUTO_STRINGS_CHORD_TRACK_NAME = "autoStrings_chord";

export function getMidiTracks(tracks: Track<"1.0.0">[]): MidiTrackWithIndex[] {
  return tracks
    .map((track, index) => ({ track, index }))
    .filter((entry): entry is MidiTrackWithIndex => entry.track instanceof MidiTrack);
}

export function midiTrackChoices(tracks: MidiTrackWithIndex[]): TrackChoice[] {
  return tracks.map(({ index, track }) => ({
    index,
    name: track.name || `MIDI Track ${index + 1}`,
  }));
}

export function findMidiTrackByExactName(
  tracks: MidiTrackWithIndex[],
  name: string,
): MidiTrackWithIndex | undefined {
  return tracks.find((entry) => entry.track.name === name);
}

export function getPreferredAutoStringTrackIndices(tracks: MidiTrackWithIndex[]): {
  topTrackIndex?: number;
  chordTrackIndex?: number;
} {
  const top = findMidiTrackByExactName(tracks, AUTO_STRINGS_TOP_TRACK_NAME);
  const chord = findMidiTrackByExactName(tracks, AUTO_STRINGS_CHORD_TRACK_NAME);
  const out: {
    topTrackIndex?: number;
    chordTrackIndex?: number;
  } = {};

  if (top) out.topTrackIndex = top.index;
  if (chord) out.chordTrackIndex = chord.index;
  return out;
}
