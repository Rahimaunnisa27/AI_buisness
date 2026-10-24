/**
 * ValidateAI Unified AI Client
 * 
 * CORE RULES:
 * 1. All AI calls MUST go through this file so the provider can be swapped.
 * 2. Never hardcode API keys. Reads strictly from process.env.
 * 3. AI proposes; plain code decides. AI only provides drafts/hypotheses.
 * 4. Includes intelligent fallback mock engine if no key is configured in .env.local,
 *    so student founders can test immediately without setup friction.
 */

import { BusinessIdea, Assumption, Experiment, AssumptionCategory, ExperimentType } from '@/src/types';

export interface AIClientConfig {
  provider: 'gemini' | 'openai' | 'mock';
  apiKey?: string;
  model?: string;
}

class AIClient {
  private config: AIClientConfig;

  constructor() {
    const provider = (process.env.AI_PROVIDER as 'gemini' | 'openai') || 'gemini';
    const apiKey = provider === 'gemini' 
      ? process.env.GEMINI_API_KEY 
      : process.env.OPENAI_API_KEY;

    this.config = {
      provider: apiKey ? provider : 'mock',
      apiKey,
      model: provider === 'gemini' ? 'gemini-1.5-flash' : 'gpt-4o-mini',
    };
  }

  /**
   * Generates a candidate set of ranked assumptions across the 4 core dimensions:
   * Desirability, Feasibility, Viability, Usability.
   */
  async proposeAssumptions(
    idea: BusinessIdea
  ): Promise<Omit<Assumption, 'id' | 'ideaId' | 'riskScore' | 'status'>[]> {
    if (this.config.provider === 'gemini' && this.config.apiKey) {
      try {
        return await this.callGeminiForAssumptions(idea);
      } catch (err) {
        console.warn('[ValidateAI AIClient] Gemini API call failed, falling back to heuristic engine:', err);
        return this.getMockAssumptions(idea);
      }
    }
    
    // Default smart deterministic fallback generator
    return this.getMockAssumptions(idea);
  }

  /**
   * Generates lean, low-cost experiment proposals tailored for student founders.
   */
  async proposeExperiments(
    idea: BusinessIdea,
    assumption: Assumption
  ): Promise<Omit<Experiment, 'id' | 'assumptionId'>[]> {
    if (this.config.provider === 'gemini' && this.config.apiKey) {
      try {
        return await this.callGeminiForExperiments(idea, assumption);
      } catch (err) {
        console.warn('[ValidateAI AIClient] Gemini API call failed, falling back to heuristic engine:', err);
        return this.getMockExperiments(idea, assumption);
      }
    }

    return this.getMockExperiments(idea, assumption);
  }

