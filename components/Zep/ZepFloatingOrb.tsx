'use client';

import React, { useState, useCallback, useEffect, useRef } from 'react';
import { DexoParticleCanvas } from '@/components/Dexo/DexoParticleSphere';
import { useZepConversationalVoice } from '@/lib/useZepVoice';
import { useOffice } from '@/lib/OfficeContext';
import { useTheme } from '@/lib/ThemeContext';
import { Mic, X, Send, Command, Sparkles } from 'lucide-react';

interface ZepCommand {
  action: string;
  params: Record<string, unknown>;
}

export function ZepFloatingOrb() {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<{ role: 'user' | 'zep'; text: string; command?: ZepCommand }[]>([
    { role: 'zep', text: 'At your service. I control the Deepchox suite — just say what you need.\n\n"Take me to CEO desk"\n"Start a new venture"\n"Run staff sync"\n"What\'s the status?"\n"Show my ventures"\n"Open research"\n"Close Zep"' }
  ]);
  const [processing, setProcessing] = useState(false);
  const [confirmCommand, setConfirmCommand] = useState<ZepCommand | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const { activeProject, activeRoom, allProjects, switchRoom, createNewProject, runAgentStaffSync, updateProjectField, setActiveProject, patchActiveProject } = useOffice();
  const { theme } = useTheme();
  const dark = theme === 'dark';

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
          const validRooms = ['ceo', 'pm', 'accountant', 'scout', 'cmo', 'dexo', 'shark', 'research', 'dashboard', 'engineering', 'calendar', 'reports', 'invention'];
          if (!validRooms.includes(room)) return `I don't know the room "${room}". Try: ceo, pm, accountant, scout, cmo, dexo, shark, research, engineering, calendar, reports, or dashboard.`;
          switchRoom(room as any);
          const roomNames: Record<string, string> = {
            ceo: 'CEO Desk', pm: 'Product Desk', accountant: 'Finance Desk',
            scout: 'Intelligence Desk', cmo: 'Growth Desk', dexo: 'Executive Suite',
            shark: 'Investor Desk', research: 'Research Hub', engineering: 'Engineering Platform',
            calendar: 'Calendar', reports: 'Reports', invention: 'Invention Lab'
          };
          return `Opening ${roomNames[room] || room.toUpperCase()}.`;
        }

        case 'create_venture': {
          createNewProject?.();
          return 'New venture initialized. I\'ve opened the Executive Suite for you.';
        }

        case 'open_research': {
          switchRoom('research');
          return 'Opening Research Hub.';
        }

        case 'open_engineering': {
          switchRoom('engineering');
          return 'Opening Engineering Platform.';
        }

        case 'open_dashboard': {
          switchRoom('dashboard');
          return 'Opening Dashboard.';
        }

        case 'list_ventures': {
          const count = allProjects?.length || 0;
          if (count === 0) return 'No ventures yet. Say "create venture" to start one.';
          const list = allProjects?.slice(0, 5).map(p => `• ${p.name || 'Untitled'}`).join('\n');
          return `You have ${count} venture${count !== 1 ? 's' : ''}:\n${list}${count > 5 ? '\n...and more' : ''}`;
        }

        case 'status': {
          const roomNames: Record<string, string> = {
            ceo: 'CEO Desk', pm: 'Product Desk', accountant: 'Finance Desk',
            scout: 'Intelligence Desk', cmo: 'Growth Desk', dexo: 'Executive Suite',
            shark: 'Investor Desk', research: 'Research Hub', engineering: 'Engineering Platform',
            calendar: 'Calendar', reports: 'Reports', invention: 'Invention Lab', dashboard: 'Dashboard'
          };
          const currentRoom = roomNames[activeRoom as string] || activeRoom;
          const currentVenture = activeProject?.name || 'None selected';
          return `Current location: ${currentRoom}\nActive venture: ${currentVenture}\nTotal ventures: ${allProjects?.length || 0}`;
        }

        case 'close_zep': {
          setIsOpen(false);
          return 'Closing interface.';
        }

        case 'run_staff_sync': {
          if (!activeProject) return 'No venture selected. Select or create one first.';
          const result = await runAgentStaffSync?.();
          if (result?.ok) return 'Staff sync complete. All agents have updated the venture.';
          return 'Staff sync failed. Make sure you have a venture selected.';
        }

        case 'update_strategy': {
          if (!activeProject) return 'No venture selected.';
          const content = cmd.params.content as string;
          await updateProjectField?.('strategy', content);
          return 'Strategy document updated.';
        }

        case 'update_product_plan': {
          if (!activeProject) return 'No venture selected.';
          const content = cmd.params.content as string;
          await updateProjectField?.('productPlan', content);
          return 'Product plan updated.';
        }

        case 'update_budget': {
          if (!activeProject) return 'No venture selected.';
          const content = cmd.params.content as string;
          await updateProjectField?.('budget', content);
          return 'Budget updated.';
        }

        case 'update_market_insights': {
          if (!activeProject) return 'No venture selected.';
          const content = cmd.params.content as string;
          await updateProjectField?.('marketInsights', content);
          return 'Market intelligence updated.';
        }

        case 'add_note': {
          if (!activeProject) return 'No venture selected.';
          const note = cmd.params.note as string;
          const current = (activeProject as any).userNotes || '';
          await updateProjectField?.('userNotes', current + '\n\n' + note);
          return 'Note added to the venture.';
        }

        case 'ask_help': {
          return 'I control the Deepchox suite. Here\'s what I can do:\n\n🚀 NAVIGATION\n• "Take me to CEO/PM/Finance/Growth/etc."\n• "Open research" / "Open engineering"\n• "Go to dashboard"\n\n📋 VENTURES\n• "Create a new venture"\n• "List my ventures"\n• "What\'s the status?"\n\n🤖 AGENTS\n• "Run staff sync" — AI agents analyze the venture\n\n📝 UPDATES\n• "Update strategy to..."\n• "Update product plan to..."\n• "Add note: ..."\n\n🔧 UTILITIES\n• "Close Zep"\n\nJust speak naturally — I\'ll handle the rest.';
        }

        default:
          return `I understood you want to "${cmd.action}" but I haven't learned that command yet. Say "help" to see what I can do.`;
      }
    } catch (err) {
      return `Command failed: ${err instanceof Error ? err.message : 'Unknown error'}`;
    }
  }, [activeProject, activeRoom, allProjects, switchRoom, createNewProject, runAgentStaffSync, updateProjectField]);

  // Parse natural language to command
  const parseCommand = (text: string): ZepCommand | null => {
    const lower = text.toLowerCase();

    // Room switching - expanded patterns
    const roomMatches = [
      // "take me to..." patterns
      { pattern: /take me to (?:the )?(ceo|strategy|master)/, room: 'ceo' },
      { pattern: /take me to (?:the )?(pm|product|cto)/, room: 'pm' },
      { pattern: /take me to (?:the )?(accountant|finance|cfo|money)/, room: 'accountant' },
      { pattern: /take me to (?:the )?(scout|market|intel|cso|intelligence)/, room: 'scout' },
      { pattern: /take me to (?:the )?(cmo|growth|marketing)/, room: 'cmo' },
      { pattern: /take me to (?:the )?(dexo|assistant|ai|hub|executive suite)/, room: 'dexo' },
      { pattern: /take me to (?:the )?(shark|vc|investor)/, room: 'shark' },
      { pattern: /take me to (?:the )?(research|news)/, room: 'research' },
      { pattern: /take me to (?:the )?(engineering|platform|build)/, room: 'engineering' },
      { pattern: /take me to (?:the )?(calendar|schedule)/, room: 'calendar' },
      { pattern: /take me to (?:the )?(reports|analytics)/, room: 'reports' },
      { pattern: /take me to (?:the )?(invention|lab)/, room: 'invention' },
      { pattern: /take me to (?:the )?(dashboard|home|overview)/, room: 'dashboard' },
      // "switch to..." patterns
      { pattern: /switch to (?:the )?(ceo|strategy|master)/, room: 'ceo' },
      { pattern: /switch to (?:the )?(pm|product|cto)/, room: 'pm' },
      { pattern: /switch to (?:the )?(accountant|finance|cfo|money)/, room: 'accountant' },
      { pattern: /switch to (?:the )?(scout|market|intel|cso)/, room: 'scout' },
      { pattern: /switch to (?:the )?(cmo|growth|marketing)/, room: 'cmo' },
      { pattern: /switch to (?:the )?(dexo|assistant|ai|hub)/, room: 'dexo' },
      { pattern: /switch to (?:the )?(shark|vc|investor)/, room: 'shark' },
      { pattern: /switch to (?:the )?(research|news)/, room: 'research' },
      { pattern: /switch to (?:the )?(dashboard|home|overview)/, room: 'dashboard' },
      { pattern: /switch to (?:the )?(engineering|platform)/, room: 'engineering' },
      // "go to..." patterns
      { pattern: /go to (?:the )?(ceo|pm|accountant|scout|cmo|dexo|shark|research|dashboard|engineering|calendar|reports|invention)/, room: '$1' },
      // "open..." patterns
      { pattern: /open (?:the )?(ceo|pm|accountant|scout|cmo|dexo|shark|research|dashboard|engineering|calendar|reports|invention)/, room: '$1' },
      // "show me..." patterns
      { pattern: /show me (?:the )?(ceo|pm|accountant|scout|cmo|dexo|shark|research|dashboard|engineering|calendar|reports|invention)/, room: '$1' },
    ];
    for (const m of roomMatches) {
      const match = lower.match(m.pattern);
      if (match) return { action: 'switch_room', params: { room: m.room === '$1' ? match[1] : m.room } };
    }

    // Open research directly
    if (/open research|show research|go to research/i.test(lower)) {
      return { action: 'open_research', params: {} };
    }

    // Open engineering directly
    if (/open engineering|show engineering|go to engineering|open platform/i.test(lower)) {
      return { action: 'open_engineering', params: {} };
    }

    // Open dashboard
    if (/open dashboard|show dashboard|go to dashboard|go home/i.test(lower)) {
      return { action: 'open_dashboard', params: {} };
    }

    // Create venture
    if (/create (?:a )?(?:new )?venture|new venture|add venture|start (?:a )?venture/i.test(lower)) {
      return { action: 'create_venture', params: {} };
    }

    // List ventures
    if (/list (?:my )?ventures|show (?:my )?ventures|what ventures|my projects/i.test(lower)) {
      return { action: 'list_ventures', params: {} };
    }

    // Status
    if (/what'?s the status|status update|current status|where am i|what\'s happening/i.test(lower)) {
      return { action: 'status', params: {} };
    }

    // Close Zep
    if (/close zep|hide zep|goodbye|bye zep|exit/i.test(lower)) {
      return { action: 'close_zep', params: {} };
    }

    // Staff sync
    if (/run (?:staff )?sync|sync (?:the )?staff|refresh (?:all )?agents|sync now|sync agents/i.test(lower)) {
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
    if (/help|what can you do|how do i|commands|what do you do|what are you/i.test(lower)) {
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
          className={`fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full border transition hover:scale-105 ${
            dark
              ? 'border-[#262626] bg-[#1a1a1a] shadow-[0_8px_30px_-8px_rgba(0,0,0,0.4)] hover:shadow-[0_12px_36px_-10px_rgba(255,255,255,0.1)]'
              : 'border-neutral-200 bg-white shadow-[0_8px_30px_-8px_rgba(0,0,0,0.18)] hover:shadow-[0_12px_36px_-10px_rgba(0,0,0,0.2)]'
          }`}
          aria-label="Open Zep"
        >
          <DexoParticleCanvas mode="floating" size={48} active={false} />
        </button>
      )}

      {/* Chat Panel */}
      {isOpen && (
        <div className={`fixed bottom-6 right-6 z-50 flex h-[500px] w-[380px] flex-col overflow-hidden rounded-2xl border shadow-[0_20px_50px_-20px_rgba(0,0,0,0.3)] ${
          dark
            ? 'border-[#262626] bg-[#141414]'
            : 'border-neutral-200 bg-white shadow-[0_20px_50px_-20px_rgba(0,0,0,0.2)]'
        }`}>
          {/* Header */}
          <div className={`flex items-center justify-between border-b px-4 py-3 ${dark ? 'border-[#262626] bg-[#1a1a1a]' : 'border-neutral-100 bg-neutral-50'}`}>
            <div className="flex items-center gap-2">
              <div className={`flex h-8 w-8 items-center justify-center rounded-full shadow-sm ring-1 ${dark ? 'bg-[#262626] ring-[#333]' : 'bg-white ring-neutral-200'}`}>
                <Command className="h-4 w-4 text-neutral-500" />
              </div>
              <span className={`font-semibold ${dark ? 'text-neutral-200' : 'text-neutral-800'}`}>Zep</span>
            </div>
            <button onClick={() => setIsOpen(false)} className={dark ? 'text-neutral-500 hover:text-neutral-300' : 'text-neutral-400 hover:text-neutral-700'}>
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Messages */}
          <div className={`flex-1 space-y-3 overflow-y-auto p-4 ${dark ? 'bg-[#0a0a0a]' : 'bg-[#f5f5f7]'}`}>
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-[14px] leading-relaxed ${
                  m.role === 'user'
                    ? 'bg-neutral-600 text-white shadow-sm'
                    : dark
                      ? 'border border-[#262626] bg-[#1a1a1a] text-neutral-200 shadow-sm'
                      : 'border border-neutral-200 bg-white text-neutral-700 shadow-sm'
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
                <button onClick={confirm} className="rounded-lg bg-neutral-700 px-3 py-1.5 text-[13px] font-semibold text-white shadow-sm hover:bg-neutral-600">
                  Confirm
                </button>
                <button onClick={cancel} className={`rounded-lg border px-3 py-1.5 text-[13px] font-medium ${dark ? 'border-[#333] bg-[#1a1a1a] text-neutral-300 hover:bg-[#262626]' : 'border-neutral-200 bg-white text-neutral-600 hover:bg-neutral-50'}`}>
                  Cancel
                </button>
              </div>
            )}

            {processing && (
              <div className="flex justify-start">
                <div className={`flex items-center gap-2 rounded-2xl border px-3 py-2 shadow-sm ${dark ? 'border-[#262626] bg-[#1a1a1a] text-neutral-400' : 'border-neutral-200 bg-white text-neutral-500'}`}>
                  <Sparkles className="h-4 w-4 animate-pulse text-neutral-400" />
                  <span className="text-[13px]">Thinking...</span>
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div className={`border-t p-3 ${dark ? 'border-[#262626] bg-[#1a1a1a]' : 'border-neutral-200 bg-white'}`}>
            <div className="flex items-end gap-2">
              <button
                onClick={isListening ? stopListening : startListening}
                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border ${
                  isListening
                    ? 'border-neutral-300 bg-neutral-100 text-neutral-600'
                    : dark
                      ? 'border-[#333] bg-[#262626] text-neutral-400'
                      : 'border-neutral-200 bg-neutral-50 text-neutral-500'
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
                className={`max-h-24 flex-1 resize-none rounded-lg border border-transparent px-2 py-1.5 text-[14px] outline-none focus:border-neutral-400 ${
                  dark
                    ? 'bg-[#262626] text-neutral-200 placeholder:text-neutral-500 focus:bg-[#1a1a1a]'
                    : 'bg-neutral-50 text-neutral-800 placeholder:text-neutral-400 focus:bg-white'
                }`}
              />
              <button
                onClick={() => void handleCommand(input)}
                disabled={processing || !input.trim()}
                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg shadow-sm hover:opacity-90 disabled:opacity-30 ${
                  dark ? 'bg-neutral-600 text-white' : 'bg-neutral-800 text-white'
                }`}
              >
                <Send className="h-4 w-4" />
              </button>
            </div>
            {isListening && (
              <div className={`mt-2 text-center text-[12px] ${dark ? 'text-neutral-500' : 'text-neutral-500'}`}>
                {interimTranscript || 'Listening...'}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
