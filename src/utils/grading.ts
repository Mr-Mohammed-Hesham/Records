import { GradingScaleItem, ExamResult, StudentStats } from '../types';

export const DEFAULT_GRADING_SCALE: GradingScaleItem[] = [
  {
    id: 'excellent',
    minPercent: 90,
    maxPercent: 100,
    label: 'ممتاز',
    color: 'emerald',
    badgeBg: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    badgeText: 'text-emerald-700',
    isPass: true,
  },
  {
    id: 'very_good',
    minPercent: 80,
    maxPercent: 89.99,
    label: 'جيد جداً',
    color: 'blue',
    badgeBg: 'bg-blue-50 text-blue-700 border-blue-200',
    badgeText: 'text-blue-700',
    isPass: true,
  },
  {
    id: 'good',
    minPercent: 70,
    maxPercent: 79.99,
    label: 'جيد',
    color: 'amber',
    badgeBg: 'bg-amber-50 text-amber-700 border-amber-200',
    badgeText: 'text-amber-700',
    isPass: true,
  },
  {
    id: 'acceptable',
    minPercent: 60,
    maxPercent: 69.99,
    label: 'مقبول',
    color: 'orange',
    badgeBg: 'bg-orange-50 text-orange-700 border-orange-200',
    badgeText: 'text-orange-700',
    isPass: true,
  },
  {
    id: 'needs_improvement',
    minPercent: 0,
    maxPercent: 59.99,
    label: 'يحتاج إلى تحسين',
    color: 'rose',
    badgeBg: 'bg-rose-50 text-rose-700 border-rose-200',
    badgeText: 'text-rose-700',
    isPass: false,
  },
];

export function getGradeRating(
  percentage: number,
  scale: GradingScaleItem[] = DEFAULT_GRADING_SCALE
): { label: string; badgeBg: string; isPass: boolean } {
  const rounded = Math.round(percentage * 10) / 10;
  for (const item of scale) {
    if (rounded >= item.minPercent && rounded <= item.maxPercent + 0.01) {
      return {
        label: item.label,
        badgeBg: item.badgeBg,
        isPass: item.isPass,
      };
    }
  }
  // Fallback
  if (rounded >= 60) {
    return { label: 'مقبول', badgeBg: 'bg-orange-50 text-orange-700 border-orange-200', isPass: true };
  }
  return { label: 'يحتاج إلى تحسين', badgeBg: 'bg-rose-50 text-rose-700 border-rose-200', isPass: false };
}

export function calculateStudentStats(
  results: ExamResult[],
  scale: GradingScaleItem[] = DEFAULT_GRADING_SCALE
): StudentStats {
  if (!results || results.length === 0) {
    return {
      totalExams: 0,
      highestScore: 0,
      highestPercentage: 0,
      lowestScore: 0,
      lowestPercentage: 0,
      averageScore: 0,
      averagePercentage: 0,
      passRate: 0,
      latestScore: null,
      latestPercentage: null,
      latestExamTitle: null,
      status: 'يحتاج متابعة',
      trend: 'steady',
      trendMessage: 'لم يتم رصد امتحانات لهذا الطالب حتى الآن.',
    };
  }

  // Sort chronological by exam date
  const sorted = [...results].sort((a, b) => new Date(a.examDate).getTime() - new Date(b.examDate).getTime());

  let totalScoreSum = 0;
  let totalPercentSum = 0;
  let highestScore = -Infinity;
  let highestPercent = -Infinity;
  let lowestScore = Infinity;
  let lowestPercent = Infinity;
  let passedCount = 0;

  results.forEach((r) => {
    totalScoreSum += r.score;
    totalPercentSum += r.percentage;
    if (r.score > highestScore) highestScore = r.score;
    if (r.percentage > highestPercent) highestPercent = r.percentage;
    if (r.score < lowestScore) lowestScore = r.score;
    if (r.percentage < lowestPercent) lowestPercent = r.percentage;
    if (r.passed) passedCount++;
  });

  const count = results.length;
  const avgPercent = Math.round((totalPercentSum / count) * 10) / 10;
  const avgScore = Math.round((totalScoreSum / count) * 10) / 10;
  const passRate = Math.round((passedCount / count) * 100);

  const latest = sorted[sorted.length - 1];

  // Determine overall status
  let status: 'ممتاز' | 'جيد' | 'يحتاج متابعة' = 'يحتاج متابعة';
  if (avgPercent >= 85) {
    status = 'ممتاز';
  } else if (avgPercent >= 65) {
    status = 'جيد';
  } else {
    status = 'يحتاج متابعة';
  }

  // Trend analysis (comparing last 2-3 exams with previous ones)
  let trend: 'improving' | 'steady' | 'declining' = 'steady';
  let trendMessage = 'أداء الطالب مستقر على وتيرة ثابتة.';

  if (sorted.length >= 2) {
    const recentScores = sorted.slice(-Math.min(3, sorted.length)).map(r => r.percentage);
    const pastScores = sorted.slice(0, Math.max(1, sorted.length - recentScores.length)).map(r => r.percentage);

    const recentAvg = recentScores.reduce((a, b) => a + b, 0) / recentScores.length;
    const pastAvg = pastScores.reduce((a, b) => a + b, 0) / pastScores.length;
    const diff = Math.round((recentAvg - pastAvg) * 10) / 10;

    if (diff >= 5) {
      trend = 'improving';
      trendMessage = `أداء الطالب في تحسن ملحوظ بنسبة +${diff}% مقارنة بالامتحانات السابقة، استمر في تشجيعه.`;
    } else if (diff <= -5) {
      trend = 'declining';
      trendMessage = `هناك انخفاض في النتائج الأخيرة بنسبة ${Math.abs(diff)}%، يحتاج الطالب إلى متابعة ودعم في النقاط الصعبة.`;
    } else {
      trend = 'steady';
      trendMessage = `مستوى الطالب متقارب ومستقر بمتوسط أداء ${avgPercent}%، مع استمرارية جيدة.`;
    }
  } else if (sorted.length === 1) {
    trendMessage = `تم تسجيل امتحان واحد بنتيجة ${sorted[0].percentage}%. ستظهر تحليلات التطور مع إضافة المزيد من الامتحانات.`;
  }

  return {
    totalExams: count,
    highestScore: highestScore === -Infinity ? 0 : highestScore,
    highestPercentage: highestPercent === -Infinity ? 0 : Math.round(highestPercent * 10) / 10,
    lowestScore: lowestScore === Infinity ? 0 : lowestScore,
    lowestPercentage: lowestPercent === Infinity ? 0 : Math.round(lowestPercent * 10) / 10,
    averageScore: avgScore,
    averagePercentage: avgPercent,
    passRate,
    latestScore: latest ? latest.score : null,
    latestPercentage: latest ? Math.round(latest.percentage * 10) / 10 : null,
    latestExamTitle: latest ? latest.examTitle : null,
    status,
    trend,
    trendMessage,
  };
}
