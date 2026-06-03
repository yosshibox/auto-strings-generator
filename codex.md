# Auto Strings Generator 実装方針

## 目的

Ableton Live Extensions SDK 1.0.0-beta.0 を使い、MIDIトラックからストリングス4声アレンジと対旋律を生成する Ableton Live 拡張機能 `Auto Strings Generator` を実装する。

この文書は Ableton Live Extensions SDK 用の指示書、仕様書、SDKメモ、アルゴリズム設計、受け入れテストをもとにした実装方針である。

## 最重要方針

- Ableton SDK のAPI名は推測で実装しない。必ず同梱の `sdk/api` と `sdk/ableton-extensions-sdk-1.0.0-beta.0.tgz` の型定義を一次情報として確認する。
- Live SDK依存処理と音楽ロジックを分離する。
- `music/` 以下は Ableton Live なしでユニットテスト可能にする。
- まずは4声ストリングス生成のMVPを完成させ、その後に対旋律生成と追加モードを拡張する。
- 複数トラック作成、クリップ作成、ノート書き込みは `withinTransaction` で1つのUndo単位にまとめる。
- 長時間処理は `withinProgressDialog` で進捗表示と中断対応を行う。

## 実装対象

### 機能1: Generate 4-Part String Arrangement

入力:

- Top Note MIDI Track
- Chord Notes MIDI Track
- Arrangement選択範囲、または対象MIDIクリップ範囲

出力:

- `Generated Violin I`
- `Generated Violin II`
- `Generated Viola`
- `Generated Cello`

基本動作:

- Violin I は Top Note Track のトップノートを原則そのまま使う。
- Cello は Chord Notes Track の最低音、またはBass Modeに応じたコードトーンを使う。
- Violin II / Viola はコード構成音から、声部交差なし、音域内、滑らかな進行になるよう生成する。
- MVPでは下3声はコード区間ごとのロングトーンでよい。
- 同音が隣接する場合は結合して自然なロングトーンにする。

### 機能2: Generate Counter Melody

入力:

- Source Melody MIDI Track または MIDI Clip
- 任意で Chord Notes MIDI Track

出力:

- `Generated Counter Melody`

基本動作:

- 元旋律が細かく動く箇所では保持または反行を優先する。
- 元旋律がロングトーンの箇所では対旋律を動かす。
- 強拍ではコードトーンを優先し、弱拍では経過音・刺繍音を許可する。
- 短2度、長7度、露骨な増4度衝突を避ける。
- 並行5度・並行8度は減点対象にする。

MVPでは4声生成を先に完成させ、対旋律生成は次フェーズで実装する。

## 推奨プロジェクト構成

```text
auto-strings-generator/
  package.json
  manifest.json
  build.ts
  tsconfig.json
  src/
    extension.ts
    ui/
      dialog.html
      dialog.ts
      dialogTypes.ts
    live/
      getTracks.ts
      readMidi.ts
      writeMidi.ts
      selection.ts
    music/
      types.ts
      ranges.ts
      pitch.ts
      chordGrouping.ts
      topNotes.ts
      voicing.ts
      scoring.ts
      parallelPerfects.ts
      noteCleanup.ts
      counterpoint.ts
    generators/
      generateFourPartStrings.ts
      generateCounterMelody.ts
    utils/
      assert.ts
      sort.ts
  tests/
    chordGrouping.test.ts
    voicing.test.ts
    counterpoint.test.ts
```

責務分離:

- `extension.ts`: SDK初期化、コマンド登録、コンテキストメニュー登録、UI起動、トランザクション制御。
- `ui/`: Modal Dialog のHTML、入力値、戻り値の型。
- `live/`: Ableton SDKオブジェクトからplain objectへの変換、MIDI読み取り、MIDI書き込み。
- `music/`: Ableton非依存の音楽処理。ユニットテスト対象。
- `generators/`: `music/` の関数を組み合わせて最終的な出力ノート群を作る。

データの流れ:

```text
Ableton SDK objects
-> live/readMidi.ts
-> MidiNote[] / ChordEvent[] / TopNoteEvent[]
-> music/ and generators/
-> MidiNote[]
-> live/writeMidi.ts
-> Ableton MIDI Clip
```

## SDK連携方針

まず以下の右クリックメニューを登録する。

```text
MidiTrack.ArrangementSelection -> Generate 4-Part Strings
MidiTrack.ArrangementSelection -> Generate Counter Melody
MidiClip -> Generate Counter Melody From Clip
```

初期MVPでは `MidiTrack.ArrangementSelection` の `Generate 4-Part Strings` を主対象にする。

同梱資料で確認済みのAPI候補:

```ts
context.application.song.tracks
song.createMidiTrack()
MidiTrack.createMidiClip(startTime, duration)
MidiClip.notes getter/setter
context.ui.showModalDialog(...)
context.ui.registerContextMenuAction(...)
context.commands.registerCommand(...)
context.ui.withinProgressDialog(...)
context.withinTransaction(() => ...)
```

