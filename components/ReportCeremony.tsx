'use client';

import React, { useState } from 'react';
import { useOffice } from '@/lib/OfficeContext';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { motion, AnimatePresence } from 'framer-motion';
import { FileText, CheckCircle2, Lock, Loader2, Download, Target, ClipboardList, Calculator, ScanSearch } from 'lucide-react';
import { NOISE_DATA_URL } from '@/lib/noiseTexture';

export function ReportCeremony({ onClose }: { onClose: () => void }) {
    const { activeProject } = useOffice();
    const [step, setStep] = useState<'preview' | 'generating' | 'done'>('preview');
    const [signingAgent, setSigningAgent] = useState<string | null>(null);

    const generatePDF = async () => {
        if (!activeProject) return;

        setStep('generating');

        // Simulation of "Signing Ceremony"
        const agents = ['CEO Strategist', 'Product Manager', 'CFO', 'Scout'];
        for (const agent of agents) {
            setSigningAgent(agent);
            await new Promise(r => setTimeout(r, 800)); // Delay for effect
        }
        setSigningAgent(null);

        // Actual Generation
        const doc = new jsPDF();
        // Use standard white paper for PDF, even if app is dark mode
        const white = [255, 255, 255];
        const black = [0, 0, 0];

        // === PAGE 1: STRATEGY ===
        doc.setFillColor(white[0], white[1], white[2]);
        doc.rect(0, 0, 210, 297, 'F');

        // Brand Header
        doc.setTextColor(black[0], black[1], black[2]);
        doc.setFontSize(10);
        doc.text("northROCS LABS · Deepchox — STRATEGIC REPORT", 20, 15);
        doc.text(`CONFIDENTIAL // ${new Date().toLocaleDateString()}`, 150, 15);

        // Title
        doc.setFontSize(28);
        doc.setFont("times", "bold");
        doc.text(activeProject.name.toUpperCase(), 20, 40);

        doc.setFontSize(14);
        doc.setFont("times", "normal");
        doc.text("Executive Blueprint & Market Feasibility", 20, 50);

        // CEO Section
        doc.setFontSize(18);
        doc.text("1. Strategic Vision (CEO)", 20, 70);

        doc.setFontSize(11);
        const strategyText = activeProject.strategy ? JSON.parse(activeProject.strategy).content || activeProject.strategy : "No strategy data available.";
        const splitStrategy = doc.splitTextToSize(strategyText, 170);
        doc.text(splitStrategy, 20, 80);

        // === PAGE 2: FINANCIALS ===
        doc.addPage();
        doc.setFillColor(white[0], white[1], white[2]);
        doc.rect(0, 0, 210, 297, 'F');

        doc.setFontSize(18);
        doc.text("2. Financial Feasibility (CFO)", 20, 30);

        // Mock Budget Table
        autoTable(doc, {
            startY: 40,
            head: [['Category', 'Allocation', 'Status']],
            body: [
                ['Infrastructure & Cloud', '$2,400/mo', 'Approved'],
                ['Marketing - Launch', '$15,000', 'Pending'],
                ['Personnel (Contract)', '$8,500/mo', 'Approved'],
                ['Legal & Compliance', '$5,000', 'Review'],
            ],
            theme: 'grid',
            headStyles: { fillColor: [40, 40, 40], textColor: [255, 255, 255] },
            styles: { font: "courier", textColor: [0, 0, 0] },
            alternateRowStyles: { fillColor: [240, 240, 240] }
        });

        // Save
        doc.save(`${activeProject.name}_Deepchox_Report.pdf`);
        setStep('done');
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-zinc-950 w-full max-w-lg rounded-[32px] shadow-2xl overflow-hidden relative border border-white/10"
            >
                {/* Header */}
                <div className="h-32 bg-zinc-900 flex items-center justify-center relative overflow-hidden">
                    <div
                        className="absolute inset-0 opacity-20 mix-blend-overlay"
                        style={{ backgroundImage: `url("${NOISE_DATA_URL}")` }}
                    />
                    {step === 'done' ? (
                        <div className="w-16 h-16 bg-violet-500/20 rounded-full flex items-center justify-center shadow-lg animate-in zoom-in border border-violet-500/50">
                            <CheckCircle2 className="w-8 h-8 text-violet-500" />
                        </div>
                    ) : (
                        <div className="w-16 h-16 bg-zinc-800 rounded-full flex items-center justify-center shadow-inner border border-white/5">
                            <FileText className="w-8 h-8 text-zinc-400" />
                        </div>
                    )}
                </div>

                <div className="p-8 text-center text-zinc-300">
                    {step === 'preview' && (
                        <>
                            <h3 className="text-2xl font-bold text-white mb-2">Finalize & Export</h3>
                            <p className="text-zinc-500 text-sm mb-8 leading-relaxed">
                                You are about to generate the <strong>Executive Blueprint</strong> for {activeProject?.name}.
                                <br />This action will compile data from all 4 agent desks.
                            </p>

                            <div className="flex gap-4 justify-center mb-8">
                                <div className="flex flex-col items-center gap-2 opacity-50">
                                    <Target className="w-5 h-5 text-zinc-400" />
                                    <span className="text-[9px] font-bold uppercase">CEO</span>
                                </div>
                                <div className="flex flex-col items-center gap-2 opacity-50">
                                    <ClipboardList className="w-5 h-5 text-zinc-400" />
                                    <span className="text-[9px] font-bold uppercase">PM</span>
                                </div>
                                <div className="flex flex-col items-center gap-2 opacity-50">
                                    <Calculator className="w-5 h-5 text-zinc-400" />
                                    <span className="text-[9px] font-bold uppercase">CFO</span>
                                </div>
                                <div className="flex flex-col items-center gap-2 opacity-50">
                                    <ScanSearch className="w-5 h-5 text-zinc-400" />
                                    <span className="text-[9px] font-bold uppercase">Scout</span>
                                </div>
                            </div>

                            <button
                                onClick={generatePDF}
                                className="w-full py-4 bg-white text-black rounded-xl font-bold uppercase tracking-widest hover:bg-zinc-200 transition-all shadow-lg flex items-center justify-center gap-2"
                            >
                                <Lock className="w-4 h-4" />
                                Sign & Download (Local Enclave)
                            </button>
                            <button onClick={onClose} className="mt-4 text-xs font-bold text-zinc-600 hover:text-zinc-400 uppercase tracking-widest">
                                Cancel
                            </button>
                        </>
                    )}

                    {step === 'generating' && (
                        <div className="py-8">
                            <h3 className="text-lg font-bold text-white mb-4">
                                {signingAgent ? `${signingAgent} is verifying...` : "Compiling Secure Document..."}
                            </h3>
                            <div className="w-64 h-2 bg-zinc-800 rounded-full mx-auto overflow-hidden relative">
                                <motion.div
                                    animate={{ left: ["-100%", "100%"] }}
                                    transition={{ repeat: Infinity, duration: 1.5, ease: "linear" }}
                                    className="absolute top-0 bottom-0 w-1/2 bg-violet-500"
                                />
                            </div>
                            <p className="text-xs text-zinc-600 mt-4 font-mono">Zero-Data Policy: Report generated client-side.</p>
                        </div>
                    )}

                    {step === 'done' && (
                        <div>
                            <h3 className="text-2xl font-bold text-white mb-2">Protocol Complete</h3>
                            <p className="text-zinc-500 text-sm mb-8">
                                Your Executive Blueprint has been securely downloaded.
                                <br />No copies were retained on any server.
                            </p>
                            <button
                                onClick={onClose}
                                className="w-full py-4 bg-violet-500 text-white rounded-xl font-bold uppercase tracking-widest hover:bg-violet-400 transition-all shadow-lg flex items-center justify-center gap-2"
                            >
                                Return to Office
                            </button>
                        </div>
                    )}
                </div>
            </motion.div>
        </div>
    );
}
