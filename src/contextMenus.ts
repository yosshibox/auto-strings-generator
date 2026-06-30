import type { ContextMenuScope } from "@ableton-extensions/sdk";

export const GENERATE_FOUR_PART = "toplineStringArranger.generateFourPartStrings";
export const GENERATE_FOUR_PART_FROM_CLIP = "toplineStringArranger.generateFourPartStringsFromClip";
export const GENERATE_COUNTER_SELECTION = "toplineStringArranger.generateCounterMelody";
export const GENERATE_COUNTER_CLIP = "toplineStringArranger.generateCounterMelodyFromClip";

export const MENU_REGISTRATIONS = [
  ["MidiTrack.ArrangementSelection", "Generate 4-Part Strings", GENERATE_FOUR_PART],
  ["MidiClip", "Generate 4-Part Strings", GENERATE_FOUR_PART_FROM_CLIP],
] as const satisfies readonly (readonly [ContextMenuScope<"1.0.0">, string, string])[];
