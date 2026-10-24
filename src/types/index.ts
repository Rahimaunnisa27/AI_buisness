export type AssumptionCategory = 'desirability' | 'feasibility' | 'viability' | 'usability';

export type AssumptionStatus = 'untested' | 'testing' | 'validated' | 'invalidated';

export interface BusinessIdea {
  id: string;
  title: string;
  targetAudience: string;
  problem: string;
  solution: string;
  revenueModel: string;
  createdAt: string;
}

export interface Assumption {
  id: string;
  ideaId: string;
  description: string;
  category: AssumptionCategory;
  impact: number;      // 1 (Low) to 5 (Critical)
  uncertainty: number; // 1 (Known) to 5 (High Guesswork)
  riskScore: number;   // Calculated: impact * uncertainty (1 - 25)
  status: AssumptionStatus;
  statusReason?: string;
}

export type ExperimentType = 'interview' | 'landing_page' | 'smoke_test' | 'prototype' | 'presale';

export interface Experiment {
  id: string;
  assumptionId: string;
  title: string;
  type: ExperimentType;
  hypothesis: string;
  targetMetricName: string;
  passCriteriaMin: number; // e.g. 20 (meaning 20%)
  metricUnit: string;      // e.g. '% conversion' or 'pre-orders' or 'affirmative responses'
  recommendedSampleSize: number; // e.g. 20 students
  timeframeDays: number;
  budgetDollars: number;
  steps: string[];
}

export interface ExperimentResult {
  id: string;
  experimentId: string;
  loggedAt: string;
  sampleSize: number;
  achievedMetric: number;
  passed: boolean;       // Decided strictly by plain code comparison against passCriteriaMin
  notes: string;
}

export type DecisionVerdict = 'PERSEVERE' | 'PIVOT' | 'KILL' | 'EXPLORING';

export interface VerdictAnalysis {
  verdict: DecisionVerdict;
  confidenceScore: number; // 0 to 100%, calculated strictly from empirical results
  totalAssumptions: number;
  testedCount: number;
  validatedCount: number;
  invalidatedCount: number;
  criticalInvalidatedCount: number;
  reasons: string[];
  recommendations: string[];
}
