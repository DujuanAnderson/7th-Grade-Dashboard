// Pure derivations used across the dashboards. No data lives here — these
// operate on whatever Student[] the API returns.
import type { RiskStatus, ReadingBand, Student } from './types';

// Risk thresholds mirror spec §5/§8 (FFW completion, Clear Math mastery, attendance).
export function computeRisk(ffw: number, mastery: number, attendance: number): RiskStatus {
  if (ffw < 50 || mastery < 50 || attendance < 70) return 'At Risk';
  if (ffw < 70 || mastery < 70 || attendance < 85) return 'Needs Attention';
  return 'On Track';
}

// Reading band from the current RPI score.
export function bandForRpi(rpi: number): ReadingBand {
  if (rpi < 50) return 'Below';
  if (rpi < 62) return 'Approaching';
  if (rpi < 75) return 'At';
  return 'Above';
}

// Class-average Clear Math mastery per week (spec §6 math tracker line chart),
// derived from the cohort's weekly trend against a flat grade-level benchmark.
export function classMasteryTrend(
  students: Student[],
  weeks = 6,
  benchmark = 70,
): { week: string; classAvg: number; benchmark: number }[] {
  return Array.from({ length: weeks }, (_, w) => {
    const vals = students
      .map((s) => s.masteryTrend[w])
      .filter((v): v is number => typeof v === 'number');
    const classAvg = vals.length
      ? Math.round(vals.reduce((a, b) => a + b, 0) / vals.length)
      : 0;
    return { week: `Wk ${w + 1}`, classAvg, benchmark };
  });
}
