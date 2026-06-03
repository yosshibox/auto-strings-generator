export type MidiNote = {
  pitch: number;
  startTime: number;
  duration: number;
  velocity?: number;
  muted?: boolean;
  probability?: number;
  velocityDeviation?: number;
  releaseVelocity?: number;
  selected?: boolean;
};

export type VoiceName = "violin1" | "violin2" | "viola" | "cello";

export type PitchRange = {
  min: number;
  max: number;
};

export type ChordQuality = "maj" | "min" | "dim" | "aug" | "sus" | "unknown";

export type ChordEvent = {
  startTime: number;
  endTime: number;
  rawPitches: number[];
  pitchClasses: number[];
  bassPitch: number;
  rootPitchClass?: number;
  quality?: ChordQuality;
};

export type TopNoteEvent = {
  startTime: number;
  endTime: number;
  pitch: number;
  velocity?: number;
};

export type Voicing = {
  violin1: number;
  violin2: number;
  viola: number;
  cello: number;
  score: number;
  reasons: string[];
};

export type OutputMode = "fourTracks" | "singleTrack";
export type RhythmMode = "topRhythmFollow" | "chordBlock";
export type TopNoteHandling = "fixed" | "allowTension" | "snapToChord";
export type BassMode = "originalBass" | "rootBass" | "smoothBass";
export type InnerVoiceMode = "smooth" | "close" | "open";

export type StringArrangementOptions = {
  outputMode?: OutputMode;
  rhythmMode: RhythmMode;
  topNoteHandling: TopNoteHandling;
  bassMode: BassMode;
  innerVoiceMode?: InnerVoiceMode;
  avoidParallelPerfects: boolean;
  legatoOverlapBeats: number;
  velocityHumanize: number;
};

export type CounterMelodyOptions = {
  range: PitchRange;
};

export type VoiceOutput = Record<VoiceName, MidiNote[]>;

export type DialogOptions = StringArrangementOptions & {
  outputMode: OutputMode;
  innerVoiceMode: InnerVoiceMode;
};
