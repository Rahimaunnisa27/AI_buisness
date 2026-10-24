'use client';

import React, { useState, useMemo } from 'react';
import {
  BusinessIdea,
  Assumption,
  Experiment,
  ExperimentResult,
  AssumptionCategory,
} from '@/src/types';
import {
  calculateRiskScore,
  calculateVerdict,
  evaluateExperimentResult,
} from '@/src/lib/scoring/engine';
import {
  Target,
  FlaskConical,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  TrendingUp,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Plus,
  Trash2,
  RefreshCw,
  BookOpen,
  HelpCircle,
  ChevronRight,
  Sliders,
  Award,
} from 'lucide-react';

// Static sample student ideas for instant 1-click testing
const SAMPLE_IDEAS: BusinessIdea[] = [
  {
    id: 'sample-1',
    title: 'DormBites — Late Night Peer Delivery',
    targetAudience: 'Undergraduate college students living in campus dorms studying past 10 PM',
    problem: 'Campus dining halls close at 8 PM, and commercial delivery apps charge $12 in fees on a $10 late-night order.',
    solution: 'A peer-to-peer mobile web app connecting students in the same residence hall who do snack runs to nearby bodegas for a flat $2.50 peer fee.',
    revenueModel: 'Flat $2.50 delivery fee ($2 to student courier, $0.50 platform fee) + snack placement.',
    createdAt: '2026-01-01',
  },
  {
    id: 'sample-2',
    title: 'SubleaseMatch — Verified Campus Sublets',
    targetAudience: 'University students needing 3-month summer internship housing or study abroad sublets',
    problem: 'Facebook groups are riddled with scammers, fake deposits, and messy ghosting, leading to lost deposits.',
    solution: 'A .edu verified marketplace with escrow deposit protection and digital sublease agreements.',
    revenueModel: '5% escrow platform fee split between tenant and sublessor upon key handover.',
    createdAt: '2026-01-01',
  },
];

