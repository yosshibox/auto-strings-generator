import type { ExtensionContext } from "@ableton-extensions/sdk";
import modalInterface from "./dialog.html";
import type { DialogResult, TrackChoice } from "./dialogTypes";

export async function showStringArrangerDialog(
  context: ExtensionContext<"1.0.0">,
  tracks: TrackChoice[],
  preferred?: {
    topTrackIndex?: number;
    chordTrackIndex?: number;
    sourceMode?: DialogResult["sourceMode"];
  },
): Promise<DialogResult | null> {
  const html = modalInterface
    .replace("__TRACKS__", JSON.stringify(tracks))
    .replace("__PREFERRED__", JSON.stringify(preferred ?? {}));
  const result = await context.ui.showModalDialog(`data:text/html,${encodeURIComponent(html)}`, 520, 520);
  if (!result) return null;
  return JSON.parse(result) as DialogResult;
}
