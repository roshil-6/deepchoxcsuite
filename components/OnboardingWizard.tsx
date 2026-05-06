'use client';

import React, { useState, useEffect } from 'react';
import {
    Building2,
    Target,
    ArrowRight,
    Check,
    Sparkles,
    Briefcase,
    ShieldCheck,
    X,
    ScanSearch,
    PieChart,
} from 'lucide-react';
import { VentureAiAssist, type VentureExtracted } from '@/components/VentureAiAssist';

interface OnboardingWizardProps {
    onComplete: (data: any) => void;
    onSkip: () => void;
}

export function OnboardingWizard({ onComplete, onSkip }: OnboardingWizardProps) {
    const [step, setStep] = useState(1);
    const [formData, setFormData] = useState({
        projectName: '',
        strategicIntent: '',
        industry: '',
        problemStatement: '',
        targetAudience: '',
        primaryGoal: '',
        timeline: '',
        resources: '',
        valueProposition: '',
        challenges: '',
        isAnalyzing: false
    });

    const applyExtracted = (d: VentureExtracted) => {
        setFormData((prev) => ({
            ...prev,
            projectName: d.projectName || prev.projectName,
            strategicIntent: d.strategicIntent || prev.strategicIntent,
            industry: d.industry || prev.industry,
            problemStatement: d.problemStatement || prev.problemStatement,
            targetAudience: d.targetAudience || prev.targetAudience,
            primaryGoal: d.primaryGoal || prev.primaryGoal,
            timeline: d.timeline || prev.timeline,
            resources: d.resources || prev.resources,
            valueProposition: d.valueProposition || prev.valueProposition,
            challenges: d.challenges || prev.challenges,
        }));
    };

    const totalSteps = 4;

    const handleNext = () => {
        if (step < totalSteps) setStep(step + 1);
        else handleComplete();
    };

    const handleComplete = () => {
        setFormData((prev) => ({ ...prev, isAnalyzing: true }));
        setTimeout(() => {
            setFormData((prev) => {
                const { isAnalyzing: _a, ...rest } = prev;
                onComplete(rest);
                return prev;
            });
        }, 2500);
    };

    if (formData.isAnalyzing) {
        return (
            <div className="fixed inset-0 z-[100] bg-[#111113] flex flex-col items-center justify-center p-10 animate-in fade-in duration-700">
                <div className="relative">
                    <div className="w-32 h-32 rounded-full border-2 border-zinc-900 flex items-center justify-center">
                        <Sparkles className="w-12 h-12 text-[#0D9488] animate-pulse" />
                    </div>
                    <div className="absolute inset-0 w-32 h-32 rounded-full border-t-2 border-[#0D9488] animate-spin"></div>
                </div>
                <h2 className="text-3xl font-extrabold text-zinc-100 mt-12 mb-4 tracking-tight">Synthesizing Executive Brief</h2>
                <p className="text-zinc-500 font-bold uppercase tracking-[0.3em] text-xs">Syncing AI teammates to your venture</p>

                <div className="mt-12 w-64 h-1.5 bg-zinc-900 rounded-full overflow-hidden border border-zinc-800">
                    <div className="h-full bg-[#0D9488] animate-[loading_2.5s_ease-in-out]"></div>
                </div>
            </div>
        );
    }

    return (
        <div className="fixed inset-0 z-[100] bg-[#111113]/90 backdrop-blur-2xl flex items-center justify-center p-6 sm:p-10 animate-in fade-in duration-500">
            <div className="flex w-full max-w-5xl flex-col overflow-hidden rounded-[2.5rem] border border-zinc-900 bg-[#111113] shadow-2xl lg:flex-row">

                {/* Left Sidebar - Progress */}
                <div className="w-full lg:w-80 bg-zinc-950/50 p-10 border-b lg:border-b-0 lg:border-r border-zinc-900 flex flex-col justify-between">
                    <div>
                        <div className="flex items-center gap-3 mb-12">
                            <div className="w-8 h-8 bg-zinc-100 rounded-lg flex items-center justify-center text-[#111113] shadow-lg">
                                <Briefcase className="w-4 h-4" />
                            </div>
                            <span className="font-bold text-zinc-100 tracking-tight">Deepchox</span>
                        </div>

                        <div className="space-y-10">
                            <StepIndicator current={step} stepNumber={1} title="Venture Identity" icon={<Building2 className="w-4 h-4" />} />
                            <StepIndicator current={step} stepNumber={2} title="Problem Space" icon={<ScanSearch className="w-4 h-4" />} />
                            <StepIndicator current={step} stepNumber={3} title="Mission Target" icon={<Target className="w-4 h-4" />} />
                            <StepIndicator current={step} stepNumber={4} title="Fiscal Roadmap" icon={<PieChart className="w-4 h-4" />} />
                        </div>
                    </div>

                    <div className="mt-12 pt-8 border-t border-zinc-900">
                        <div className="flex items-center gap-3 text-zinc-600">
                            <ShieldCheck className="w-4 h-4" />
                            <span className="text-[10px] font-bold uppercase tracking-widest">Executive Protocol Active</span>
                        </div>
                    </div>
                </div>

                {/* Main Form Area */}
                <div className="flex-1 p-10 lg:p-16 flex flex-col bg-[#111113]">
                    <div className="flex justify-between items-start mb-12">
                        <div>
                            <p className="text-[#0D9488] font-bold text-[10px] uppercase tracking-[0.3em] mb-2">Step 0{step} / 04</p>
                            <h1 className="text-4xl font-extrabold text-zinc-100 tracking-tight">
                                {step === 1 && "Define your venture."}
                                {step === 2 && "The problem space."}
                                {step === 3 && "Core mission goal."}
                                {step === 4 && "Execution timeline."}
                            </h1>
                        </div>
                        <button
                            onClick={onSkip}
                            className="px-4 py-2 text-zinc-600 hover:text-zinc-100 text-[10px] font-bold uppercase tracking-widest transition-colors flex items-center gap-2"
                        >
                            Skip <X className="w-3 h-3" />
                        </button>
                    </div>

                    <div className="flex-1 py-4">
                        {step === 1 && (
                            <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500">
                                <VentureAiAssist onExtracted={applyExtracted} />
                                <div className="space-y-3">
                                    <label className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Venture Name</label>
                                    <input
                                        type="text"
                                        value={formData.projectName}
                                        onChange={(e) => setFormData({ ...formData, projectName: e.target.value })}
                                        placeholder="Enter identifying name..."
                                        className="w-full bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6 text-xl text-zinc-100 placeholder-zinc-800 focus:outline-none focus:border-zinc-500 transition-all font-medium shadow-inner"
                                    />
                                </div>
                                <div className="space-y-3">
                                    <label className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Industry focus</label>
                                    <input
                                        type="text"
                                        value={formData.industry}
                                        onChange={(e) => setFormData({ ...formData, industry: e.target.value })}
                                        placeholder="e.g. Fintech, AI Logistics..."
                                        className="w-full bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6 text-xl text-zinc-100 placeholder-zinc-800 focus:outline-none focus:border-zinc-500 transition-all font-medium shadow-inner"
                                    />
                                </div>
                                <div className="space-y-3">
                                    <label className="text-xs font-bold text-zinc-500 uppercase tracking-widest">
                                        Strategic intent <span className="font-normal text-zinc-600 normal-case">(required for AI context)</span>
                                    </label>
                                    <p className="text-[13px] leading-relaxed text-zinc-500">
                                        In 2â€“4 sentences, cover: <strong className="text-zinc-400">what you are building</strong>,{' '}
                                        <strong className="text-zinc-400">for whom</strong>, <strong className="text-zinc-400">why now</strong>, and{' '}
                                        <strong className="text-zinc-400">what success looks like in the next 6â€“12 months</strong>. This becomes the
                                        north star for every desk and the assistant.
                                    </p>
                                    <textarea
                                        value={formData.strategicIntent}
                                        onChange={(e) => setFormData({ ...formData, strategicIntent: e.target.value })}
                                        placeholder="e.g. Weâ€™re building a compliance-first AI cockpit for solo GPs in the UK to run deal flow and LP reporting in one place â€” launching a closed beta in Q2 with 10 design partners and revenue by Q4."
                                        className="w-full bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6 text-lg text-zinc-100 placeholder-zinc-700 focus:outline-none focus:border-zinc-500 transition-all font-medium min-h-[140px] resize-y shadow-inner leading-relaxed"
                                    />
                                </div>
                            </div>
                        )}

                        {step === 2 && (
                            <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-500">
                                <div className="space-y-3">
                                    <label className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Core Conflict</label>
                                    <textarea
                                        value={formData.problemStatement}
                                        onChange={(e) => setFormData({ ...formData, problemStatement: e.target.value })}
                                        placeholder="What specific friction are we resolving?"
                                        className="w-full bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6 text-xl text-zinc-100 placeholder-zinc-800 focus:outline-none focus:border-zinc-500 transition-all font-medium h-36 resize-none shadow-inner"
                                    />
                                </div>
                                <div className="space-y-3">
                                    <label className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Target audience</label>
                                    <textarea
                                        value={formData.targetAudience}
                                        onChange={(e) => setFormData({ ...formData, targetAudience: e.target.value })}
                                        placeholder="Who is this for?"
                                        className="w-full bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6 text-xl text-zinc-100 placeholder-zinc-800 focus:outline-none focus:border-zinc-500 transition-all font-medium h-32 resize-none shadow-inner"
                                    />
                                </div>
                            </div>
                        )}

                        {step === 3 && (
                            <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-500">
                                <div className="space-y-3">
                                    <label className="text-xs font-bold text-zinc-500 uppercase tracking-widest">
                                        Primary objective <span className="font-normal text-zinc-600 normal-case">(measurable)</span>
                                    </label>
                                    <p className="text-[13px] text-zinc-500">Concrete outcome or milestone â€” different from strategic intent above.</p>
                                    <input
                                        type="text"
                                        value={formData.primaryGoal}
                                        onChange={(e) => setFormData({ ...formData, primaryGoal: e.target.value })}
                                        placeholder="e.g. 10 paying pilots by Q3, Â£X MRR, or first regulatory filing submitted"
                                        className="w-full bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6 text-xl text-zinc-100 placeholder-zinc-800 focus:outline-none focus:border-zinc-500 transition-all font-medium shadow-inner"
                                    />
                                </div>
                            </div>
                        )}

                        {step === 4 && (
                            <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-500">
                                <div className="space-y-3">
                                    <label className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Target Timeline</label>
                                    <div className="grid grid-cols-2 gap-4">
                                        {['Q1 (Early Stage)', 'Q2 (Launch)', 'Q3 (Growth)', '12+ Months'].map(time => (
                                            <button
                                                key={time}
                                                onClick={() => setFormData({ ...formData, timeline: time })}
                                                className={`p-6 rounded-2xl border text-sm font-bold uppercase tracking-wider transition-all ${formData.timeline === time
                                                        ? 'bg-zinc-100 text-[#111113] border-zinc-100 shadow-xl'
                                                        : 'bg-zinc-900/30 border-zinc-800 text-zinc-500 hover:border-zinc-700'
                                                    }`}
                                            >
                                                {time}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="mt-12 flex justify-between items-center">
                        <button
                            onClick={() => setStep(prev => Math.max(1, prev - 1))}
                            disabled={step === 1}
                            className="px-6 py-3 text-zinc-600 hover:text-zinc-100 text-[10px] font-bold uppercase tracking-widest transition-colors disabled:opacity-0"
                        >
                            Back
                        </button>
                        <button
                            onClick={handleNext}
                            className="px-10 py-4 bg-zinc-100 text-[#111113] rounded-2xl font-extrabold text-xs uppercase tracking-[0.2em] shadow-2xl hover:bg-white transition-all flex items-center gap-3 shadow-zinc-950/40 translate-y-0 active:translate-y-1"
                        >
                            {step === totalSteps ? "Synchronize" : "Proceed"}
                            <ArrowRight className="w-4 h-4" />
                        </button>
                    </div>
                </div>

            </div>
        </div>
    );
}

function StepIndicator({ current, stepNumber, title, icon }: { current: number, stepNumber: number, title: string, icon: React.ReactNode }) {
    const isCompleted = current > stepNumber;
    const isActive = current === stepNumber;

    return (
        <div className={`flex items-center gap-5 transition-all duration-500 ${isActive ? 'translate-x-2' : ''}`}>
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center border transition-all duration-500 ${isCompleted ? 'bg-[#0D9488]/10 border-[#0D9488]/20 text-[#0D9488]' :
                    isActive ? 'bg-zinc-100 border-zinc-100 text-[#111113] shadow-lg scale-110 shadow-zinc-950/30' :
                        'bg-zinc-900 border-zinc-800 text-zinc-700'
                }`}>
                {isCompleted ? <Check className="w-5 h-5" /> : icon}
            </div>
            <div>
                <div className={`text-[9px] font-bold uppercase tracking-[0.2em] ${isActive ? 'text-[#0D9488]' : 'text-zinc-700'}`}>Step 0{stepNumber}</div>
                <div className={`text-xs font-bold tracking-tight ${isActive ? 'text-zinc-100' : 'text-zinc-700'}`}>{title}</div>
            </div>
        </div>
    );
}