ただし実装時には、最終的な型・メソッド名・戻り値を必ずSDK型定義で再確認する。

`withinTransaction` はコールバック内で直接 `await` せず、Promiseを返して外側で待つ設計にする。

## UI方針

HTML Modal Dialogで以下を表示する。

```text
Auto Strings Generator

Top Note Track:        [select]
Chord Notes Track:     [select]
Output:                [4 tracks / single track]
Rhythm Mode:           [Top Rhythm Follow / Chord Block]
Top Note Handling:     [Fixed / Allow Tension / Snap To Chord]
Bass Mode:             [Original Bass / Root Bass / Smooth Bass]
Inner Voice Mode:      [Smooth / Close / Open]
Avoid Parallel 5/8:    [checkbox]
Legato Overlap Beats:  [number]
Velocity Humanize:     [number]

[Generate]
```

MVPでは最低限、以下があればよい。

- Top Note Track選択
- Chord Notes Track選択
- `Generate` ボタン
- 4トラック出力

初期設定:

```ts
{
  outputMode: "fourTracks",
  rhythmMode: "topRhythmFollow",
  topNoteHandling: "fixed",
  bassMode: "originalBass",
  innerVoiceMode: "smooth",
  avoidParallelPerfects: true,
  legatoOverlapBeats: 0,
  velocityHumanize: 0
}
```

## 音楽ロジック方針

### 共通データ型

`MidiNote` はSDKの `NoteDescription` と互換のplain objectとして扱う。

```ts
type MidiNote = {
  pitch: number;
  startTime: number;
  duration: number;
  velocity?: number;
  muted?: boolean;
  probability?: number;
  velocityDeviation?: number;
  releaseVelocity?: number;
  selected?: boolean;
};
```

主要な内部型:

- `ChordEvent`: コード開始、終了、構成音、pitch class、bass pitchを持つ。
- `TopNoteEvent`: トップノートの開始、終了、pitch、velocityを持つ。
- `Voicing`: 4声のpitch、score、評価理由を持つ。

### 音域

```ts
const STRING_RANGES = {
  violin1: { min: 60, max: 96 },
  violin2: { min: 55, max: 88 },
  viola:   { min: 48, max: 79 },
  cello:   { min: 36, max: 67 },
};
```

### Chord grouping

Chord Notes Trackのノートを同時発音ごとにまとめる。

- mutedでないノートのみ使う。
- 選択範囲と交差するノートのみ使う。
- startTimeでソートする。
- `0.03 beats` 程度の許容誤差で同一コードとしてグルーピングする。
- pitch class集合を作る。
- endTimeは次コード開始、最終コードは選択範囲終了にする。

### Top note extraction

Top Note Trackが単音でない場合、同時刻または重複区間の最高音をトップノートとして採用する。

- mutedでないノートのみ使う。
- 選択範囲と交差するノートのみ使う。
- start/endは選択範囲にクリップする。
- `topNoteHandling: fixed` ではコード外音でも変更しない。

### Voicing generation

各 `ChordEvent` と Violin I pitch に対して、Violin II / Viola / Cello 候補を列挙する。

必須制約:

```text
cello < viola < violin2 < violin1
各声部が音域内
```

候補生成:

- chord pitch classを各声部の音域内に展開する。
- 候補数が多い場合、前回pitchから近い候補を優先して上限を設ける。
- Celloでは `bassMode: originalBass` の場合、Chord Notes Track最低音のpitch classを優先する。

スコアリング:

- 音域内、声部交差なしを強く優先する。
- コード構成音の種類数を増やす。
- 可能なら3rd/7thを含める。
- 前回ボイシングからの移動量を小さくする。
- Celloで元ベースを保持する。
- 密集しすぎ、開きすぎ、短2度衝突を減点する。
- 並行5度・並行8度を減点する。

MVPでは貪欲法で各コード区間の最高スコア候補を選ぶ。後続版では各区間の上位候補を持ち、動的計画法で全体最適化する。

### Timing

- SDKのMIDI timeはbeats単位として扱う。
- Arrangement選択範囲の `time_selection_start` / `time_selection_end` を処理範囲にする。
- コード区間はChord Notes Trackのコード開始時刻から次コード開始時刻まで。
- MVPでは最終コードを選択範囲終了まで保持する。
- Violin Iはトップノートのリズムを保持する。
- 下3声はコード区間ごとのロングトーンにする。

### Note cleanup

- 隣接する同pitchノートは結合する。
- `legatoOverlapBeats` が指定された場合は、後続実装で出力直前にdurationへ反映する。
- `velocityHumanize` は後続実装で出力直前に反映する。

## 実装ステップ

### Phase 1: プロジェクト作成とSDK確認