export default function ValidateAIPage() {
  // Step navigation: 1 = Idea, 2 = Assumptions, 3 = Experiments, 4 = Results & Verdict
  const [activeStep, setActiveStep] = useState<number>(1);

  // Core State
  const [idea, setIdea] = useState<BusinessIdea>({
    id: 'idea-1',
    title: '',
    targetAudience: '',
    problem: '',
    solution: '',
    revenueModel: '',
    createdAt: '',
  });

  const [assumptions, setAssumptions] = useState<Assumption[]>([]);
  const [experiments, setExperiments] = useState<Experiment[]>([]);
  const [results, setResults] = useState<ExperimentResult[]>([]);

  // UI / Form states
  const [isLoadingAssumptions, setIsLoadingAssumptions] = useState(false);
  const [isLoadingExperiments, setIsLoadingExperiments] = useState(false);
  const [selectedAssumptionId, setSelectedAssumptionId] = useState<string | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // New Custom Assumption Form
  const [showAddAssumption, setShowAddAssumption] = useState(false);
  const [newDesc, setNewDesc] = useState('');
  const [newCat, setNewCat] = useState<AssumptionCategory>('desirability');
  const [newImpact, setNewImpact] = useState<number>(4);
  const [newUncertainty, setNewUncertainty] = useState<number>(4);

  // New Experiment Result Form
  const [loggingExpId, setLoggingExpId] = useState<string | null>(null);
  const [sampleSizeInput, setSampleSizeInput] = useState<number>(15);
  const [metricAchievedInput, setMetricAchievedInput] = useState<number>(20);
  const [notesInput, setNotesInput] = useState<string>('');

  // Plain-Code Deterministic Scoring Evaluation
  const verdictAnalysis = useMemo(() => {
    return calculateVerdict(assumptions, experiments, results);
  }, [assumptions, experiments, results]);

  // Load sample student idea
  const handleLoadSample = (sample: BusinessIdea) => {
    setIdea({ ...sample, id: `idea_${Date.now()}` });
    setAssumptions([]);
    setExperiments([]);
    setResults([]);
    setSelectedAssumptionId(null);
    setErrorMessage(null);
  };

  // Feature 1: AI Proposes Assumptions -> Plain code scores and ranks them
  const handleGenerateAssumptions = async () => {
    if (!idea.title.trim() || !idea.problem.trim()) {
      setErrorMessage('Please provide at least a title and problem statement for your idea.');
      return;
    }
    setErrorMessage(null);
    setIsLoadingAssumptions(true);

    try {
      const res = await fetch('/api/ai/propose-assumptions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idea }),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Failed to propose assumptions');
      }

      const data = await res.json();
      setAssumptions(data.assumptions || []);
      if (data.assumptions && data.assumptions.length > 0) {
        setSelectedAssumptionId(data.assumptions[0].id);
        setActiveStep(2);
      }
    } catch (err: unknown) {
      console.error(err);
      setErrorMessage(err instanceof Error ? err.message : 'Error generating assumptions');
    } finally {
      setIsLoadingAssumptions(false);
    }
  };

  // Add custom assumption with plain-code risk calculation
  const handleAddCustomAssumption = () => {
    if (!newDesc.trim()) return;
    const riskScore = calculateRiskScore(newImpact, newUncertainty);
    const newAsm: Assumption = {
      id: `asm_custom_${Date.now()}`,
      ideaId: idea.id,
      description: newDesc.trim(),
      category: newCat,
      impact: newImpact,
      uncertainty: newUncertainty,
      riskScore,
      status: 'untested',
    };

    const updated = [...assumptions, newAsm].sort((a, b) => b.riskScore - a.riskScore);
    setAssumptions(updated);
    setNewDesc('');
    setShowAddAssumption(false);
  };

  // Update slider ratings for assumption (strictly recalibrated by plain code)
  const handleUpdateRating = (id: string, impact: number, uncertainty: number) => {
    const updated = assumptions.map((asm) => {
      if (asm.id === id) {
        const riskScore = calculateRiskScore(impact, uncertainty);
        return { ...asm, impact, uncertainty, riskScore };
      }
      return asm;
    });
    // Re-sort descending
    updated.sort((a, b) => b.riskScore - a.riskScore);
    setAssumptions(updated);
  };

  const handleDeleteAssumption = (id: string) => {
    setAssumptions(assumptions.filter((a) => a.id !== id));
    setExperiments(experiments.filter((e) => e.assumptionId !== id));
    if (selectedAssumptionId === id) {
      setSelectedAssumptionId(null);
    }
  };

  // Feature 2: Propose Lean Experiments for chosen assumption
  const handleGenerateExperiments = async (targetAssumptionId: string) => {
    const target = assumptions.find((a) => a.id === targetAssumptionId);
    if (!target) return;

    setSelectedAssumptionId(targetAssumptionId);
    setIsLoadingExperiments(true);
    setErrorMessage(null);

    try {
      const res = await fetch('/api/ai/propose-experiments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idea, assumption: target }),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Failed to propose experiments');
      }

      const data = await res.json();
      const newExps: Experiment[] = data.experiments || [];

      // Avoid duplicates
      const existing = experiments.filter((e) => e.assumptionId !== targetAssumptionId);
      setExperiments([...existing, ...newExps]);
      setActiveStep(3);
    } catch (err: unknown) {
      console.error(err);
      setErrorMessage(err instanceof Error ? err.message : 'Error generating experiments');
    } finally {
      setIsLoadingExperiments(false);
    }
  };

  // Feature 3: Log result and let plain code decide pass/fail & recalculate verdict
  const handleSaveResult = (experiment: Experiment) => {
    const passed = evaluateExperimentResult(experiment, metricAchievedInput);
    const newResult: ExperimentResult = {
      id: `res_${Date.now()}`,
      experimentId: experiment.id,
      loggedAt: new Date().toISOString().split('T')[0],
      sampleSize: sampleSizeInput,
      achievedMetric: metricAchievedInput,
      passed,
      notes: notesInput.trim(),
    };

    // Update results list
    const existing = results.filter((r) => r.experimentId !== experiment.id);
    const updatedResults = [...existing, newResult];
    setResults(updatedResults);

    // Update assumption status
    setAssumptions((prev) =>
      prev.map((asm) => {
        if (asm.id === experiment.assumptionId) {
          return {
            ...asm,
            status: passed ? 'validated' : 'invalidated',
            statusReason: passed
              ? `Validated with ${newResult.sampleSize} sample (${newResult.achievedMetric}${experiment.metricUnit})`
              : `Failed threshold (${newResult.achievedMetric}${experiment.metricUnit} vs target ${experiment.passCriteriaMin}${experiment.metricUnit})`,
          };
        }
        return asm;
      })
    );

    setLoggingExpId(null);
    setNotesInput('');
    setActiveStep(4);
  };

  // Filtered assumptions
  const filteredAssumptions = useMemo(() => {
    if (categoryFilter === 'all') return assumptions;
    return assumptions.filter((a) => a.category === categoryFilter);
  }, [assumptions, categoryFilter]);

  const selectedAssumption = useMemo(() => {
    return assumptions.find((a) => a.id === selectedAssumptionId) || assumptions[0] || null;
  }, [assumptions, selectedAssumptionId]);

  const activeExperiments = useMemo(() => {
    if (!selectedAssumption) return [];
    return experiments.filter((e) => e.assumptionId === selectedAssumption.id);
  }, [experiments, selectedAssumption]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-indigo-500 selection:text-white">
      {/* Top Header */}
      <header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-indigo-500 to-violet-500 flex items-center justify-center shadow-lg shadow-indigo-500/20">
              <ShieldCheck className="h-6 w-6 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-lg text-white tracking-tight">ValidateAI</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                  Student Founder Edition
                </span>
              </div>
              <p className="text-xs text-slate-400">Evidence-Based Idea Validation</p>
            </div>
          </div>

          {/* Quick Metrics Bar in Header */}
          <div className="flex items-center gap-4">
            <div className="hidden sm:flex items-center gap-2 bg-slate-800/80 px-3 py-1.5 rounded-lg border border-slate-700/60">
              <span className="text-xs text-slate-400">Confidence Score:</span>
              <span
                className={`font-mono font-bold text-sm ${
                  verdictAnalysis.confidenceScore >= 65
                    ? 'text-emerald-400'
                    : verdictAnalysis.confidenceScore > 0
                    ? 'text-amber-400'
                    : 'text-slate-400'
                }`}
              >
                {verdictAnalysis.confidenceScore}%
              </span>
            </div>

            <div className="flex items-center gap-2 bg-slate-800/80 px-3 py-1.5 rounded-lg border border-slate-700/60">
              <span className="text-xs text-slate-400">Verdict:</span>
              <span
                className={`text-xs font-bold px-2 py-0.5 rounded ${
                  verdictAnalysis.verdict === 'PERSEVERE'
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                    : verdictAnalysis.verdict === 'PIVOT'
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                    : verdictAnalysis.verdict === 'KILL'
                    ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                    : 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
                }`}
              >
                {verdictAnalysis.verdict}
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* Core Rules Callout Banner */}
      <div className="bg-slate-900 border-b border-slate-800 px-4 py-2.5">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-2 text-xs text-slate-300">
          <div className="flex items-center gap-2">
            <Sparkles className="h-3.5 w-3.5 text-indigo-400" />
            <span className="font-semibold text-slate-200">The Validation Engine Rules:</span>
            <span className="text-slate-400">
              AI proposes hypotheses • Plain code calculates scores & verdicts • Confidence rises ONLY from real experiment data
            </span>
          </div>
          <div className="text-[11px] text-slate-400 bg-slate-800/80 px-2 py-0.5 rounded border border-slate-700/50">
            Provider: Swappable via <code className="text-indigo-300">src/lib/ai/client.ts</code>
          </div>
        </div>
      </div>

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-1 w-full space-y-8">
        {errorMessage && (
          <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-sm flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 shrink-0" />
              <span>{errorMessage}</span>
            </div>
            <button
              onClick={() => setErrorMessage(null)}
              className="text-rose-400 hover:text-rose-200 text-xs font-semibold"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Step Navigation Bar */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 bg-slate-900/60 p-1.5 rounded-2xl border border-slate-800/80">
          {[
            { step: 1, title: '1. Business Idea', icon: BookOpen, count: idea.title ? 'Ready' : 'Draft' },
            { step: 2, title: '2. Ranked Assumptions', icon: Sliders, count: `${assumptions.length} total` },
            { step: 3, title: '3. Lean Experiments', icon: FlaskConical, count: `${experiments.length} designed` },
            { step: 4, title: '4. Results & Verdict', icon: Award, count: `${results.length} logged` },
          ].map((item) => {
            const Icon = item.icon;
            const isActive = activeStep === item.step;
            return (
              <button
                key={item.step}
                onClick={() => setActiveStep(item.step)}
                className={`flex items-center justify-between px-4 py-3 rounded-xl text-left transition-all ${
                  isActive
                    ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/25 font-semibold'
                    : 'hover:bg-slate-800/60 text-slate-400 hover:text-slate-200'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Icon className={`h-4 w-4 ${isActive ? 'text-white' : 'text-slate-500'}`} />
                  <span className="text-xs sm:text-sm">{item.title}</span>
                </div>
                <span
                  className={`text-[10px] px-2 py-0.5 rounded-full font-mono ${
                    isActive ? 'bg-indigo-700/80 text-white' : 'bg-slate-800 text-slate-500'
                  }`}
                >
                  {item.count}
                </span>
              </button>
            );
          })}
        </div>

        {/* STEP 1: BUSINESS IDEA INTAKE */}
        {activeStep === 1 && (
          <div className="space-y-6">
            <div className="bg-slate-900/90 rounded-2xl border border-slate-800 p-6 md:p-8 space-y-6 shadow-xl">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
                <div>
                  <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
                    <Target className="h-5 w-5 text-indigo-400" />
                    Step 1: Frame Your Business Idea
                  </h2>
                  <p className="text-xs text-slate-400 mt-1">
                    Describe your project hypothesis. Keep it grounded in real student or customer problems.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-400">Or test with a sample:</span>
                  <div className="flex gap-1.5">
                    {SAMPLE_IDEAS.map((sample, idx) => (
                      <button
                        key={sample.id}
                        onClick={() => handleLoadSample(sample)}
                        className="px-2.5 py-1 text-xs rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 hover:border-slate-600 transition"
                      >
                        Sample #{idx + 1}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-slate-300">Project / Venture Name</label>
                  <input
                    type="text"
                    value={idea.title}
                    onChange={(e) => setIdea({ ...idea, title: e.target.value })}
                    placeholder="e.g. DormBites, NoteSwap, SubleaseMatch"
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 text-sm focus:outline-none focus:border-indigo-500 transition"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-semibold text-slate-300">Target Customer Segment</label>
                  <input
                    type="text"
                    value={idea.targetAudience}
                    onChange={(e) => setIdea({ ...idea, targetAudience: e.target.value })}
                    placeholder="e.g. Undergrad student dorm residents studying late at night"
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 text-sm focus:outline-none focus:border-indigo-500 transition"
                  />
                </div>

                <div className="space-y-2 md:col-span-2">
                  <label className="text-xs font-semibold text-slate-300">The Core Frustrating Problem</label>
                  <textarea
                    rows={2}
                    value={idea.problem}
                    onChange={(e) => setIdea({ ...idea, problem: e.target.value })}
                    placeholder="What specific friction, expense, or pain occurs? What is the current messy workaround?"
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 text-sm focus:outline-none focus:border-indigo-500 transition"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-semibold text-slate-300">Proposed Lean Solution</label>
                  <textarea
                    rows={2}
                    value={idea.solution}
                    onChange={(e) => setIdea({ ...idea, solution: e.target.value })}
                    placeholder="What is the simplest version of the solution you can test?"
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 text-sm focus:outline-none focus:border-indigo-500 transition"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-semibold text-slate-300">Monetization / Business Model</label>
                  <textarea
                    rows={2}
                    value={idea.revenueModel}
                    onChange={(e) => setIdea({ ...idea, revenueModel: e.target.value })}
                    placeholder="How will this be financially sustainable? (e.g. flat delivery fee, commission, subscription)"
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 text-sm focus:outline-none focus:border-indigo-500 transition"
                  />
                </div>
              </div>

              <div className="pt-4 flex justify-end">
                <button
                  disabled={isLoadingAssumptions || !idea.title.trim() || !idea.problem.trim()}
                  onClick={handleGenerateAssumptions}
                  className="px-6 py-3 rounded-xl bg-gradient-to-r from-indigo-500 to-violet-600 hover:from-indigo-400 hover:to-violet-500 disabled:opacity-50 text-white font-semibold text-sm shadow-lg shadow-indigo-500/25 flex items-center gap-2 transition"
                >
                  {isLoadingAssumptions ? (
                    <>
                      <RefreshCw className="h-4 w-4 animate-spin" />
                      Decomposing into Critical Assumptions...
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4" />
                      Decompose & Rank Assumptions
                      <ArrowRight className="h-4 w-4" />
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* STEP 2: RANKED ASSUMPTIONS */}
        {activeStep === 2 && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
                  <Sliders className="h-5 w-5 text-indigo-400" />
                  Step 2: Ranked Assumptions (Leap-of-Faith First)
                </h2>
                <p className="text-xs text-slate-400 mt-1">
                  Plain Code Rule: <code className="text-indigo-300 font-mono">Risk Score = Impact (1-5) × Uncertainty (1-5)</code>. Highest risk assumptions must be tested first.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowAddAssumption(!showAddAssumption)}
                  className="px-3 py-2 text-xs font-semibold rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 flex items-center gap-1.5 transition"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Add Custom
                </button>
                <button
                  onClick={handleGenerateAssumptions}
                  disabled={isLoadingAssumptions}
                  className="px-3 py-2 text-xs font-semibold rounded-xl bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 flex items-center gap-1.5 transition"
                >
                  <RefreshCw className={`h-3.5 w-3.5 ${isLoadingAssumptions ? 'animate-spin' : ''}`} />
                  Re-generate
                </button>
              </div>
            </div>

            {/* Filter Pills */}
            <div className="flex flex-wrap gap-2 text-xs">
              {[
                { key: 'all', label: 'All Categories' },
                { key: 'desirability', label: 'Desirability (Customer Want)' },
                { key: 'viability', label: 'Viability (Will Pay)' },
                { key: 'feasibility', label: 'Feasibility (Can Build)' },
                { key: 'usability', label: 'Usability (Adoption)' },
              ].map((f) => (
                <button
                  key={f.key}
                  onClick={() => setCategoryFilter(f.key)}
                  className={`px-3 py-1.5 rounded-lg border transition ${
                    categoryFilter === f.key
                      ? 'bg-indigo-500/20 border-indigo-500/40 text-indigo-300 font-semibold'
                      : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-300'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>

            {/* Add Custom Form Modal / Inset */}
            {showAddAssumption && (
              <div className="p-5 rounded-2xl bg-slate-900 border border-indigo-500/30 space-y-4">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Plus className="h-4 w-4 text-indigo-400" />
                  Add Custom Startup Assumption
                </h3>
                <div className="space-y-2">
                  <label className="text-xs text-slate-300">Hypothesis Statement</label>
                  <input
                    type="text"
                    value={newDesc}
                    onChange={(e) => setNewDesc(e.target.value)}
                    placeholder="e.g. Students will willingly link their bank account or venmo to pay within 1 minute."
                    className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-sm text-slate-100 focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="text-xs text-slate-300">Category</label>
                    <select
                      value={newCat}
                      onChange={(e) => setNewCat(e.target.value as AssumptionCategory)}
                      className="w-full mt-1 px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-xs text-slate-100"
                    >
                      <option value="desirability">Desirability (Demand)</option>
                      <option value="viability">Viability (Economics)</option>
                      <option value="feasibility">Feasibility (Technical/Ops)</option>
                      <option value="usability">Usability (Friction)</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-slate-300">
                      Impact: <span className="text-indigo-400 font-bold">{newImpact}/5</span> (Fatal if wrong)
                    </label>
                    <input
                      type="range"
                      min={1}
                      max={5}
                      value={newImpact}
                      onChange={(e) => setNewImpact(Number(e.target.value))}
                      className="w-full mt-2 accent-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-slate-300">
                      Uncertainty: <span className="text-indigo-400 font-bold">{newUncertainty}/5</span> (Pure guesswork)
                    </label>
                    <input
                      type="range"
                      min={1}
                      max={5}
                      value={newUncertainty}
                      onChange={(e) => setNewUncertainty(Number(e.target.value))}
                      className="w-full mt-2 accent-indigo-500"
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <button
                    onClick={() => setShowAddAssumption(false)}
                    className="px-3 py-1.5 text-xs text-slate-400 hover:text-slate-200"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleAddCustomAssumption}
                    className="px-4 py-1.5 text-xs font-semibold rounded-lg bg-indigo-600 text-white hover:bg-indigo-500"
                  >
                    Save Assumption
                  </button>
                </div>
              </div>
            )}

            {/* Assumptions List */}
            {filteredAssumptions.length === 0 ? (
              <div className="p-12 text-center rounded-2xl bg-slate-900/40 border border-slate-800/80 space-y-3">
                <HelpCircle className="h-8 w-8 text-slate-500 mx-auto" />
                <p className="text-sm text-slate-400">No assumptions found for this filter.</p>
                <button
                  onClick={() => setActiveStep(1)}
                  className="px-4 py-2 text-xs font-semibold rounded-lg bg-indigo-600 text-white"
                >
                  Return to Step 1 & Propose
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4">
                {filteredAssumptions.map((asm, idx) => {
                  const isTopRisk = idx === 0 && categoryFilter === 'all';
                  const hasExp = experiments.some((e) => e.assumptionId === asm.id);
                  const expResult = results.find((r) => {
                    const matchedExp = experiments.find((e) => e.id === r.experimentId);
                    return matchedExp?.assumptionId === asm.id;
                  });

                  return (
                    <div
                      key={asm.id}
                      className={`p-5 rounded-2xl border transition-all ${
                        isTopRisk
                          ? 'bg-gradient-to-r from-slate-900 to-indigo-950/30 border-indigo-500/40 shadow-lg shadow-indigo-500/10'
                          : 'bg-slate-900/80 border-slate-800/80 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                        <div className="space-y-2 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            {/* Rank badge */}
                            <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                              Rank #{idx + 1}
                            </span>

                            {/* Category Badge */}
                            <span
                              className={`text-xs px-2.5 py-0.5 rounded-full font-medium capitalize ${
                                asm.category === 'desirability'
                                  ? 'bg-purple-500/15 text-purple-300 border border-purple-500/30'
                                  : asm.category === 'viability'
                                  ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                                  : asm.category === 'feasibility'
                                  ? 'bg-blue-500/15 text-blue-300 border border-blue-500/30'
                                  : 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
                              }`}
                            >
                              {asm.category}
                            </span>

                            {/* Risk score callout */}
                            <span
                              className={`text-xs px-2.5 py-0.5 rounded font-mono font-bold ${
                                asm.riskScore >= 16
                                  ? 'bg-rose-500/15 text-rose-300 border border-rose-500/30'
                                  : asm.riskScore >= 10
                                  ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
                                  : 'bg-slate-800 text-slate-400'
                              }`}
                            >
                              Risk Score: {asm.riskScore}/25 {asm.riskScore >= 16 ? '🔥 Leap-of-Faith' : ''}
                            </span>

                            {/* Test Status Badge */}
                            {expResult ? (
                              <span
                                className={`text-xs px-2.5 py-0.5 rounded font-bold flex items-center gap-1 ${
                                  expResult.passed
                                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                                    : 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                                }`}
                              >
                                {expResult.passed ? (
                                  <>
                                    <CheckCircle2 className="h-3 w-3" /> Validated
                                  </>
                                ) : (
                                  <>
                                    <XCircle className="h-3 w-3" /> Invalidated
                                  </>
                                )}
                              </span>
                            ) : (
                              <span className="text-xs px-2 py-0.5 rounded bg-slate-800 text-slate-500">
                                Untested
                              </span>
                            )}
                          </div>

                          <p className="text-sm font-medium text-slate-100 leading-relaxed">
                            {asm.description}
                          </p>

                          {asm.statusReason && (
                            <p className="text-xs text-slate-400 italic">
                              Result: {asm.statusReason}
                            </p>
                          )}
                        </div>

                        {/* Interactive Plain-Code Sliders & Actions */}
                        <div className="flex flex-col sm:flex-row lg:flex-col items-end gap-3 shrink-0">
                          <div className="flex items-center gap-3 bg-slate-950/80 px-3 py-2 rounded-xl border border-slate-800 text-xs">
                            <div className="space-y-1">
                              <span className="text-[10px] text-slate-400">Impact: <strong>{asm.impact}</strong></span>
                              <input
                                type="range"
                                min={1}
                                max={5}
                                value={asm.impact}
                                onChange={(e) => handleUpdateRating(asm.id, Number(e.target.value), asm.uncertainty)}
                                className="w-16 accent-indigo-500 block"
                              />
                            </div>
                            <div className="space-y-1">
                              <span className="text-[10px] text-slate-400">Uncertainty: <strong>{asm.uncertainty}</strong></span>
                              <input
                                type="range"
                                min={1}
                                max={5}
                                value={asm.uncertainty}
                                onChange={(e) => handleUpdateRating(asm.id, asm.impact, Number(e.target.value))}
                                className="w-16 accent-indigo-500 block"
                              />
                            </div>
                            <button
                              onClick={() => handleDeleteAssumption(asm.id)}
                              className="text-slate-500 hover:text-rose-400 p-1 transition"
                              title="Delete assumption"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>

                          <button
                            onClick={() => handleGenerateExperiments(asm.id)}
                            disabled={isLoadingExperiments && selectedAssumptionId === asm.id}
                            className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition ${
                              isTopRisk
                                ? 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-600/30'
                                : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700'
                            }`}
                          >
                            {isLoadingExperiments && selectedAssumptionId === asm.id ? (
                              <>
                                <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                                Designing Lean Test...
                              </>
                            ) : (
                              <>
                                <FlaskConical className="h-3.5 w-3.5" />
                                {hasExp ? 'View / Re-Design Test' : 'Design Lean Test'}
                                <ChevronRight className="h-3.5 w-3.5" />
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* STEP 3: LEAN EXPERIMENTS */}
        {activeStep === 3 && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
                  <FlaskConical className="h-5 w-5 text-indigo-400" />
                  Step 3: Lean Experiment Design
                </h2>
                <p className="text-xs text-slate-400 mt-1">
                  Budget: Near $0 • Time: 1 to 5 Days • Clear Pass/Fail threshold before running.
                </p>
              </div>

              {selectedAssumption && (
                <button
                  onClick={() => handleGenerateExperiments(selectedAssumption.id)}
                  disabled={isLoadingExperiments}
                  className="px-3 py-2 text-xs font-semibold rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 flex items-center gap-1.5 transition"
                >
                  <RefreshCw className={`h-3.5 w-3.5 ${isLoadingExperiments ? 'animate-spin' : ''}`} />
                  Propose Alternate Experiments
                </button>
              )}
            </div>

            {/* Target Assumption Banner */}
            {selectedAssumption && (
              <div className="p-4 rounded-xl bg-indigo-950/30 border border-indigo-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-400">
                    Testing Target Assumption ({selectedAssumption.category})
                  </span>
                  <p className="text-sm font-semibold text-white">
                    "{selectedAssumption.description}"
                  </p>
                </div>
                <div className="font-mono text-xs font-bold text-indigo-300 bg-indigo-900/60 px-3 py-1 rounded-lg border border-indigo-500/20 shrink-0">
                  Risk: {selectedAssumption.riskScore}/25
                </div>
              </div>
            )}

            {/* Experiments List */}
            {activeExperiments.length === 0 ? (
              <div className="p-12 text-center rounded-2xl bg-slate-900/40 border border-slate-800/80 space-y-3">
                <FlaskConical className="h-8 w-8 text-slate-500 mx-auto" />
                <p className="text-sm text-slate-400">
                  No experiments designed for this assumption yet.
                </p>
                {selectedAssumption && (
                  <button
                    onClick={() => handleGenerateExperiments(selectedAssumption.id)}
                    className="px-4 py-2 text-xs font-semibold rounded-lg bg-indigo-600 text-white"
                  >
                    Propose Lean Experiments
                  </button>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {activeExperiments.map((exp) => {
                  const loggedRes = results.find((r) => r.experimentId === exp.id);
                  const isLogging = loggingExpId === exp.id;

                  return (
                    <div
                      key={exp.id}
                      className="p-6 rounded-2xl bg-slate-900 border border-slate-800 flex flex-col justify-between space-y-4 hover:border-slate-700 transition"
                    >
                      <div className="space-y-3">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-[11px] font-bold uppercase px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                            {exp.type.replace('_', ' ')}
                          </span>
                          <span className="text-xs text-slate-400 font-mono">
                            {exp.timeframeDays} days • ${exp.budgetDollars} budget
                          </span>
                        </div>

                        <h3 className="text-base font-bold text-white tracking-tight">
                          {exp.title}
                        </h3>

                        <p className="text-xs text-slate-300 bg-slate-950 p-3 rounded-xl border border-slate-800/80">
                          <strong className="text-indigo-300 font-semibold">Hypothesis: </strong>
                          {exp.hypothesis}
                        </p>

                        {/* Pass Threshold Callout */}
                        <div className="p-3 rounded-xl bg-slate-800/60 border border-slate-700/60 space-y-1 text-xs">
                          <div className="flex items-center justify-between text-slate-300 font-semibold">
                            <span>Target Metric: {exp.targetMetricName}</span>
                            <span className="text-emerald-400 font-mono">
                              &gt;= {exp.passCriteriaMin}{exp.metricUnit}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-400">
                            Recommended Sample Size: &gt;= {exp.recommendedSampleSize} target students
                          </p>
                        </div>

                        {/* Protocol Steps */}
                        <div className="space-y-1.5">
                          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                            Execution Protocol:
                          </span>
                          <ol className="list-decimal list-inside text-xs text-slate-300 space-y-1">
                            {exp.steps.map((st, i) => (
                              <li key={i}>{st}</li>
                            ))}
                          </ol>
                        </div>
                      </div>

                      {/* Log Result Section */}
                      <div className="pt-4 border-t border-slate-800">
                        {loggedRes ? (
                          <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between">
                            <div className="text-xs space-y-0.5">
                              <span className="text-[11px] text-slate-400">Logged on {loggedRes.loggedAt}:</span>
                              <p className="font-semibold text-slate-200">
                                {loggedRes.sampleSize} sample • {loggedRes.achievedMetric}{exp.metricUnit}
                              </p>
                            </div>
                            <span
                              className={`text-xs font-bold px-2 py-1 rounded flex items-center gap-1 ${
                                loggedRes.passed
                                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                  : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                              }`}
                            >
                              {loggedRes.passed ? <CheckCircle2 className="h-3.5 w-3.5" /> : <XCircle className="h-3.5 w-3.5" />}
                              {loggedRes.passed ? 'PASSED' : 'FAILED'}
                            </span>
                          </div>
                        ) : isLogging ? (
                          <div className="p-4 rounded-xl bg-slate-950 border border-indigo-500/40 space-y-3">
                            <h4 className="text-xs font-bold text-indigo-300">
                              Enter Real Experiment Evidence
                            </h4>
                            <div className="grid grid-cols-2 gap-3 text-xs">
                              <div>
                                <label className="text-slate-400">Sample Size (Students)</label>
                                <input
                                  type="number"
                                  min={1}
                                  value={sampleSizeInput}
                                  onChange={(e) => setSampleSizeInput(Number(e.target.value))}
                                  className="w-full mt-1 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-white font-mono"
                                />
                              </div>
                              <div>
                                <label className="text-slate-400">
                                  Achieved ({exp.metricUnit})
                                </label>
                                <input
                                  type="number"
                                  value={metricAchievedInput}
                                  onChange={(e) => setMetricAchievedInput(Number(e.target.value))}
                                  className="w-full mt-1 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-white font-mono"
                                />
                              </div>
                            </div>

                            <div>
                              <label className="text-xs text-slate-400">Founder Notes & Direct Quotes</label>
                              <textarea
                                rows={2}
                                value={notesInput}
                                onChange={(e) => setNotesInput(e.target.value)}
                                placeholder="What exact patterns did you observe? What words did students repeat?"
                                className="w-full mt-1 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-xs text-white"
                              />
                            </div>

                            <div className="flex justify-end gap-2">
                              <button
                                onClick={() => setLoggingExpId(null)}
                                className="px-3 py-1.5 text-xs text-slate-400"
                              >
                                Cancel
                              </button>
                              <button
                                onClick={() => handleSaveResult(exp)}
                                className="px-4 py-1.5 text-xs font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white flex items-center gap-1.5"
                              >
                                <CheckCircle2 className="h-3.5 w-3.5" />
                                Record Evidence
                              </button>
                            </div>
                          </div>
                        ) : (
                          <button
                            onClick={() => {
                              setLoggingExpId(exp.id);
                              setMetricAchievedInput(exp.passCriteriaMin);
                            }}
                            className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center justify-center gap-1.5 transition"
                          >
                            <TrendingUp className="h-3.5 w-3.5 text-indigo-400" />
                            Log Experiment Result
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* STEP 4: RESULTS & PLAIN-CODE VERDICT */}
        {activeStep === 4 && (
          <div className="space-y-8">
            <div>
              <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
                <Award className="h-5 w-5 text-indigo-400" />
                Step 4: Empirical Verdict Center
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                Plain code decides. Confidence rises strictly from proven results, zero AI opinion.
              </p>
            </div>

            {/* Verdict Hero Card */}
            <div
              className={`p-6 md:p-8 rounded-3xl border transition-all ${
                verdictAnalysis.verdict === 'PERSEVERE'
                  ? 'bg-gradient-to-br from-emerald-950/40 via-slate-900 to-slate-950 border-emerald-500/40 shadow-2xl shadow-emerald-500/10'
                  : verdictAnalysis.verdict === 'PIVOT'
                  ? 'bg-gradient-to-br from-amber-950/40 via-slate-900 to-slate-950 border-amber-500/40 shadow-2xl shadow-amber-500/10'
                  : verdictAnalysis.verdict === 'KILL'
                  ? 'bg-gradient-to-br from-rose-950/40 via-slate-900 to-slate-950 border-rose-500/40 shadow-2xl shadow-rose-500/10'
                  : 'bg-gradient-to-br from-indigo-950/40 via-slate-900 to-slate-950 border-indigo-500/40 shadow-2xl shadow-indigo-500/10'
              }`}
            >
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-slate-800">
                <div className="space-y-2">
                  <span className="text-xs font-bold tracking-wider uppercase text-slate-400">
                    Calculated Decision Verdict
                  </span>
                  <div className="flex items-center gap-4">
                    <span
                      className={`text-3xl md:text-4xl font-extrabold tracking-tight ${
                        verdictAnalysis.verdict === 'PERSEVERE'
                          ? 'text-emerald-400'
                          : verdictAnalysis.verdict === 'PIVOT'
                          ? 'text-amber-400'
                          : verdictAnalysis.verdict === 'KILL'
                          ? 'text-rose-400'
                          : 'text-indigo-400'
                      }`}
                    >
                      {verdictAnalysis.verdict}
                    </span>
                    <span className="text-xs text-slate-400 max-w-xs leading-relaxed">
                      {verdictAnalysis.verdict === 'PERSEVERE' && 'Critical customer demand confirmed with data. Proceed to build MVP.'}
                      {verdictAnalysis.verdict === 'PIVOT' && 'A key hypothesis failed. Modify audience or pricing structure before building.'}
                      {verdictAnalysis.verdict === 'KILL' && 'Core foundational assumptions failed test. Save capital and kill this project.'}
                      {verdictAnalysis.verdict === 'EXPLORING' && 'Gathering preliminary validation. Run more lean experiment sprints.'}
                    </span>
                  </div>
                </div>

                {/* Big Confidence Score Gauge */}
                <div className="flex items-center gap-4 bg-slate-950/80 p-4 rounded-2xl border border-slate-800 shrink-0">
                  <div className="space-y-1">
                    <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">
                      Confidence Score
                    </span>
                    <div className="font-mono text-3xl font-extrabold text-white">
                      {verdictAnalysis.confidenceScore}%
                    </div>
                    <span className="text-[10px] text-slate-500 block">
                      Strict empirical evidence ratio
                    </span>
                  </div>
                  <div className="w-16 h-16 rounded-full border-4 border-slate-800 flex items-center justify-center relative">
                    <div
                      className={`absolute inset-0 rounded-full border-4 border-t-transparent ${
                        verdictAnalysis.confidenceScore >= 65
                          ? 'border-emerald-500'
                          : verdictAnalysis.confidenceScore > 0
                          ? 'border-amber-500'
                          : 'border-slate-700'
                      }`}
                      style={{ transform: `rotate(${(verdictAnalysis.confidenceScore / 100) * 360}deg)` }}
                    />
                    <TrendingUp className="h-6 w-6 text-slate-400" />
                  </div>
                </div>
              </div>

              {/* Rationale & Recommendations */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-6">
                <div className="space-y-3">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                    <ShieldCheck className="h-4 w-4 text-indigo-400" />
                    Plain-Code Rationale Breakdown
                  </h4>
                  <ul className="space-y-2 text-xs text-slate-300">
                    {verdictAnalysis.reasons.map((r, i) => (
                      <li key={i} className="flex items-start gap-2 bg-slate-950/50 p-2.5 rounded-xl border border-slate-800/80">
                        <span className="text-indigo-400 font-bold">•</span>
                        <span>{r}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="space-y-3">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                    <Target className="h-4 w-4 text-emerald-400" />
                    Recommended Next Actions
                  </h4>
                  <ul className="space-y-2 text-xs text-slate-300">
                    {verdictAnalysis.recommendations.map((rec, i) => (
                      <li key={i} className="flex items-start gap-2 bg-slate-950/50 p-2.5 rounded-xl border border-slate-800/80">
                        <ArrowRight className="h-3.5 w-3.5 text-emerald-400 shrink-0 mt-0.5" />
                        <span>{rec}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>

            {/* Evidence Audit Table */}
            <div className="bg-slate-900 rounded-2xl border border-slate-800 p-6 space-y-4">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <BookOpen className="h-4 w-4 text-indigo-400" />
                Evidence Log & Experiment Audit
              </h3>

              {results.length === 0 ? (
                <p className="text-xs text-slate-400 py-4 text-center">
                  No experiment results logged yet. Go to Step 3 to execute and record experiments.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs text-slate-300">
                    <thead className="bg-slate-950 text-slate-400 font-mono border-b border-slate-800">
                      <tr>
                        <th className="py-2.5 px-3">Date</th>
                        <th className="py-2.5 px-3">Experiment</th>
                        <th className="py-2.5 px-3">Sample</th>
                        <th className="py-2.5 px-3">Achieved</th>
                        <th className="py-2.5 px-3">Result</th>
                        <th className="py-2.5 px-3">Founder Notes</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800">
                      {results.map((res) => {
                        const matchedExp = experiments.find((e) => e.id === res.experimentId);
                        return (
                          <tr key={res.id} className="hover:bg-slate-800/40">
                            <td className="py-3 px-3 font-mono text-slate-400">{res.loggedAt}</td>
                            <td className="py-3 px-3 font-semibold text-white">
                              {matchedExp?.title || res.experimentId}
                            </td>
                            <td className="py-3 px-3 font-mono">{res.sampleSize} students</td>
                            <td className="py-3 px-3 font-mono text-indigo-300 font-bold">
                              {res.achievedMetric}{matchedExp?.metricUnit}
                            </td>
                            <td className="py-3 px-3">
                              <span
                                className={`px-2 py-0.5 rounded font-bold text-[11px] ${
                                  res.passed
                                    ? 'bg-emerald-500/20 text-emerald-300'
                                    : 'bg-rose-500/20 text-rose-300'
                                }`}
                              >
                                {res.passed ? 'PASSED' : 'FAILED'}
                              </span>
                            </td>
                            <td className="py-3 px-3 text-slate-400 max-w-xs truncate">
                              {res.notes || '—'}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800/80 bg-slate-950 py-6 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>ValidateAI • Empowering student founders with lean evidence</span>
          <span>Plain code decides • Zero AI hallucinations in scoring</span>
        </div>
      </footer>
    </div>
  );
}
