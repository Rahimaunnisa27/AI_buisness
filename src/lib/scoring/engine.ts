/**
 * ValidateAI Plain-Code Scoring & Decision Engine
 * 
 * CORE RULES:
 * 1. Confidence score rises ONLY from real experiment results, NEVER from AI opinion.
 * 2. AI proposes; plain code decides (scores, thresholds, verdicts).
 * 3. Deterministic, mathematically transparent formulas.
 */

import { Assumption, Experiment, ExperimentResult, VerdictAnalysis, DecisionVerdict } from '@/src/types';

/**
 * Calculates deterministic Risk Score: Impact (1-5) * Uncertainty (1-5)
 * Range: 1 (Lowest risk) to 25 (Critical Leap-of-Faith)
 */
export function calculateRiskScore(impact: number, uncertainty: number): number {
  const safeImpact = Math.min(Math.max(Math.round(impact || 1), 1), 5);
  const safeUncertainty = Math.min(Math.max(Math.round(uncertainty || 1), 1), 5);
  return safeImpact * safeUncertainty;
}

/**
 * Evaluates whether an experiment result meets the pass criteria.
 * Plain deterministic threshold check.
 */
export function evaluateExperimentResult(
  experiment: Experiment,
  achievedMetric: number
): boolean {
  return achievedMetric >= experiment.passCriteriaMin;
}

/**
 * Computes evidence reliability multiplier based on sample size.
 * Small samples (<5) carry high noise, so their confidence contribution is discounted.
 */
function getEvidenceMultiplier(sampleSize: number, recommendedSize: number): number {
  if (sampleSize <= 0) return 0;
  if (sampleSize < 5) return 0.4; // Very weak sample
  if (sampleSize < Math.max(10, Math.floor(recommendedSize * 0.7))) return 0.75;
  return 1.0; // Robust sample
}

/**
 * Computes the overall Business Confidence Score and Decision Verdict.
 * 
 * RULES ENFORCED:
 * - Untested assumptions contribute ZERO confidence points.
 * - AI opinions contribute ZERO confidence points.
 * - Confidence is the ratio of verified validated risk points to total project risk points.
 * - Negative results on high-impact assumptions trigger PIVOT or KILL verdicts.
 */
export function calculateVerdict(
  assumptions: Assumption[],
  experiments: Experiment[],
  results: ExperimentResult[]
): VerdictAnalysis {
  if (!assumptions || assumptions.length === 0) {
    return {
      verdict: 'EXPLORING',
      confidenceScore: 0,
      totalAssumptions: 0,
      testedCount: 0,
      validatedCount: 0,
      invalidatedCount: 0,
      criticalInvalidatedCount: 0,
      reasons: ['No assumptions have been identified yet. Begin by deconstructing your business idea.'],
      recommendations: ['Add at least 3-5 core assumptions across Desirability, Feasibility, and Viability.'],
    };
  }

  // Map latest results to assumptions
  const assumptionResultsMap = new Map<string, { experiment: Experiment; result: ExperimentResult }>();
  for (const exp of experiments) {
    const res = results.find((r) => r.experimentId === exp.id);
    if (res) {
      assumptionResultsMap.set(exp.assumptionId, { experiment: exp, result: res });
    }
  }

  let totalRiskWeight = 0;
  let validatedRiskWeight = 0;
  let testedCount = 0;
  let validatedCount = 0;
  let invalidatedCount = 0;
  let criticalInvalidatedCount = 0;

  for (const asm of assumptions) {
    const weight = asm.riskScore;
    totalRiskWeight += weight;

    const testData = assumptionResultsMap.get(asm.id);
    if (testData) {
      testedCount++;
      const { experiment, result } = testData;
      const passed = evaluateExperimentResult(experiment, result.achievedMetric);

      if (passed) {
        validatedCount++;
        const multiplier = getEvidenceMultiplier(result.sampleSize, experiment.recommendedSampleSize);
        validatedRiskWeight += weight * multiplier;
      } else {
        invalidatedCount++;
        // If assumption is critical (Impact >= 4) in Desirability or Viability
        if (asm.impact >= 4 && (asm.category === 'desirability' || asm.category === 'viability')) {
          criticalInvalidatedCount++;
        }
      }
    }
  }

  // Confidence Score calculation (0 to 100)
  const confidenceScore = totalRiskWeight > 0
    ? Math.min(100, Math.max(0, Math.round((validatedRiskWeight / totalRiskWeight) * 100)))
    : 0;

  // Plain-code threshold decision rules
  let verdict: DecisionVerdict = 'EXPLORING';
  const reasons: string[] = [];
  const recommendations: string[] = [];

  if (testedCount === 0) {
    verdict = 'EXPLORING';
    reasons.push('0 experiments logged. Confidence score remains at 0% until real empirical evidence is gathered.');
    recommendations.push('Pick your highest-ranked Leap-of-Faith assumption (Rank #1) and execute its lean test.');
  } else if (criticalInvalidatedCount >= 2) {
    verdict = 'KILL';
    reasons.push(
      `${criticalInvalidatedCount} foundational assumptions in Desirability or Viability failed verification.`,
      'Data shows customers do not want or will not pay for the core value proposition in its current form.'
    );
    recommendations.push(
      'Cease spending time or capital on this exact formulation.',
      'Conduct 5 post-mortem discovery interviews to understand root student friction before launching a new concept.'
    );
  } else if (criticalInvalidatedCount === 1) {
    verdict = 'PIVOT';
    reasons.push(
      'A critical core hypothesis failed empirical validation, but other pillars remain viable.',
      'The current customer problem or monetization model does not match experimental data.'
    );
    recommendations.push(
      'Pivot the specific failed pillar (e.g., target customer segment or pricing structure).',
      'Draft a revised set of hypotheses before running next tests.'
    );
  } else if (confidenceScore >= 65 && validatedCount >= 2) {
    verdict = 'PERSEVERE';
    reasons.push(
      `Confidence score is ${confidenceScore}% backed by ${validatedCount} passing experiment(s).`,
      'Top critical assumptions have produced verifiable customer demand.'
    );
    recommendations.push(
      'Proceed to build the minimum working prototype (MVP) or expand to a larger paid test cohort.',
      'Lock in channel acquisition experiments next.'
    );
  } else {
    verdict = 'EXPLORING';
    reasons.push(
      `${testedCount} of ${assumptions.length} assumptions tested (${validatedCount} passed, ${invalidatedCount} failed).`,
      `Current empirical confidence is ${confidenceScore}%. Additional evidence required to reach threshold.`
    );
    recommendations.push(
      'Continue testing the remaining top untested assumptions.',
      'Ensure sample sizes exceed 10+ student participants for statistical strength.'
    );
  }

  return {
    verdict,
    confidenceScore,
    totalAssumptions: assumptions.length,
    testedCount,
    validatedCount,
    invalidatedCount,
    criticalInvalidatedCount,
    reasons,
    recommendations,
  };
}