1. SDK同梱サンプルを参考に TypeScript プロジェクトを作る。
2. `package.json`、`manifest.json`、`build.ts`、`tsconfig.json` を整える。
3. SDK tarballをローカル依存として参照する。
4. `npm run build` が通る最小拡張を作る。
5. `registerContextMenuAction` と `registerCommand` の型を確認する。

### Phase 2: MVPのUIと入力取得

1. `MidiTrack.ArrangementSelection` の右クリックから起動できるようにする。
2. Modal DialogでTop Note TrackとChord Notes Trackを選べるようにする。
3. `song.tracks` からMIDIトラック一覧を作る。
4. Arrangement選択範囲を取得する。
5. 選択範囲内のMIDIクリップとノートを読み取る処理を `live/readMidi.ts` に実装する。

### Phase 3: 4声生成ロジック

1. `chordGrouping.ts` でChord Notes Trackを `ChordEvent[]` に変換する。
2. `topNotes.ts` でTop Note Trackを `TopNoteEvent[]` に変換する。
3. `voicing.ts` と `scoring.ts` で候補生成と評価を行う。
4. `generateFourPartStrings.ts` で4声の `MidiNote[]` を作る。
5. `noteCleanup.ts` で同音連続を結合する。

### Phase 4: Liveへの書き込み

1. `withinProgressDialog` で処理段階を表示する。
2. `withinTransaction` 内で4つのMIDIトラックを作成する。
3. 各トラックに同じ開始位置・長さのMIDIクリップを作成する。
4. 生成ノートを `MidiClip.notes` にセットする。
5. 出力トラック名を以下にする。

```text
Generated Violin I
Generated Violin II
Generated Viola
Generated Cello
```

### Phase 5: テスト

ユニットテストは `music/` を中心に追加する。

優先テスト:

- chord grouping
- top note extraction
- voice range
- voice crossing
- Violin I preservation
- bass preservation
- chord completeness
- same-note merge
- parallel perfect detection

### Phase 6: 対旋律生成

4声生成MVPが安定してから、`generateCounterMelody.ts` と `music/counterpoint.ts` を実装する。

MVP対旋律:

- 元旋律のロングトーン区間を2〜4分割して動きを作る。
- 元旋律が細かく動く区間では保持または短い応答にする。
- 強拍ではコードトーン比率を高くする。
- 反行、順次進行、3度/6度関係を加点する。
- 短2度/長7度、大跳躍、並行5度/8度を減点する。

## エラーハンドリング

以下はModalまたはconsoleに明示する。

- Top Note Trackが見つからない。
- Chord Notes Trackが見つからない。
- 選択範囲にMIDIノートがない。
- Chord Notes Trackからコード区間を作れない。
- 生成候補がゼロになる。
- SDKオブジェクトの解決に失敗した。
- クリップ作成またはノート書き込みに失敗した。

## 受け入れ条件

### Build

- `npm install` が通る。
- `npm run build` が通る。
- `npm run package` で `.ablx` が生成される。
- TypeScript strict modeで重大な型エラーがない。

### SDK integration

- Ableton Live上で拡張がロードされる。
- Arrangement上のMIDIトラック選択範囲を右クリックしたとき、`Generate 4-Part Strings` が表示される。
- 実行時にModal Dialogが開く。
- Top Note TrackとChord Notes Trackを選択できる。
- Generate実行後、新規MIDIトラックが4つ作成される。
- 各トラックにMIDIクリップが作成される。
- 生成結果が1つのUndoで戻せる。

### Music logic

- Chord Notes Trackから期待どおり `ChordEvent` が作られる。
- 同時刻の複数トップノートでは最高音が採用される。
- 全声部が指定音域に収まる。
- `cello < viola < violin2 < violin1` を満たす。
- `topNoteHandling: fixed` ではViolin Iがトップノートを保持する。
- `bassMode: originalBass` ではCelloに元ベースpitch classが反映される。
- 4声全体でコード構成音をなるべく3種類以上含む。
- 隣接する同pitchノートが結合される。

## 非対象

MVPでは以下を実装しない。

- Audioからの自動採譜
- VST/AUロード
- リアルタイムMIDIエフェクトとしての常駐動作
- 機械学習やAIによる複雑な生成
- Single-track output
- 動的計画法による全体最適化

## 実装時の確認ポイント

- `MidiTrack` からArrangement上の対象MIDIクリップをどう解決するかはSDK型定義とサンプルで必ず確認する。
- `MidiClip.notes` のtime基準がクリップ相対かArrangement絶対かを実装時に検証する。
- `selected_lanes` のhandleから得られるオブジェクト型を確認する。
- Modal Dialogの戻り値形式をサンプルに合わせる。
- `withinTransaction` と `withinProgressDialog` のネスト可否、Promiseの扱いを実装時に確認する。
- Ableton上の手動テストでは、Cmaj7 - Am7 - Fmaj7 - G7 の4小節進行でViolin I保持と下3声の自然な進行を確認する。
