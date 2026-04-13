'use client';

import React from 'react';
import { useOffice } from '@/lib/OfficeContext';
import { CheckCircle, AlertCircle, Download, FileChartColumn, Printer } from 'lucide-react';

interface LiveReportPreviewProps {
  onGeneratePDF?: () => void;
}

export function LiveReportPreview({ onGeneratePDF }: LiveReportPreviewProps) {
  const { activeProject } = useOffice();

  const sections = [
    {
      id: 'strategy',
      icon: '🎯',
      title: 'Strategic Vision',
      subtitle: 'CEO Office',
      content: activeProject?.strategy
    },
    {
      id: 'product',
      icon: '📋',
      title: 'Product Roadmap',
      subtitle: 'Product Management',
      content: activeProject?.productPlan
    },
    {
      id: 'budget',
      icon: '💰',
      title: 'Financial Projections',
      subtitle: 'Finance',
      content: activeProject?.budget
    },
    {
      id: 'market',
      icon: '🔍',
      title: 'Market Intelligence',
      subtitle: 'Business Scout',
      content: activeProject?.marketInsights
    },
  ];

  const completionPercentage = sections.filter((s) => s.content?.trim()).length * 25;
  const isComplete = completionPercentage === 100;

  return (
    <div className="flex flex-col h-full bg-black/40 relative overflow-hidden backdrop-blur-md">
      {/* Top Controls */}
      <div className="px-8 py-5 flex items-center justify-between z-10 sticky top-0 bg-black/60 backdrop-blur-md border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-blue-500/20 rounded-full flex items-center justify-center text-blue-400">
            <FileChartColumn className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">Live Report</h3>
            <p className="text-[10px] text-white/50 font-medium">Real-time Preview</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="bg-white/5 backdrop-blur-sm px-3 py-1.5 rounded-full border border-white/10 flex items-center gap-2 shadow-sm">
            <div className="w-16 h-1 bg-white/10 rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-500 rounded-full transition-all duration-700 ease-out"
                style={{ width: `${completionPercentage}%` }}
              />
            </div>
            <span className="text-[10px] font-bold text-white/60">{completionPercentage}%</span>
          </div>
          {isComplete && <div className="animate-in zoom-in spin-in rounded-full bg-violet-500/20 p-1 text-violet-400 duration-300"><CheckCircle className="w-5 h-5" /></div>}
        </div>
      </div>

      {/* Document Canvas */}
      <div className="flex-1 overflow-y-auto p-4 md:p-8 custom-scrollbar">
        <div className="relative mx-auto min-h-[800px] max-w-[800px] rounded-sm bg-white p-12 shadow-xl ring-1 ring-white/5 transition-all duration-500 md:p-16">

          {/* Document Header */}
          <div className="border-b-2 border-slate-900 mb-12 pb-6 flex justify-between items-end">
            <div>
              <h1 className="text-4xl font-serif font-bold text-slate-900 tracking-tight mb-2">
                {activeProject?.name || 'Untitled Project'}
              </h1>
              <p className="font-serif italic text-slate-500">Executive Summary & Strategy Report</p>
            </div>
            <div className="text-right">
              <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">Generated</div>
              <div className="text-xs font-medium text-slate-800">
                {activeProject?.timestamp ? new Date(activeProject.timestamp).toLocaleDateString() : 'Draft'}
              </div>
            </div>
          </div>

          {/* Content Sections */}
          <div className="space-y-12">
            {sections.map((section, idx) => (
              <section key={idx} className={`space-y-4 group ${!section.content?.trim() ? 'opacity-40 grayscale hover:opacity-60 transition-opacity' : ''}`}>
                <div className="flex items-center gap-3">
                  <h2 className="text-lg font-bold text-slate-800 uppercase tracking-wider border-b border-slate-200 pb-1 pr-4 inline-block">
                    {idx + 1}. {section.title}
                  </h2>
                  <span className="text-xs font-serif italic text-slate-400">via {section.subtitle}</span>
                </div>

                {section.content?.trim() ? (
                  <article className="prose prose-sm max-w-none font-serif text-slate-600 leading-relaxed text-justify">
                    {section.content}
                  </article>
                ) : (
                  <div className="h-24 rounded bg-slate-50 border border-dashed border-slate-200 flex items-center justify-center gap-2 text-slate-400 text-sm font-medium italic">
                    <span>Waiting for input...</span>
                  </div>
                )}
              </section>
            ))}
          </div>

          {/* Footer Watermark */}
          <div className="absolute bottom-12 left-0 right-0 text-center pointer-events-none">
            <p className="text-[10px] text-slate-200 uppercase tracking-widest font-bold">Confidential • northROCS LABS · Deepchox</p>
          </div>
        </div>

        {/* Bottom padding for scroll */}
        <div className="h-24"></div>
      </div>

      {/* Floating Action Button */}
      {isComplete ? (
        <div className="absolute bottom-8 right-8 z-30 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <button
            onClick={onGeneratePDF}
            className="h-14 px-6 rounded-full bg-blue-600 text-white shadow-lg shadow-blue-900/50 hover:bg-blue-500 hover:scale-105 active:scale-95 transition-all flex items-center gap-3 font-bold tracking-wide"
          >
            <Download className="w-5 h-5" />
            <span>Export PDF</span>
          </button>
        </div>
      ) : (
        <div className="absolute bottom-6 right-6 opacity-60 pointer-events-none z-10">
          <div className="h-12 w-12 rounded-full bg-white/5 flex items-center justify-center text-white/20 border border-white/5">
            <Printer className="w-5 h-5" />
          </div>
        </div>
      )}
    </div>
  );
}
