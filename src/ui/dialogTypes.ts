import type { DialogOptions } from "../music/types";

export type TrackChoice = {
  index: number;
  name: string;
};

export type DialogResult = DialogOptions & {
  action: "generate";
  topTrackIndex: number;
  chordTrackIndex: number;
};

export type NegativeHarmonyDialogResult = {
  action: "convert";
  tonicPitchClass: number;
  keyName: string;
};

export const DEFAULT_DIALOG_OPTIONS: DialogOptions = {
  outputMode: "fourTracks",
  rhythmMode: "topRhythmFollow",
  topNoteHandling: "fixed",
  bassMode: "originalBass",
  innerVoiceMode: "smooth",
  avoidParallelPerfects: true,
  legatoOverlapBeats: 0,
  velocityHumanize: 0,
};
