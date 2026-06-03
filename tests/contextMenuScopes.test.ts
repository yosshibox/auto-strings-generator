import { describe, expect, it } from "vitest";
import { MENU_REGISTRATIONS } from "../src/contextMenus";

describe("context menu registrations", () => {
  it("registers actions for session clip slots as well as arrangement clips", () => {
    const scopes = MENU_REGISTRATIONS.map(([scope]) => scope);

    expect(scopes).toContain("ClipSlot");
    expect(scopes).toContain("MidiClip");
    expect(scopes).toContain("MidiTrack.ArrangementSelection");
  });
});
