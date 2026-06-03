import type { PitchRange, VoiceName } from "./types";

export const STRING_RANGES: Record<VoiceName, PitchRange> = {
  violin1: { min: 60, max: 96 },
  violin2: { min: 55, max: 88 },
  viola: { min: 48, max: 79 },
  cello: { min: 36, max: 67 },
};

export const DEFAULT_COUNTER_MELODY_RANGE: PitchRange = {
  min: STRING_RANGES.violin2.min,
  max: STRING_RANGES.violin2.max,
};
