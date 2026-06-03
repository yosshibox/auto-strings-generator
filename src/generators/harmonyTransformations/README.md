# Harmony Transformations Research

This directory is reserved for future jobs that transform existing MIDI harmony:

- Tonnetz / Neo-Riemannian transformations
- Negative harmony generation

## Tonnetz Transformations

Musical use:

- Treat major and minor triads as nodes in a harmonic network rather than as chords inside one fixed key.
- Use small voice-leading moves to create surprising but smooth progressions.
- Navigate with the three core Neo-Riemannian operations:
  - `P` / Parallel: C major -> C minor, mode changes while root and fifth stay.
  - `L` / Leading-tone exchange: C major -> E minor, two notes stay and one moves by semitone.
  - `R` / Relative: C major -> A minor, two notes stay and one moves by whole tone.
- Chain operations such as `PL`, `RP`, or `PLR` to generate chord cycles.
- Analyze or generate chromatic mediants and film-score-like triadic movement while preserving common tones.

Implementation implications:

- Best represented as pitch-class transformations on recognized major/minor triads.
- Non-triad, diminished, augmented, sus, and extended chords need a policy:
  - skip,
  - reduce to triad,
  - transform chord tones and preserve extensions,
  - or expose a strict/loose mode.
- Preserve timing, duration, velocity, and track/clip context; transform only pitch content.
- Add a transformation sequence input such as `P`, `L`, `R`, `PL`, `RP`, or custom arrays.

Sources:

- Open Music Theory, "Neo-Riemannian Triadic Progressions": https://viva.pressbooks.pub/openmusictheory/chapter/neo-riemannian-triadic-progressions/
- music21 `analysis.neoRiemannian` module docs: https://music21.org/music21docs/moduleReference/moduleAnalysisNeoRiemannian.html

## Negative Harmony

Musical use:

- Reflect notes and chords around a tonal axis derived from the tonic and dominant.
- In C, the common axis lies midway between C and G, i.e. between E-flat and E in pitch-class space.
- Create a "negative" counterpart of a melody, chord, or progression while keeping a comparable pull toward the tonic.
- Convert authentic-cadence gravity into a plagal-cadence-like color.
- Major chords generally become minor-type sonorities, and dominant-seventh colors often map toward minor-sixth colors.

Implementation implications:

- Needs an explicit key center. Without a tonic, the same MIDI notes can produce different negative mappings.
- Pitch-class formula can be represented as reflection around the tonic/dominant midpoint.
- In C, the practical mapping is:
  - C -> G
  - Db -> Gb
  - D -> F
  - Eb -> E
  - E -> Eb
  - F -> D
  - Gb -> Db
  - G -> C
  - Ab -> B
  - A -> Bb
  - Bb -> A
  - B -> Ab
- Preserve register ergonomically by mapping to the nearest pitch in a target range, or offer a raw pitch-class mode.
- Let the tonic chord optionally remain unchanged, since many uses keep the tonic as the point of arrival.

Sources:

- Wikipedia, "Negative harmony": https://en.wikipedia.org/wiki/Negative_harmony
- Beyond Music Theory, "Cadences and Negative Harmony": https://www.beyondmusictheory.org/cadences-and-negative-harmony/

## First Job Candidates

- `applyTonnetzTransform(notes, sequence, options)`
- `generateTonnetzCycle(chords, sequence, options)`
- `applyNegativeHarmony(notes, tonicPitchClass, options)`
- `transformChordEvents(chordEvents, mode, options)`
