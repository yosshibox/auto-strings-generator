import {
  DataModelObject,
  MidiClip,
  MidiTrack,
  initialize,
  type ActivationContext,
  type ArrangementSelection,
  type ContextMenuScope,
  type ExtensionContext,
  type Handle,
  type Song,
} from "@ableton-extensions/sdk";
import {
  GENERATE_COUNTER_CLIP,
  GENERATE_COUNTER_SELECTION,
  GENERATE_FOUR_PART,
  GENERATE_FOUR_PART_FROM_CLIP,
  MENU_REGISTRATIONS,
} from "./contextMenus";
import { generateCounterMelody } from "./generators/generateCounterMelody";
import { generateFourPartStrings } from "./generators/generateFourPartStrings";
import { splitFourVoiceClip } from "./generators/splitFourVoiceClip";
import { getMidiTracks, getPreferredAutoStringTrackIndices, midiTrackChoices } from "./live/getTracks";
import { readArrangementMidiNotes, readClipMidiNotes } from "./live/readMidi";
import { selectedMidiTracks } from "./live/selection";
import { writeVoiceOutput } from "./live/writeMidi";
import { groupChordEvents } from "./music/chordGrouping";
import { DEFAULT_COUNTER_MELODY_RANGE } from "./music/ranges";
import { extractTopNotes } from "./music/topNotes";
import type { DialogOptions } from "./music/types";
import { showStringArrangerDialog } from "./ui/dialog";
import { DEFAULT_DIALOG_OPTIONS } from "./ui/dialogTypes";
import { showErrorDialog } from "./ui/errorDialog";

function assertSelectionHasNotes(notes: unknown[], label: string): void {
  if (notes.length === 0) throw new Error(`${label} has no MIDI notes in the selected range.`);
}

function registerMenu(
  context: ExtensionContext<"1.0.0">,
  scope: ContextMenuScope<"1.0.0">,
  title: string,
  commandId: string,
): void {
  void context.ui.registerContextMenuAction(scope, title, commandId)
    .then(() => console.log(`Registered context menu: ${scope} -> ${title}`))
    .catch((error: unknown) => console.error(`Failed to register context menu: ${scope} -> ${title}`, error));
}

function registerLoggedCommand(
  context: ExtensionContext<"1.0.0">,
  commandId: string,
  handler: (arg: unknown) => Promise<void>,
): void {
  context.commands.registerCommand(commandId, (arg: unknown) => {
    void handler(arg).catch((error: unknown) => {
      console.error(`Command failed: ${commandId}`, error);
      void showErrorDialog(context, "Auto Strings Generator", errorMessage(error)).catch((dialogError: unknown) => {
        console.error(`Failed to show error dialog: ${commandId}`, dialogError);
      });
    });
  });
}

function errorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  return String(error);
}

function assertArrangementMidiClip(clip: MidiClip<"1.0.0">): void {
  if (!(clip.parent instanceof MidiTrack)) {
    throw new Error("Only Arrangement MIDI clips are supported. Session clips are not supported yet.");
  }
}

async function generateFourPartForRange(
  context: ExtensionContext<"1.0.0">,
  song: Song<"1.0.0">,
  topTrack: MidiTrack<"1.0.0">,
  chordTrack: MidiTrack<"1.0.0">,
  startTime: number,
  endTime: number,
  options: DialogOptions,
): Promise<void> {
  if (topTrack === chordTrack) {
    throw new Error("Choose different MIDI tracks for Top Note Track and Chord Notes Track.");
  }

  await context.ui.withinProgressDialog("Generate 4-Part Strings", { progress: 0 }, async (update, abortSignal) => {
    await update("Reading MIDI notes", 15);
    abortSignal.throwIfAborted();

    const topNotesRaw = readArrangementMidiNotes(topTrack, startTime, endTime);
    const chordNotesRaw = readArrangementMidiNotes(chordTrack, startTime, endTime);
    assertSelectionHasNotes(topNotesRaw, "Top Note Track");
    assertSelectionHasNotes(chordNotesRaw, "Chord Notes Track");

    await update("Analysing harmony", 35);
    abortSignal.throwIfAborted();
    const topNotes = extractTopNotes(topNotesRaw, startTime, endTime);
    const chords = groupChordEvents(chordNotesRaw, startTime, endTime);
    if (chords.length === 0) throw new Error("Chord Notes Track did not contain usable chord events.");

    await update("Generating voicings", 65);
    abortSignal.throwIfAborted();
    const output = generateFourPartStrings(topNotes, chords, options);
    const totalNotes = Object.values(output).reduce((sum, notes) => sum + notes.length, 0);
    if (totalNotes === 0) throw new Error("No valid string voicing candidates were generated.");

    await update("Writing generated tracks", 90);
    abortSignal.throwIfAborted();
    await writeVoiceOutput(context, song, output, startTime, endTime, options.outputMode);

    await update("Done", 100);
  });
}

