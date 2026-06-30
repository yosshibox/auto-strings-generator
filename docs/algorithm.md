# Auto Strings Generator: Algorithm Notes

この拡張は、MIDI クリップまたは選択範囲から 4 声ストリングスを作る処理と、既存の 4 声クリップを分解する処理を持つ。  
現状の生成ロジックで実際に効いているのは主に `sourceMode`、`outputMode`、`avoidParallelPerfects` で、他の UI オプションはダイアログ状態としては存在するが、生成本体ではまだ使われていない。

## 入口

- `Generate 4-Part Strings` は Arrangement 選択または MIDI クリップから呼べる。
- クリップから呼ぶ場合は、`sourceMode` により次の 2 経路に分かれる。
  - `splitExistingVoicing`: 既存の 4 声以上クリップを分割
  - `generateFromTopAndChord`: Top Note Track と Chord Notes Track から新規生成
- `splitExistingVoicing` のときはトラック選択 UI が隠れ、選択中クリップをそのまま材料にする。

## `splitExistingVoicing` の考え方

対象は「すでに 4 声として鳴っているクリップ」。  
各ノートの開始位置ごとに、その時点で有効なノート集合を作り、音高順で 4 声へ割り当てる。

処理の流れは次の通り。

1. クリップ範囲内に重なるノートだけを拾う。
2. 1 音もなければエラーにする。
3. 各ノート開始時刻について、その瞬間にアクティブなノートを集める。
4. その集合が 4 音未満ならエラーにする。
5. 4 音ちょうどなら、その 4 音を高い順でそのまま `violin1 / violin2 / viola / cello` に対応させる。
6. 5 音以上なら、上から 3 音と最下音を残し、中声部の一部を捨てる。
7. その割り当てをノートごとに積み上げて、4 声の `VoiceOutput` を返す。

実装上は、同じ時刻の判定にごく小さい許容値を使っているため、完全な同時発音でなくてもほぼ同位置なら同一和音として扱う。

## `generateFromTopAndChord` の流れ

### 1. 読み込み

- `Top Note Track` と `Chord Notes Track` を別トラックとして読む。
- 2 つのトラックを同じものにするとエラー。
- それぞれ空ならエラー。

### 2. Top Note の抽出

- ミュートされていないノートだけを使う。
- 選択範囲の外に出る部分は切り詰める。
- ほぼ同じ開始時刻のノートを 1 グループにまとめる。
- 各グループから一番高い音を 1 つ選び、Top Note Event にする。

### 3. Chord のグルーピング

- ミュートされていないノートだけを使う。
- 開始時刻が近いノートをまとめて 1 つの chord event にする。
- 各 chord event には以下を持たせる。
  - 元のピッチ一覧
  - ピッチクラスの一覧
  - 低音ピッチ
  - 開始時刻
  - 終了時刻
- 2 種類以上のピッチクラスを持たない塊は捨てる。
- chord の終了時刻は、次の chord の開始まで、または選択範囲末尾までになる。

### 4. 4 声生成

各 chord について、次の順に処理する。

1. その chord と重なる top note を探す。
2. top note が 1 つも重なっていなければ、その chord はスキップする。
3. 最初に重なった top note を主音的な top とみなす。
4. その chord に対して `generateVoicingCandidates` を呼ぶ。
5. 候補の先頭を採用する。
6. `violin1` には、その chord と重なる top note をそのまま書く。
7. `violin2 / viola / cello` には、採用した voicing をブロックとして書く。

補足:

- `avoidParallelPerfects` が有効だと、前の voicing からの平行 5 度 / 8 度を強く減点する。
- `violin2` は、top note の最低音より 5 半音以上下になるよう制約される。
- 最後に、同じ音高で隣接するノートを結合し、必要なら終端を少しだけ引き延ばす。

## `outputMode` の違い

`writeVoiceOutput` が実際の出力方法を決める。

### `fourTracks`

- `Generated Violin I`
- `Generated Violin II`
- `Generated Viola`
- `Generated Cello`

の 4 トラックを新規作成し、それぞれに 1 クリップずつ書き込む。

### `singleTrack`

- `Generated Strings` という 1 トラックだけを作る。
- 4 声を 1 本にまとめて、開始時刻順・高音優先で 1 つのクリップに書き込む。

どちらの出力でも、クリップ長は「選択範囲末尾」と「生成された最後のノート終端」の大きい方を使う。

## エラー条件と UI 上の意味

- `Selected object is not a MIDI clip.`  
  クリップ以外を右クリックした。
- `Only Arrangement MIDI clips are supported. Session clips are not supported yet.`  
  Session クリップは未対応。
- `Need at least one MIDI track.` / `Need at least two MIDI tracks...`  
  必要な MIDI トラック数が足りない。
- `Top Note Track was not found.` / `Chord Notes Track was not found.`  
  ダイアログで選んだトラックが見つからない。
- `Top Note Track has no MIDI notes in the selected range.`  
  Top 側に有効ノートがない。
- `Chord Notes Track has no MIDI notes in the selected range.`  
  Chord 側に有効ノートがない。
- `Chord Notes Track did not contain usable chord events.`  
  chord グループはできたが、2 音以上の和音として使える塊がなかった。
- `No valid string voicing candidates were generated.`  
  和声は読めたが、レンジや平行制約の結果、採用できる voicing が残らなかった。
- `Selected clip has no MIDI notes in its clip range.`  
  `splitExistingVoicing` の材料が空。
- `Expected at least 4 notes active at beat ...`  
  その時刻に 4 声として成立しない。
- `Selection duration must be greater than zero.`  
  出力先の長さが 0 以下。

エラーは共通のエラーダイアログに表示されるため、利用者から見ると「その場で理由付きで止まる」挙動になる。

## 実装メモ

- `rhythmMode`、`topNoteHandling`、`bassMode`、`innerVoiceMode`、`legatoOverlapBeats`、`velocityHumanize` は UI と型にはあるが、現状の生成ロジックでは未接続。
- 将来これらを効かせるなら、`generateFourPartStrings` と `writeVoiceOutput` の間に新しい変換層を足すのが自然。
