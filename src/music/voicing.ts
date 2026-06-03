import { hasParallelPerfectInterval } from "./parallelPerfects";
import { expandPitchClassToRange, pitchClass } from "./pitch";
import { STRING_RANGES } from "./ranges";
import type { ChordEvent, Voicing } from "./types";

function nearestCandidates(pitchClasses: number[], min: number, max: number, previous?: number, limit = 16): number[] {
  if (max < min) return [];
  const expanded = pitchClasses.flatMap((pc) => expandPitchClassToRange(pc, min, max));
  const unique = Array.from(new Set(expanded));
  if (previous == null) return unique.sort((a, b) => a - b).slice(0, limit);
  return unique.sort((a, b) => Math.abs(a - previous) - Math.abs(b - previous) || a - b).slice(0, limit);
}

function spacingScore(violin1: number, violin2: number, viola: number, cello: number): number {
  let score = 0;
  const top = violin1 - violin2;
  const middle = violin2 - viola;
  const bottom = viola - cello;
  if (top <= 12) score += 12;
  else score -= top - 12;
  if (middle <= 12) score += 12;
  else score -= middle - 12;
  if (bottom <= 19) score += 10;
  else score -= bottom - 19;
  return score;
}

function initialRegisterScore(violin1: number, violin2: number, viola: number, cello: number): number {
  const topGap = violin1 - violin2;
  const middleGap = violin2 - viola;
  const bottomGap = viola - cello;
  let score = 0;

  score += 24 - Math.abs(topGap - 7) * 4;
  score += 18 - Math.abs(middleGap - 7) * 3;
  score += 14 - Math.abs(bottomGap - 14) * 2;
  score += 16 - Math.abs(cello - 48) * 1.5;

  if (topGap < 5) score -= 40;
  if (topGap > 12) score -= 20;
  if (middleGap > 12) score -= 16;
  if (bottomGap > 19) score -= 16;
  if (cello < 43) score -= 36;

  return score;
}

function parallelPenalty(previous: Voicing, next: Omit<Voicing, "score" | "reasons">): number {
  const pairs: Array<[keyof Omit<Voicing, "score" | "reasons">, keyof Omit<Voicing, "score" | "reasons">]> = [
    ["violin1", "violin2"],
    ["violin1", "viola"],
    ["violin1", "cello"],
    ["violin2", "viola"],
    ["violin2", "cello"],
    ["viola", "cello"],
  ];

  return pairs.reduce((penalty, [a, b]) => {
    return hasParallelPerfectInterval(previous[a], previous[b], next[a], next[b]) ? penalty + 80 : penalty;
  }, 0);
}

export function generateVoicingCandidates(
  chord: ChordEvent,
  violin1: number,
  previous?: Voicing,
  avoidParallelPerfects = true,
  violin2MaxPitch = violin1 - 1,
): Voicing[] {
  const violin2Candidates = nearestCandidates(
    chord.pitchClasses,
    STRING_RANGES.violin2.min,
    Math.min(STRING_RANGES.violin2.max, violin1 - 1, violin2MaxPitch),
    previous?.violin2,
  );
  const violaCandidates = nearestCandidates(chord.pitchClasses, STRING_RANGES.viola.min, STRING_RANGES.viola.max, previous?.viola);
  const celloPitchClasses = [pitchClass(chord.bassPitch), ...chord.pitchClasses];
  const celloCandidates = nearestCandidates(celloPitchClasses, STRING_RANGES.cello.min, STRING_RANGES.cello.max, previous?.cello);

  const out: Voicing[] = [];
  for (const cello of celloCandidates) {
    for (const viola of violaCandidates) {
      for (const violin2 of violin2Candidates) {
        if (!(cello < viola && viola < violin2 && violin2 < violin1)) continue;

        const next = { violin1, violin2, viola, cello };
        const reasons: string[] = [];
        let score = 0;

        score += 200;
        reasons.push("in range and no crossing");

        const usedPcs = new Set([violin1, violin2, viola, cello].map(pitchClass));
        score += usedPcs.size * 14;
        reasons.push(`unique pitch classes=${usedPcs.size}`);

        if (pitchClass(cello) === pitchClass(chord.bassPitch)) {
          score += 45;
          reasons.push("preserve original bass pitch class");
        }

        score += spacingScore(violin1, violin2, viola, cello);

        if (previous) {
          const motion = Math.abs(violin2 - previous.violin2) + Math.abs(viola - previous.viola) + Math.abs(cello - previous.cello);
          score -= motion * 1.5;
          if (avoidParallelPerfects) score -= parallelPenalty(previous, next);
        } else {
          score += initialRegisterScore(violin1, violin2, viola, cello);
        }

        out.push({ ...next, score, reasons });
      }
    }
  }

  return out.sort((a, b) => b.score - a.score).slice(0, 48);
}