export function activate(activation: ActivationContext) {
  const context = initialize(activation, "1.0.0");

  console.log("Activating Auto Strings Generator");
  for (const [scope, title, commandId] of MENU_REGISTRATIONS) {
    registerMenu(context, scope, title, commandId);
  }

  registerLoggedCommand(context, GENERATE_FOUR_PART, async (arg: unknown) => {
    const selection = arg as ArrangementSelection;
    const song = context.application.song;
    const allMidiTracks = getMidiTracks(song.tracks);
    const choices = midiTrackChoices(allMidiTracks);
    if (choices.length === 0) throw new Error("Need at least one MIDI track.");
    const preferred = getPreferredAutoStringTrackIndices(allMidiTracks);

    const dialogResult = await showStringArrangerDialog(context, choices, preferred);
    if (!dialogResult) return;

    const topTrack = allMidiTracks.find((entry) => entry.index === dialogResult.topTrackIndex)?.track;
    const chordTrack = allMidiTracks.find((entry) => entry.index === dialogResult.chordTrackIndex)?.track;
    if (!topTrack) throw new Error("Top Note Track was not found.");
    if (!chordTrack) throw new Error("Chord Notes Track was not found.");

    await generateFourPartForRange(
      context,
      song,
      topTrack,
      chordTrack,
      selection.time_selection_start,
      selection.time_selection_end,
      dialogResult,
    );
  });

  registerLoggedCommand(context, GENERATE_FOUR_PART_FROM_CLIP, async (arg: unknown) => {
    const clipHandle = arg as Handle;
    const object = context.getObjectFromHandle(clipHandle, DataModelObject);
    const clip = object instanceof MidiClip ? object : null;
    if (!clip) throw new Error("Selected object is not a MIDI clip.");
    assertArrangementMidiClip(clip);

    const song = context.application.song;
    const allMidiTracks = getMidiTracks(song.tracks);
    const choices = midiTrackChoices(allMidiTracks);
    if (choices.length < 2) throw new Error("Need at least two MIDI tracks: Top Note Track and Chord Notes Track.");

    const preferred = getPreferredAutoStringTrackIndices(allMidiTracks);
    const clipTrackIndex = allMidiTracks.find((entry) => entry.track === clip.parent)?.index;
    const clipPreferred: {
      topTrackIndex?: number;
      chordTrackIndex?: number;
      sourceMode?: DialogOptions["sourceMode"];
    } = { ...preferred };
    clipPreferred.sourceMode = "splitExistingVoicing";
    if (clipPreferred.topTrackIndex === undefined && clipTrackIndex !== undefined) {
      clipPreferred.topTrackIndex = clipTrackIndex;
    }
    const dialogResult = await showStringArrangerDialog(context, choices, clipPreferred);
    if (!dialogResult) return;

    if (dialogResult.sourceMode === "splitExistingVoicing") {
      const output = splitFourVoiceClip(readClipMidiNotes(clip), clip.startTime, clip.endTime);
      await writeVoiceOutput(context, song, output, clip.startTime, clip.endTime, dialogResult.outputMode);
      return;
    }

    if (choices.length < 2) throw new Error("Need at least two MIDI tracks: Top Note Track and Chord Notes Track.");
    const topTrack = allMidiTracks.find((entry) => entry.index === dialogResult.topTrackIndex)?.track;
    const chordTrack = allMidiTracks.find((entry) => entry.index === dialogResult.chordTrackIndex)?.track;
    if (!topTrack) throw new Error("Top Note Track was not found.");
    if (!chordTrack) throw new Error("Chord Notes Track was not found.");

    await generateFourPartForRange(
      context,
      song,
      topTrack,
      chordTrack,
      clip.startTime,
      clip.endTime,
      dialogResult,
    );
  });

  registerLoggedCommand(context, GENERATE_COUNTER_SELECTION, async (arg: unknown) => {
    const selection = arg as ArrangementSelection;
    const song = context.application.song;
    const tracks = selectedMidiTracks(context, selection);
    const sourceTrack = tracks[0];
    const chordTrack = tracks[1];
    if (!sourceTrack) throw new Error("Need a selected MIDI track for counter melody generation.");

    const sourceNotes = readArrangementMidiNotes(sourceTrack, selection.time_selection_start, selection.time_selection_end);
    assertSelectionHasNotes(sourceNotes, "Source Melody Track");
    const chordNotes = chordTrack ? readArrangementMidiNotes(chordTrack, selection.time_selection_start, selection.time_selection_end) : [];
    const chords = groupChordEvents(chordNotes, selection.time_selection_start, selection.time_selection_end);
    const counter = generateCounterMelody(sourceNotes, chords, DEFAULT_COUNTER_MELODY_RANGE);

    await context.withinTransaction(() =>
      song.createMidiTrack().then((outputTrack) => {
        outputTrack.name = "Generated Counter Melody";
        return outputTrack.createMidiClip(
          selection.time_selection_start,
          selection.time_selection_end - selection.time_selection_start,
        ).then((clip) => {
          clip.notes = counter.map((note) => ({ ...note, startTime: note.startTime - selection.time_selection_start }));
        });
      }),
    );
  });

  registerLoggedCommand(context, GENERATE_COUNTER_CLIP, async (arg: unknown) => {
    const clipHandle = arg as Handle;
    const object = context.getObjectFromHandle(clipHandle, DataModelObject);
    const clip = object instanceof MidiClip ? object : null;
    if (!clip) throw new Error("Selected object is not a MIDI clip.");
    assertArrangementMidiClip(clip);

    const song = context.application.song;
    const sourceNotes = readClipMidiNotes(clip);
    assertSelectionHasNotes(sourceNotes, "Source MIDI Clip");
    const counter = generateCounterMelody(sourceNotes, [], DEFAULT_COUNTER_MELODY_RANGE);

    await context.withinTransaction(() =>
      song.createMidiTrack().then((outputTrack) => {
        outputTrack.name = "Generated Counter Melody";
        return outputTrack.createMidiClip(clip.startTime, clip.duration).then((outputClip) => {
          outputClip.notes = counter.map((note) => ({ ...note, startTime: note.startTime - clip.startTime }));
        });
      }),
    );
  });
}
