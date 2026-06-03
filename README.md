# Auto Strings Generator

Ableton Live Extensions SDK 1.0.0-beta.0 based extension for generating string voicings from MIDI tracks.

## Features

- Generate 4-part string arrangement from a Top Note MIDI track and Chord Notes MIDI track.
- Generate a simple counter melody from a MIDI arrangement selection or MIDI clip.
- Keep Live SDK integration separate from unit-testable music logic.

## Development

This repository does not redistribute Ableton Live Extensions SDK beta packages.
Before installing dependencies, place the official SDK tarballs from Ableton in `vendor/`:

- `vendor/ableton-extensions-sdk-1.0.0-beta.0.tgz`
- `vendor/ableton-extensions-cli-1.0.0-beta.0.tgz`

```sh
npm install
npm test
npm run build
npm run package
```

To run the extension in Live during development:

```sh
cd /Users/yosshi/Documents/Codex/automated_counterpart
npm run run:live
```

`run:live` starts Ableton's Extension Host and keeps it running in the
foreground. The terminal is expected to stay at the Extension Host log until
you stop it with `Ctrl-C`.

## Usage

1. Create MIDI tracks named exactly `autoStrings_top` and `autoStrings_chord`.
2. Put the topline melody in `autoStrings_top`.
3. Put block chord notes in `autoStrings_chord`.
4. Right-click a MIDI clip/clip slot or MIDI Arrangement selection and choose `Extensions > Generate 4-Part Strings`.

For Arrangement selections, the dialog can still be used to choose source tracks. For MIDI clips/clip slots, the extension reads `autoStrings_top` and `autoStrings_chord` automatically.

- `autoStrings_top`: topline melody source
- `autoStrings_chord`: chord notes source

The extension creates:

- `Generated Violin I`
- `Generated Violin II`
- `Generated Viola`
- `Generated Cello`

The generated edit is grouped into one Live undo step where supported by the SDK host.
