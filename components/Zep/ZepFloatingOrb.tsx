'use client';

import React, { useState, useCallback, useEffect, useRef } from 'react';
import { DexoParticleCanvas } from '@/components/Dexo/DexoParticleSphere';
import { useZepConversationalVoice } from '@/lib/useZepVoice';
import { useOffice } from '@/lib/OfficeContext';
import { Mic, X, Send, Command, Sparkles } from 'lucide-react';

interface ZepCommand {
  action: string;
  params: Record<string, unknown>;
}

export function ZepFloatingOrb() {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<{ role: 'user' | 'zep'; text: string; command?: ZepCommand }[]>([
    { role: 'zep', text: 'Hi, I\'m Zep. Tap the mic or type to command the app. Try: "Switch to CEO desk", "Create a new venture", "Run staff sync", or "What can you do?"' }
  ]);
  const [processing, setProcessing] = useState(false);
  const [confirmCommand, setConfirmCommand] = useState<ZepCommand | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const { activeProject, switchRoom, createNewProject, runAgentStaffSync, updateProjectField, setActiveProject, patchActiveProject } = useOffice();

  const {
    voiceState,
    interimTranscript,
    isListening,
    startListening,
    stopListening,
    speak,
  } = useZepConversationalVoice({
    onTranscript: (text) => handleCommand(text),
    onInterim: (text) => setInput(text),
  });

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages, confirmCommand]);

  // Command execution mapping
  const executeCommand = useCallback(async (cmd: ZepCommand): Promise<string> => {
    try {
      switch (cmd.action) {
        case 'switch_room': {
          const room = cmd.params.room as string;
          const validRooms = ['ceo', 'pm', 'accountant', 'scout', 'cmo', 'dexo', 'shark', 'research', 'dashboard', 'engineering'];
          if (!validRooms.includes(room)) return `I don't know the room "${room}". Try: ceo, pm, accountant, scout, cmo, dexo, research, engineering, or dashboard.`;
          switchRoom(room as any);
          return `Switched to ${room.toUpperCase()}.`;
        }

        case 'create_venture': {
          createNewProject?.();
          return 'Created a new venture. You can rename it by clicking the title.';
        }

        case 'select_venture': {
          return 'To select a venture, click it in the left sidebar.';
        }

        case 'run_staff_sync': {
          if (!activeProject) return 'No venture selected. Select or create one first.';
          const result = await runAgentStaffSync?.();
          if (result?.ok) return 'Staff sync complete. Check the venture for updates.';
          return 'Staff sync failed. Make sure you have a venture selected.';
        }

        case 'update_strategy': {
          if (!activeProject) return 'No venture selected.';
          const content = cmd.params.content as string;
          await updateProjectField?.('strategy', content);
          return 'Updated strategy document.';
        }

        case 'update_product_plan': {
          if (!activeProject) return 'No venture selected.';
          const content = cmd.params.content as string;
          await updateProjectField?.('productPlan', content);
          return 'Updated product plan.';
        }

        case 'update_budget': {
          if (!activeProject) return 'No venture selected.';
          const content = cmd.params.content as string;
          await updateProjectField?.('budget', content);
          return 'Updated budget.';
        }

        case 'update_market_insights': {
          if (!activeProject) return 'No venture selected.';
          const content = cmd.params.content as string;
          await updateProjectField?.('marketInsights', content);
          return 'Updated market intelligence.';
        }

        case 'add_note': {
          if (!activeProject) return 'No venture selected.';
          const note = cmd.params.note as string;
          const current = (activeProject as any).userNotes || '';
          await updateProjectField?.('userNotes', current + '\n\n' + note);
          return 'Added to your notes.';
        }

        case 'ask_help': {
          return 'I can help you:\n• Switch between desks (CEO, PM, CFO, etc.)\n• Create ventures\n• Run staff sync across all agents\n• Update strategy, product plan, budget, or market insights\n• Add quick notes\n\nJust tell me what you want in plain English.';
        }

        default:
          return `I understood you want to "${cmd.action}" but I'm not sure how to do that yet.`;
      }
    } catch (err) {
      return `Failed: ${err instanceof Error ? err.message : 'Unknown error'}`;
    }
  }, [activeProject, switchRoom, createNewProject, runAgentStaffSync, updateProjectField]);

  // Parse natural language to command
  const parseCommand = (text: string): ZepCommand | null => {
    const lower = text.toLowerCase();

    // Room switching
    const roomMatches = [
      { pattern: /switch to (ceo|strategy|master)/, room: 'ceo' },
      { pattern: /switch to (pm|product|cto)/, room: 'pm' },
      { pattern: /switch to (accountant|finance|cfo|money)/, room: 'accountant' },
      { pattern: /switch to (scout|market|intel|cso)/, room: 'scout' },
      { pattern: /switch to (cmo|growth|marketing)/, room: 'cmo' },
      { pattern: /switch to (dexo|assistant|ai|hub)/, room: 'dexo' },
      { pattern: /switch to (shark|vc|investor)/, room: 'shark' },
      { pattern: /switch to (research|news)/, room: 'research' },
      { pattern: /switch to (dashboard|home|overview)/, room: 'dashboard' },
      { pattern: /switch to (engineering|platform)/, room: 'engineering' },
      { pattern: /go to (ceo|pm|accountant|scout|cmo|dexo|shark|research|dashboard|engineering)/, room: '$1' },
      { pattern: /open (ceo|pm|accountant|scout|cmo|dexo|shark|research|dashboard|engineering)/, room: '$1' },
      { pattern: /show me (ceo|pm|accountant|scout|cmo|dexo|shark|research|dashboard|engineering)/, room: '$1' },
    ];
    for (const m of roomMatches) {
      const match = lower.match(m.pattern);
      if (match) return { action: 'switch_room', params: { room: m.room === '$1' ? match[1] : m.room } };
    }

    // Create venture
    if (/create (?:a )?(?:new )?venture|new venture|add venture/i.test(lower)) {
      return { action: 'create_venture', params: {} };
    }

    // Staff sync
    if (/run (staff )?sync|sync (the )?staff|refresh (all )?agents|sync now/i.test(lower)) {
      return { action: 'run_staff_sync', params: {} };
    }

    // Updates
    const updateMatches = [
      { pattern: /update (?:the )?strategy(?: to| with)?[:\s]*(.+)/i, action: 'update_strategy', key: 'content' },
      { pattern: /update (?:the )?product (?:plan|roadmap)(?: to| with)?[:\s]*(.+)/i, action: 'update_product_plan', key: 'content' },
      { pattern: /update (?:the )?budget(?: to| with)?[:\s]*(.+)/i, action: 'update_budget', key: 'content' },
      { pattern: /update (?:the )?market (?:intel|insights)(?: to| with)?[:\s]*(.+)/i, action: 'update_market_insights', key: 'content' },
      { pattern: /change (?:the )?strategy to[:\s]*(.+)/i, action: 'update_strategy', key: 'content' },
      { pattern: /change (?:the )?product plan to[:\s]*(.+)/i, action: 'update_product_plan', key: 'content' },
      { pattern: /set (?:the )?strategy to[:\s]*(.+)/i, action: 'update_strategy', key: 'content' },
      { pattern: /set (?:the )?budget to[:\s]*(.+)/i, action: 'update_budget', key: 'content' },
    ];
    for (const m of updateMatches) {
      const match = lower.match(m.pattern);
      if (match) return { action: m.action, params: { [m.key]: match[1].trim() } };
    }

    // Add note
    const noteMatch = lower.match(/(?:add|write) (?:a )?note[:\s]*(.+)/i);
    if (noteMatch) return { action: 'add_note', params: { note: noteMatch[1].trim() } };

    // Help
    if (/help|what can you do|how do i|commands|what do you do/i.test(lower)) {
      return { action: 'ask_help', params: {} };
    }

    return null;
  };

  const handleCommand = async (text: string) => {
    if (!text.trim()) return;
    setProcessing(true);
    setInput('');

    // Add user message
    setMessages(m => [...m, { role: 'user', text }]);

    // Parse command
    const command = parseCommand(text);

    if (command) {
      // Check if needs confirmation (destructive or unclear)
      const needsConfirm = ['update_strategy', 'update_product_plan', 'update_budget', 'update_market_insights'].includes(command.action);

      if (needsConfirm && !confirmCommand) {
        setConfirmCommand(command);
        setMessages(m => [...m, {
          role: 'zep',
          text: `I'll ${command.action.replace('_', ' ')}. Confirm?`,
          command
        }]);
        speak(`I'll ${command.action.replace('_', ' ')}. Say confirm to proceed, or cancel.`);
      } else {
        // Execute immediately
        const result = await executeCommand(command);
        setMessages(m => [...m, { role: 'zep', text: result }]);
        speak(result);
      }
    } else {
      // Send to AI for general chat
      try {
        const res = await fetch('/api/zep', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: text,
            context: buildContext(),
            history: messages.slice(-10),
          }),
        });
        const data = await res.json();
        const reply = data.reply || "I'm not sure how to help with that. Try asking for help to see what I can do.";
        setMessages(m => [...m, { role: 'zep', text: reply }]);
        speak(reply);
      } catch {
        const fallback = "I couldn't process that. Try asking 'what can you do?' for help.";
        setMessages(m => [...m, { role: 'zep', text: fallback }]);
        speak(fallback);
      }
    }

    setProcessing(false);
  };

  const buildContext = () => {
    return `Current venture: ${activeProject?.name || 'None selected'}
Available actions: switch rooms (ceo, pm, accountant, scout, cmo, dexo, shark, research, dashboard, engineering), create venture, run staff sync, update strategy/product/budget/market, add notes.`;
  };

  const confirm = async () => {
    if (!confirmCommand) return;
    const result = await executeCommand(confirmCommand);
    setMessages(m => [...m, { role: 'zep', text: result }]);
    speak(result);
    setConfirmCommand(null);
  };

  const cancel = () => {
    setConfirmCommand(null);
    setMessages(m => [...m, { role: 'zep', text: 'Cancelled.' }]);
    speak('Cancelled.');
  };

  return (
    <>
      {/* Floating Orb Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full border border-slate-200/90 bg-white shadow-[0_8px_30px_-8px_rgba(15,23,42,0.18)] transition hover:scale-105 hover:shadow-[0_12px_36px_-10px_rgba(13,148,136,0.25)]"
          aria-label="Open Zep"
        >
          <DexoParticleCanvas mode="floating" size={48} active={false} />
        </button>
      )}

      {/* Chat Panel */}
      {isOpen && (
        <div className="fixed bottom-6 right-6 z-50 flex h-[500px] w-[380px] flex-col overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-[0_20px_50px_-20px_rgba(15,23,42,0.2)]">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/80 px-4 py-3">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white shadow-sm ring-1 ring-slate-200/80">
                <Command className="h-4 w-4 text-teal-600" />
              </div>
              <span className="font-semibold text-slate-800">Zep</span>
            </div>
            <button onClick={() => setIsOpen(false)} className="text-slate-400 hover:text-slate-700">
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 space-y-3 overflow-y-auto bg-[#f4f5f8] p-4">
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-[14px] leading-relaxed ${
                  m.role === 'user'
                    ? 'bg-slate-900 text-white shadow-sm'
                    : 'border border-slate-200/90 bg-white text-slate-700 shadow-sm'
                }`}>
                  {m.text.split('\n').map((line, j) => (
                    <div key={j}>{line || <br />}</div>
                  ))}
                </div>
              </div>
            ))}

            {/* Confirmation buttons */}
            {confirmCommand && (
              <div className="flex gap-2">
                <button onClick={confirm} className="rounded-lg bg-teal-600 px-3 py-1.5 text-[13px] font-semibold text-white shadow-sm hover:bg-teal-700">
                  Confirm
                </button>
                <button onClick={cancel} className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-[13px] font-medium text-slate-600 hover:bg-slate-50">
                  Cancel
                </button>
              </div>
            )}

            {processing && (
              <div className="flex justify-start">
                <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2 text-slate-500 shadow-sm">
                  <Sparkles className="h-4 w-4 animate-pulse text-teal-500" />
                  <span className="text-[13px]">Thinking...</span>
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div className="border-t border-slate-200 bg-white p-3">
            <div className="flex items-end gap-2">
              <button
                onClick={isListening ? stopListening : startListening}
                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border ${
                  isListening ? 'border-red-200 bg-red-50 text-red-600' : 'border-slate-200 bg-slate-50 text-slate-500'
                }`}
              >
                <Mic className={`h-4 w-4 ${isListening ? 'animate-pulse' : ''}`} />
              </button>
              <textarea
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    void handleCommand(input);
                  }
                }}
                placeholder={isListening ? 'Listening...' : 'Type a command...'}
                rows={1}
                disabled={processing}
                className="max-h-24 flex-1 resize-none rounded-lg border border-transparent bg-slate-50 px-2 py-1.5 text-[14px] text-slate-800 placeholder:text-slate-400 outline-none focus:border-teal-300/50 focus:bg-white"
              />
              <button
                onClick={() => void handleCommand(input)}
                disabled={processing || !input.trim()}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-900 text-white shadow-sm hover:bg-slate-800 disabled:opacity-30"
              >
                <Send className="h-4 w-4" />
              </button>
            </div>
            {isListening && (
              <div className="mt-2 text-center text-[12px] text-slate-500">
                {interimTranscript || 'Listening...'}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
