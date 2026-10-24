import { NextResponse } from 'next/server';
import { aiClient } from '@/src/lib/ai/client';
import { Experiment } from '@/src/types';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { idea, assumption } = body;

    if (!idea || !assumption) {
      return NextResponse.json(
        { error: 'Both idea and target assumption are required.' },
        { status: 400 }
      );
    }

    // AI proposes lean experiments
    const proposed = await aiClient.proposeExperiments(idea, assumption);

    // Plain code sets deterministic IDs and connects to target assumption
    const experiments: Experiment[] = proposed.map((exp, idx) => ({
      ...exp,
      id: `exp_${Date.now()}_${idx}`,
      assumptionId: assumption.id,
    }));

    return NextResponse.json({ success: true, experiments });
  } catch (err: unknown) {
    console.error('Error in propose-experiments:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to generate experiments' },
      { status: 500 }
    );
  }
}