  // --- GEMINI REST INTEGRATION ---
  private async callGeminiForAssumptions(
    idea: BusinessIdea
  ): Promise<Omit<Assumption, 'id' | 'ideaId' | 'riskScore' | 'status'>[]> {
    const prompt = `
You are an expert startup advisor for student founders following Steve Blank and Strategyzer methodology.
Analyze this student startup idea:
Title: ${idea.title}
Target Audience: ${idea.targetAudience}
Problem: ${idea.problem}
Proposed Solution: ${idea.solution}
Revenue Model: ${idea.revenueModel}

Propose 4 to 6 critical foundational assumptions.
Cover at least:
- Desirability (Do students really want this and feel this pain?)
- Viability (Will they or someone else pay enough to sustain it?)
- Feasibility (Can student founders realistically build or source this?)
- Usability (Will students adopt it into their daily habits?)

Provide numerical ratings:
- impact: 1 (low) to 5 (fatal if wrong)
- uncertainty: 1 (fairly known) to 5 (pure guess)

Return strictly valid JSON in this exact structure without markdown backticks:
[
  {
    "description": "string",
    "category": "desirability" | "feasibility" | "viability" | "usability",
    "impact": 5,
    "uncertainty": 4
  }
]
`;

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${this.config.model}:generateContent?key=${this.config.apiKey}`;
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { responseMimeType: 'application/json', temperature: 0.4 },
      }),
    });

    if (!response.ok) {
      throw new Error(`Gemini HTTP error: ${response.statusText}`);
    }

    const data = await response.json();
    const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text;
    const cleanText = rawText.replace(/\`\`\`json/g, '').replace(/\`\`\`/g, '').trim();
    return JSON.parse(cleanText);
  }

  private async callGeminiForExperiments(
    idea: BusinessIdea,
    assumption: Assumption
  ): Promise<Omit<Experiment, 'id' | 'assumptionId'>[]> {
    const prompt = `
You are a lean startup coach for student entrepreneurs with near-zero budget.
Business: ${idea.title} - ${idea.problem} -> ${idea.solution}
Target Assumption: "${assumption.description}" (Category: ${assumption.category}, Impact: ${assumption.impact}/5, Uncertainty: ${assumption.uncertainty}/5)

Propose 2 lean, actionable, evidence-based experiments that a student can execute in 1 to 5 days with under $20 budget.
Examples: 10 structured interviews with a specific validation threshold, a simple Carrd/Notion smoke test page with pre-order button, a concierge manual delivery test.

Return strictly valid JSON in this structure without markdown backticks:
[
  {
    "title": "string",
    "type": "interview" | "landing_page" | "smoke_test" | "prototype" | "presale",
    "hypothesis": "string",
    "targetMetricName": "string",
    "passCriteriaMin": number,
    "metricUnit": "string",
    "recommendedSampleSize": number,
    "timeframeDays": number,
    "budgetDollars": number,
    "steps": ["step 1", "step 2", "step 3"]
  }
]
`;

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${this.config.model}:generateContent?key=${this.config.apiKey}`;
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { responseMimeType: 'application/json', temperature: 0.3 },
      }),
    });

    if (!response.ok) {
      throw new Error(`Gemini HTTP error: ${response.statusText}`);
    }

    const data = await response.json();
    const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text;
    const cleanText = rawText.replace(/\`\`\`json/g, '').replace(/\`\`\`/g, '').trim();
    return JSON.parse(cleanText);
  }

  // --- SMART HEURISTIC FALLBACK (Zero API Key friction) ---
  private getMockAssumptions(
    idea: BusinessIdea
  ): Omit<Assumption, 'id' | 'ideaId' | 'riskScore' | 'status'>[] {
    const aud = idea.targetAudience.toLowerCase();
    const isStudent = aud.includes('student') || aud.includes('campus') || aud.includes('university');

    return [
      {
        description: isStudent
          ? `Target students experience '${idea.problem.slice(0, 70)}' at least weekly and actively search for a solution.`
          : `Customers urgently suffer from '${idea.problem.slice(0, 70)}' and find current workarounds inadequate.`,
        category: 'desirability',
        impact: 5,
        uncertainty: 4,
      },
      {
        description: `Target users are willing to pay for this via ${idea.revenueModel || 'direct subscription'} rather than expecting a free tool.`,
        category: 'viability',
        impact: 5,
        uncertainty: 5,
      },
      {
        description: `Student founders can deliver the core value '${idea.solution.slice(0, 70)}' without expensive proprietary tech or licensing.`,
        category: 'feasibility',
        impact: 4,
        uncertainty: 3,
      },
      {
        description: `Users will adopt this workflow into their routine without needing more than 2 minutes of onboarding friction.`,
        category: 'usability',
        impact: 3,
        uncertainty: 4,
      },
      {
        description: `Direct peer-to-peer or campus word-of-mouth will generate organic adoption with zero paid ad budget.`,
        category: 'desirability',
        impact: 4,
        uncertainty: 4,
      },
    ];
  }

  private getMockExperiments(
    idea: BusinessIdea,
    assumption: Assumption
  ): Omit<Experiment, 'id' | 'assumptionId'>[] {
    if (assumption.category === 'viability') {
      return [
        {
          title: 'Skin-in-the-game Pre-Order / Commit Test',
          type: 'presale',
          hypothesis: `If presented with our proposed pricing for '${idea.title}', at least 20% of interested users will put down a deposit or commitment.`,
          targetMetricName: 'Deposit / Pre-order conversion rate',
          passCriteriaMin: 20,
          metricUnit: '% deposit rate',
          recommendedSampleSize: 15,
          timeframeDays: 3,
          budgetDollars: 0,
          steps: [
            'Create a 1-page Notion doc or Google Form explaining the exact offer and discount for founding cohorts.',
            'Share directly with 15 qualified target users who confirmed they have the problem.',
            'Ask for a $5 refundable deposit or signed intent-to-purchase letter.',
            'Record how many actually commit vs. claim they would "maybe buy later".',
          ],
        },
        {
          title: 'Price Sensitivity Discovery Interviews',
          type: 'interview',
          hypothesis: 'Target customers currently spend money or significant time on inferior alternatives.',
          targetMetricName: 'Affirmative budget verification',
          passCriteriaMin: 60,
          metricUnit: '% users with active budget',
          recommendedSampleSize: 10,
          timeframeDays: 2,
          budgetDollars: 0,
          steps: [
            'Interview 10 target users in person or on Zoom.',
            'Use "The Mom Test" rules: never ask "Would you buy this?". Instead ask "What did you spend last month solving this?".',
            'Count how many actively invested resources to fix the problem.',
          ],
        },
      ];
    }

    if (assumption.category === 'desirability') {
      return [
        {
          title: 'Problem-Validation "Mom Test" 10-Interview Sprint',
          type: 'interview',
          hypothesis: 'At least 7 out of 10 students will spontaneously cite this problem as a top-3 painful frustration.',
          targetMetricName: 'High-pain spontaneous confirmation',
          passCriteriaMin: 70,
          metricUnit: '% strong pain confirmed',
          recommendedSampleSize: 10,
          timeframeDays: 2,
          budgetDollars: 0,
          steps: [
            'Find 10 target users in the library, student union, or relevant Discord/Slack channels.',
            'Ask open-ended questions about their last time encountering the issue: "Tell me about the last time that happened...".',
            'Rate evidence strength: did they express intense emotion or show existing messy workarounds?',
            'Log pass if >= 7 confirm extreme recurring friction.',
          ],
        },
        {
          title: '48-Hour Fake-Door Landing Page Test',
          type: 'smoke_test',
          hypothesis: 'A clear value proposition page will generate > 15% email/waitlist conversions from campus traffic.',
          targetMetricName: 'Waitlist conversion rate',
          passCriteriaMin: 15,
          metricUnit: '% signup rate',
          recommendedSampleSize: 50,
          timeframeDays: 2,
          budgetDollars: 5,
          steps: [
            'Deploy a clean single-page site with a 1-sentence hook and "Join Founding Batch" CTA.',
            'Post the link to 2 campus bulletin boards, Reddit/campus groups, or student group chats.',
            'Track visitor count vs. valid email signups.',
            'Log pass if conversion >= 15%.',
          ],
        },
      ];
    }

    // Default prototype or feasibility
    return [
      {
        title: 'Concierge Manual MVP (Wizard of Oz Test)',
        type: 'prototype',
        hypothesis: 'Manually delivering the service for 5 student users generates repeat usage without automation.',
        targetMetricName: 'User satisfaction / completion rate',
        passCriteriaMin: 80,
        metricUnit: '% repeat or completed runs',
        recommendedSampleSize: 5,
        timeframeDays: 4,
        budgetDollars: 0,
        steps: [
          'Personally perform the solution behind the scenes using WhatsApp/Google Sheets.',
          'Deliver to 5 target student customers.',
          'Measure whether they complete the workflow and ask when they can use it again.',
        ],
      },
    ];
  }
}

// Export singleton instance
export const aiClient = new AIClient();
export default aiClient;
