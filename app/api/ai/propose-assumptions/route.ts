import { NextResponse } from 'next/server';
import { aiClient } from '@/src/lib/ai/client';
import { calculateRiskScore } from '@/src/lib/scoring/engine';
import { Assumption } from '@/src/types';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { idea } = body;

    if (!idea || !idea.title || !idea.problem) {
      return NextResponse.json(
        { error: 'Missing idea details. Title and problem statement are required.' },
        { status: 400 }
      );
    }

    // AI proposes candidates
    const proposed = await aiClient.proposeAssumptions(idea);

    // Plain code assigns deterministic IDs and calculates riskScore (Impact * Uncertainty)
    const assumptions: Assumption[] = proposed.map((item, idx) => {
      const riskScore = calculateRiskScore(item.impact, item.uncertainty);
      return {
        id: `asm_${Date.now()}_${idx}`,
        ideaId: idea.id,
        description: item.description,
        category: item.category,
        impact: item.impact,
        uncertainty: item.uncertainty,
        riskScore,
        status: 'untested',
      };
    });

    // Plain code sorts in descending order of risk (highest Leap of Faith first)
    assumptions.sort((a, b) => b.riskScore - a.riskScore);

    return NextResponse.json({ success: true, assumptions });
  } catch (err: unknown) {
    console.error('Error in propose-assumptions:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to generate assumptions' },
      { status: 500 }
    );
  }
}
