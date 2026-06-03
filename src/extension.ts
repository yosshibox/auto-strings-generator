import {
  ClipSlot,
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
  CONVERT_NEGATIVE_HARMONY_CLIP,
  GENERATE_COUNTER_CLIP,
  GENERATE_COUNTER_SELECTION,
  GENERATE_FOUR_PART,
  GENERATE_FOUR_PART_FROM_CLIP,
  MENU_REGISTRATIONS,
} from "./contextMenus";
import { generateCounterMelody } from "./generators/generateCounterMelody";
import { generateFourPartStrings } from "./generators/generateFourPartStrings";
import { getMidiTracks, getPreferredAutoStringTrackIndices, midiTrackChoices } from "./live/getTracks";
import { arrangementMidiNoteRange, readArrangementMidiNotes, readClipMidiNotes } from "./live/readMidi";
import { selectedMidiTracks } from "./live/selection";
import { writeFourTrackOutput } from "./live/writeMidi";
import { groupChordEvents } from "./music/chordGrouping";
import { applyNegativeHarmonyToNotes, inferNegativeHarmonyKeyCenter } from "./music/negativeHarmony";
import { DEFAULT_COUNTER_MELODY_RANGE } from "./music/ranges";
import { extractTopNotes } from "./music/topNotes";
import type { DialogOptions, MidiNote } from "./music/types";
import { showNegativeHarmonyDialog, showStringArrangerDialog } from "./ui/dialog";
import { DEFAULT_DIALOG_OPTIONS } from "./ui/dialogTypes";

function assertSelectionHasNotes(notes: unknown[], label: string): void {
  if (notes.length === 0) throw new Error(`${label} has no MIDI notes in the selected range.`);
}

function clipRelativeNotes(notes: MidiNote[], clipStartTime: number): MidiNote[] {
  return notes.map((note) => ({
    ...note,
    startTime: Math.max(0, note.startTime - clipStartTime),
  }));
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

async function generateFourPartForRange(
  context: ExtensionContext<"1.0.0">,
  song: Song<"1.0.0">,
  topTrack: MidiTrack<"1.0.0">,
  chordTrack: MidiTrack<"1.0.0">,
  startTime: number,
  endTime: number,
  options: DialogOptions,
): Promise<void> {
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
    await writeFourTrackOutput(context, song, output, startTime, endTime);

    await update("Done", 100);
  });
}

export function activate(activation: ActivationContext) {
  const context = initialize(activation, "1.0.0");

  console.log("Activating Auto Strings Generator");
  for (const [scope, title, commandId] of MENU_REGISTRATIONS) {
    registerMenu(context, scope, title, commandId);
  }

  context.commands.registerCommand(GENERATE_FOUR_PART, async (arg: unknown) => {
    const selection = arg as ArrangementSelection;
    const song = context.application.song;
    const allMidiTracks = getMidiTracks(song.tracks);
    const choices = midiTrackChoices(allMidiTracks);
    if (choices.length < 2) throw new Error("Need at least two MIDI tracks: Top Note Track and Chord Notes Track.");
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

  context.commands.registerCommand(GENERATE_FOUR_PART_FROM_CLIP, async (arg: unknown) => {
    const clipHandle = arg as Handle;
    const object = context.getObjectFromHandle(clipHandle, DataModelObject);
    const isClipSlot = object instanceof ClipSlot;
    const clip = object instanceof MidiClip ? object : isClipSlot && object.clip instanceof MidiClip ? object.clip : null;
    if (!clip) throw new Error("Selected object is not a MIDI clip.");

    const song = context.application.song;
    const allMidiTracks = getMidiTracks(song.tracks);
    const preferred = getPreferredAutoStringTrackIndices(allMidiTracks);
    const topTrack = allMidiTracks.find((entry) => entry.index === preferred.topTrackIndex)?.track;
    const chordTrack = allMidiTracks.find((entry) => entry.index === preferred.chordTrackIndex)?.track;
    if (!topTrack) throw new Error("MIDI track named autoStrings_top was not found.");
    if (!chordTrack) throw new Error("MIDI track named autoStrings_chord was not found.");
    const range = isClipSlot ? arrangementMidiNoteRange(topTrack, chordTrack) : { startTime: clip.startTime, endTime: clip.endTime };
    if (!range) throw new Error("No MIDI notes were found in autoStrings_top or autoStrings_chord.");

    await generateFourPartForRange(
      context,
      song,
      topTrack,
      chordTrack,
      range.startTime,
      range.endTime,
      DEFAULT_DIALOG_OPTIONS,
    );
  });

  context.commands.registerCommand(GENERATE_COUNTER_SELECTION, async (arg: unknown) => {
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
      song.createMidiTrack().then(async (outputTrack) => {
      outputTrack.name = "Generated Counter Melody";
      const clip = await outputTrack.createMidiClip(
        selection.time_selection_start,
        selection.time_selection_end - selection.time_selection_start,
      );
      clip.notes = counter.map((note) => ({ ...note, startTime: note.startTime - selection.time_selection_start }));
      }),
    );
  });

  context.commands.registerCommand(GENERATE_COUNTER_CLIP, async (arg: unknown) => {
    const clipHandle = arg as Handle;
    const object = context.getObjectFromHandle(clipHandle, DataModelObject);
    const clip = object instanceof MidiClip ? object : object instanceof ClipSlot && object.clip instanceof MidiClip ? object.clip : null;
    if (!clip) throw new Error("Selected object is not a MIDI clip.");

    const song = context.application.song;
    const sourceNotes = readClipMidiNotes(clip);
    assertSelectionHasNotes(sourceNotes, "Source MIDI Clip");
    const counter = generateCounterMelody(sourceNotes, [], DEFAULT_COUNTER_MELODY_RANGE);

    await context.withinTransaction(() =>
      song.createMidiTrack().then(async (outputTrack) => {
      outputTrack.name = "Generated Counter Melody";
      const outputClip = await outputTrack.createMidiClip(clip.startTime, clip.duration);
      outputClip.notes = counter.map((note) => ({ ...note, startTime: note.startTime - clip.startTime }));
      }),
    );
  });

  context.commands.registerCommand(CONVERT_NEGATIVE_HARMONY_CLIP, async (arg: unknown) => {
    const clipHandle = arg as Handle;
    const object = context.getObjectFromHandle(clipHandle, DataModelObject);
    const clip = object instanceof MidiClip ? object : object instanceof ClipSlot && object.clip instanceof MidiClip ? object.clip : null;
    if (!clip) throw new Error("Selected object is not a MIDI clip.");

    const sourceNotes = readClipMidiNotes(clip);
    assertSelectionHasNotes(sourceNotes, "Source MIDI Clip");
    const inferredKeyCenter = inferNegativeHarmonyKeyCenter(sourceNotes, clip.startTime, clip.endTime);
    const dialogResult = await showNegativeHarmonyDialog(context, inferredKeyCenter);
    if (!dialogResult) return;

    const converted = applyNegativeHarmonyToNotes(sourceNotes, dialogResult.tonicPitchClass);
    await context.withinTransaction(() => {
      clip.notes = clipRelativeNotes(converted, clip.startTime);
    });
  });
}
