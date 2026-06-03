import { DataModelObject, MidiTrack, TakeLane, Track } from "@ableton-extensions/sdk";
import type { ArrangementSelection, ExtensionContext } from "@ableton-extensions/sdk";

export function selectedMidiTracks(
  context: ExtensionContext<"1.0.0">,
  selection: ArrangementSelection,
): MidiTrack<"1.0.0">[] {
  const out: MidiTrack<"1.0.0">[] = [];
  for (const handle of selection.selected_lanes) {
    const object = context.getObjectFromHandle(handle, DataModelObject);
    if (object instanceof MidiTrack) {
      out.push(object);
    } else if (object instanceof TakeLane && object.parent instanceof MidiTrack) {
      out.push(object.parent);
    } else if (object instanceof Track && object instanceof MidiTrack) {
      out.push(object);
    }
  }
  return Array.from(new Set(out));
}
