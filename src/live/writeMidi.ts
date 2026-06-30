import type { MidiTrack, Song } from "@ableton-extensions/sdk";
import type { ExtensionContext } from "@ableton-extensions/sdk";
import type { MidiNote, OutputMode, VoiceOutput } from "../music/types";

function toClipRelativeNotes(notes: MidiNote[], clipStart: number): MidiNote[] {
  return notes
    .filter((note) => note.duration > 0)
    .map((note) => ({
      ...note,
      startTime: Math.max(0, note.startTime - clipStart),
    }));
}

function outputEndTime(output: VoiceOutput, fallbackEndTime: number): number {
  return Object.values(output).reduce((endTime, notes) => {
    return notes.reduce((voiceEndTime, note) => Math.max(voiceEndTime, note.startTime + note.duration), endTime);
  }, fallbackEndTime);
}

async function createNamedTrack(song: Song<"1.0.0">, name: string): Promise<MidiTrack<"1.0.0">> {
  const track = await song.createMidiTrack();
  track.name = name;
  return track;
}

function combinedVoiceNotes(output: VoiceOutput, clipStart: number): MidiNote[] {
  return [
    ...toClipRelativeNotes(output.violin1, clipStart),
    ...toClipRelativeNotes(output.violin2, clipStart),
    ...toClipRelativeNotes(output.viola, clipStart),
    ...toClipRelativeNotes(output.cello, clipStart),
  ].sort((a, b) => a.startTime - b.startTime || b.pitch - a.pitch);
}

export async function writeVoiceOutput(
  context: ExtensionContext<"1.0.0">,
  song: Song<"1.0.0">,
  output: VoiceOutput,
  startTime: number,
  endTime: number,
  outputMode: OutputMode,
): Promise<void> {
  const clipEndTime = outputEndTime(output, endTime);
  const duration = clipEndTime - startTime;
  if (duration <= 0) throw new Error("Selection duration must be greater than zero.");

  if (outputMode === "singleTrack") {
    await context.withinTransaction(() =>
      createNamedTrack(song, "Generated Strings").then((track) =>
        track.createMidiClip(startTime, duration).then((clip) => {
          clip.notes = combinedVoiceNotes(output, startTime);
        }),
      ),
    );
    return;
  }

  await context.withinTransaction(() =>
    Promise.all([
      createNamedTrack(song, "Generated Violin I"),
      createNamedTrack(song, "Generated Violin II"),
      createNamedTrack(song, "Generated Viola"),
      createNamedTrack(song, "Generated Cello"),
    ]).then(async ([violin1, violin2, viola, cello]) => {
      const clips = await Promise.all([
        violin1.createMidiClip(startTime, duration),
        violin2.createMidiClip(startTime, duration),
        viola.createMidiClip(startTime, duration),
        cello.createMidiClip(startTime, duration),
      ]);

      clips[0]!.notes = toClipRelativeNotes(output.violin1, startTime);
      clips[1]!.notes = toClipRelativeNotes(output.violin2, startTime);
      clips[2]!.notes = toClipRelativeNotes(output.viola, startTime);
      clips[3]!.notes = toClipRelativeNotes(output.cello, startTime);
    }),
  );
}

export async function writeFourTrackOutput(
  context: ExtensionContext<"1.0.0">,
  song: Song<"1.0.0">,
  output: VoiceOutput,
  startTime: number,
  endTime: number,
): Promise<void> {
  await writeVoiceOutput(context, song, output, startTime, endTime, "fourTracks");
}
