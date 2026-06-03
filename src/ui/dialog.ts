import type { ExtensionContext } from "@ableton-extensions/sdk";
import modalInterface from "./dialog.html";
import negativeHarmonyInterface from "./negativeHarmonyDialog.html";
import type { DialogResult, NegativeHarmonyDialogResult, TrackChoice } from "./dialogTypes";
import { FIFTH_CIRCLE_KEY_CENTERS } from "../music/negativeHarmony";

export async function showStringArrangerDialog(
  context: ExtensionContext<"1.0.0">,
  tracks: TrackChoice[],
  preferred?: {
    topTrackIndex?: number;
    chordTrackIndex?: number;
  },
): Promise<DialogResult | null> {
  const html = modalInterface
    .replace("__TRACKS__", JSON.stringify(tracks))
    .replace("__PREFERRED__", JSON.stringify(preferred ?? {}));
  const result = await context.ui.showModalDialog(`data:text/html,${encodeURIComponent(html)}`, 520, 520);
  if (!result) return null;
  return JSON.parse(result) as DialogResult;
}

export async function showNegativeHarmonyDialog(
  context: ExtensionContext<"1.0.0">,
  selectedPitchClass: number,
): Promise<NegativeHarmonyDialogResult | null> {
  const html = negativeHarmonyInterface
    .replace("__KEY_CENTERS__", JSON.stringify(FIFTH_CIRCLE_KEY_CENTERS))
    .replace("__SELECTED_PITCH_CLASS__", JSON.stringify(selectedPitchClass));
  const result = await context.ui.showModalDialog(`data:text/html,${encodeURIComponent(html)}`, 340, 370);
  if (!result) return null;
  return JSON.parse(result) as NegativeHarmonyDialogResult;
}
