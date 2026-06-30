import { describe, expect, it } from "vitest";
import { MENU_REGISTRATIONS } from "../src/contextMenus";

describe("context menu registrations", () => {
  it("registers only scopes that the extension handles directly", () => {
    expect(MENU_REGISTRATIONS).toEqual([
      ["MidiTrack.ArrangementSelection", "Generate 4-Part Strings", "toplineStringArranger.generateFourPartStrings"],
      ["MidiClip", "Generate 4-Part Strings", "toplineStringArranger.generateFourPartStringsFromClip"],
    ]);
  });
});
