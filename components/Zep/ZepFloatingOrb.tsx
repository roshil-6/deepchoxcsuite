'use client';

import React, { useState, useCallback, useEffect, useRef } from 'react';
import { useZepConversationalVoice } from '@/lib/useZepVoice';
import { useOffice } from '@/lib/OfficeContext';
import { useTheme } from '@/lib/ThemeContext';
import { Mic, X, Send, Command, Sparkles } from 'lucide-react';
import {
  dispatchZepNav,
  loadEngineeringSummaries,
  readActiveShellView,
  readSelectedEngProjectId,
} from '@/lib/zepAppBridge';

interface ZepCommand {
  action: string;
  params: Record<string, unknown>;
}

export function ZepFloatingOrb() {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<{ role: 'user' | 'zep'; text: string; command?: ZepCommand }[]>([
    {
      role: 'zep',
      text: [
        'I’m Zep—shortcuts for this Deepchox workspace:',
        '',
        '• Open research',
        '• Open engineering',
        '• Open sites',
        '• Start a new project',
        '• What’s the status?',
        '• Show my projects',
        '• Close Zep',
        '',
        'This workspace is Engineering, Research, and Sites (prompt → exportable webpage)—not discrete CEO/Product desks.',
      ].join('\n'),
    },
  ]);
  const [processing, setProcessing] = useState(false);
  const [confirmCommand, setConfirmCommand] = useState<ZepCommand | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const { activeProject, switchRoom, createNewProject, updateProjectField } = useOffice();
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

  // Command execution — navigation matches the shipped shell (Engineering + Research + Sites).
  const executeCommand = useCallback(async (cmd: ZepCommand): Promise<string> => {
    const roomAliases: Record<string, string> = {
      ceo: 'CEO Desk',
      pm: 'Product Desk',
      accountant: 'Finance Desk',
      scout: 'Intelligence Desk',
      cmo: 'Growth Desk',
      dexo: 'Executive Suite',
      shark: 'Investor Desk',
      research: 'Research',
      engineering: 'Engineering',
      sites: 'Sites',
      calendar: 'Calendar',
      reports: 'Reports',
      invention: 'Invention Lab',
      dashboard: 'Dashboard',
    };

    try {
      switch (cmd.action) {
        case 'switch_room': {
          const room = String(cmd.params.room || '').toLowerCase();
          if (room === 'research') {
            dispatchZepNav({ kind: 'set_view', view: 'research' });
            switchRoom(room as Parameters<typeof switchRoom>[0]);
            return 'Opening Research.';
          }
          if (room === 'engineering') {
            dispatchZepNav({ kind: 'set_view', view: 'engineering' });
            switchRoom(room as Parameters<typeof switchRoom>[0]);
            return 'Opening Engineering.';
          }
          if (room === 'sites') {
            dispatchZepNav({ kind: 'set_view', view: 'sites' });
            return 'Opening Sites — describe the page you want.';
          }
          if (room === 'dashboard') {
            dispatchZepNav({ kind: 'set_view', view: 'engineering' });
            switchRoom('dashboard' as Parameters<typeof switchRoom>[0]);
            return 'There isn’t a separate dashboard page here—you’re now in Engineering.';
          }

          dispatchZepNav({ kind: 'set_view', view: 'engineering' });
          switchRoom(room as Parameters<typeof switchRoom>[0]);
          const nice = roomAliases[room] || room;
          return `There’s no “${nice}” screen in this Deepchox build—you have Engineering and Research. I’ve switched you to Engineering.`;
        }

        case 'create_venture': {
          dispatchZepNav({ kind: 'new_project' });
          createNewProject?.();
          return 'New Engineering session: use the prompt on this page—the eight specialist agents run after you submit.';
        }

        case 'open_research': {
          dispatchZepNav({ kind: 'set_view', view: 'research' });
          switchRoom('research' as Parameters<typeof switchRoom>[0]);
          return 'Opening Research.';
        }

        case 'open_engineering': {
          dispatchZepNav({ kind: 'set_view', view: 'engineering' });
          switchRoom('engineering' as Parameters<typeof switchRoom>[0]);
          return 'Opening Engineering.';
        }

        case 'open_sites': {
          dispatchZepNav({ kind: 'set_view', view: 'sites' });
          return 'Sites opened — type a brief, paste styles you like, then Generate.';
        }

        case 'open_dashboard': {
          dispatchZepNav({ kind: 'set_view', view: 'engineering' });
          switchRoom('dashboard' as Parameters<typeof switchRoom>[0]);
          return 'Opening Engineering—the closest thing to a central hub in this workspace.';
        }

        case 'list_ventures': {
          const list = loadEngineeringSummaries();
          if (!list.length) {
            return 'No saved Engineering projects in this browser yet. Say “new project”, submit a prompt, then it appears in Projects.';
          }
          const lines = list.slice(0, 8).map((p) => `• ${p.title}`).join('\n');
          return `${list.length} Engineering project${list.length === 1 ? '' : 's'} saved locally:\n${lines}${list.length > 8 ? `\n…plus ${list.length - 8} more` : ''}`;
        }

        case 'status': {
          const view = readActiveShellView();
          const id = readSelectedEngProjectId();
          const summaries = loadEngineeringSummaries();
          const projLabel =
            id != null ? (summaries.find((p) => p.id === id)?.title ?? 'Selected project') : 'New-build screen (sidebar / prompt)';
          const viewLabel =
            view === 'research'
              ? 'Research'
              : view === 'sites'
                ? 'Sites'
                : view === 'engineering'
                  ? 'Engineering'
                  : 'Engineering (default)';
          return ['Workspace: ' + viewLabel, 'Project focus: ' + projLabel, 'Saved builds (this browser): ' + String(summaries.length)].join('\n');
        }

        case 'close_zep': {
          setIsOpen(false);
          return 'Closing.';
        }

        case 'run_staff_sync': {
          return 'Staff sync belongs to legacy venture workspaces. Here, rerun Research headlines or kick off another Engineering build.';
        }

        case 'update_strategy': {
          if (!activeProject) {
            return 'No IndexedDB venture is active for that command—strategy edits live inside Engineering specs after a run.';
          }
          const content = cmd.params.content as string;
          await updateProjectField?.('strategy', content);
          return 'Strategy updated (legacy venture).';
        }

        case 'update_product_plan': {
          if (!activeProject) return 'No legacy venture loaded. Use tabs under an Engineering build for product-shaped output.';
          const content = cmd.params.content as string;
          await updateProjectField?.('productPlan', content);
          return 'Product plan updated.';
        }

        case 'update_budget': {
          if (!activeProject) return 'No legacy venture loaded.';
          const content = cmd.params.content as string;
          await updateProjectField?.('budget', content);
          return 'Budget updated.';
        }

        case 'update_market_insights': {
          if (!activeProject) return 'No legacy venture loaded—try Research.';
          const content = cmd.params.content as string;
          await updateProjectField?.('marketInsights', content);
          return 'Market intelligence updated.';
        }

        case 'add_note': {
          if (!activeProject) return 'No legacy venture loaded for notes.';
          const note = cmd.params.note as string;
          const current = (activeProject as { userNotes?: string }).userNotes || '';
          await updateProjectField?.('userNotes', current + '\n\n' + note);
          return 'Note appended.';
        }

        case 'ask_help':
          return [
            'What works in this Deepchox shell:',
            '• Open research / Open engineering / Open sites',
            '• New project',
            '• Show my projects',
            '• Status',
            '• Close Zep',
            '',
            'Sites turns a paragraph prompt into a one-page preview + downloadable HTML.',
          ].join('\n');

        default:
          return `Unhandled action “${cmd.action}”. Say “help”.`;
      }
    } catch (err) {
      return `Command failed: ${err instanceof Error ? err.message : 'Unknown error'}`;
    }
  }, [activeProject, switchRoom, createNewProject, updateProjectField]);

  // Parse natural language to command
  const parseCommand = (text: string): ZepCommand | null => {
    const lower = text.toLowerCase();

    if (/(take me to|switch to|go to|show me|open) (?:the )?sites\b/i.test(lower)) {
      return { action: 'switch_room', params: { room: 'sites' } };
    }

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

    // Open Sites (prompt → site)
    if (/open sites|sites builder|\bsite builder\b|prompt to website|website from prompt|landing page builder/i.test(lower)) {
      return { action: 'open_sites', params: {} };
    }

    // Open dashboard
    if (/open dashboard|show dashboard|go to dashboard|go home/i.test(lower)) {
      return { action: 'open_dashboard', params: {} };
    }

    // Create venture / new Engineering session
    if (
      /create (?:a )?(?:new )?venture|new venture|add venture|start (?:a )?venture/i.test(lower)
      || /start (?:a )?new project|open (?:a )?new project|^(?:new project|fresh build)$/i.test(lower.trim())
    ) {
      return { action: 'create_venture', params: {} };
    }

    // List ventures
    if (/list (?:my )?ventures|show (?:my )?ventures|what ventures|(?:show|list) (?:my )?projects|^my projects$/i.test(lower.trim())) {
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
    const view = readActiveShellView();
    const eng = loadEngineeringSummaries();
    const shell =
      view === 'research'
        ? 'Research headlines'
        : view === 'sites'
          ? 'Sites (prompt to exportable landing HTML)'
          : 'Engineering orchestration builder';
    return [
      `Active shell: ${shell}`,
      `Legacy IndexedDB venture (if any): ${activeProject?.name ?? 'none'}`,
      `Local Engineering saves: ${eng.length}`,
      'Zep can: open engineering, open research, open sites, new project, list projects, status, legacy venture field updates.',
    ].join('\n');
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
      {/* Floating Orb Button - Clean CSS Design */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className={`fixed z-[45] flex h-14 w-14 items-center justify-center rounded-full transition-all duration-300 hover:scale-110 max-lg:right-4 max-lg:bottom-[calc(4.75rem+env(safe-area-inset-bottom))] lg:bottom-6 lg:right-6 ${
            dark
              ? 'bg-gradient-to-br from-neutral-700 to-neutral-900 shadow-[0_8px_32px_-8px_rgba(0,0,0,0.5)] hover:shadow-[0_12px_40px_-10px_rgba(255,255,255,0.08)]'
              : 'bg-gradient-to-br from-white to-neutral-200 shadow-[0_8px_32px_-8px_rgba(0,0,0,0.25)] hover:shadow-[0_12px_40px_-10px_rgba(0,0,0,0.35)]'
          }`}
          aria-label="Open Zep"
        >
          {/* Inner orb with pulse animation */}
          <div className="relative flex h-10 w-10 items-center justify-center">
            <div className={`absolute inset-0 rounded-full animate-pulse ${
              dark ? 'bg-neutral-600/30' : 'bg-neutral-300/40'
            }`} />
            <div className={`relative flex h-8 w-8 items-center justify-center rounded-full ${
              dark
                ? 'bg-gradient-to-br from-neutral-500 to-neutral-700'
                : 'bg-gradient-to-br from-neutral-300 to-neutral-400'
            }`}>
              <Command className={`h-4 w-4 ${dark ? 'text-neutral-200' : 'text-neutral-600'}`} />
            </div>
          </div>
        </button>
      )}

      {/* Chat Panel - Perplexity-like Clean Interface */}
      {isOpen && (
        <div className={`fixed z-[45] flex flex-col overflow-hidden rounded-2xl border subpixel-antialiased shadow-[0_24px_60px_-20px_rgba(0,0,0,0.35)] max-lg:inset-x-3 max-lg:bottom-[calc(4.75rem+env(safe-area-inset-bottom))] max-lg:h-[min(72dvh,520px)] max-lg:w-auto lg:bottom-6 lg:right-6 lg:h-[500px] lg:w-[380px] ${
          dark
            ? 'border-[#262626] bg-[#141414]'
            : 'border-neutral-200/80 bg-white shadow-[0_24px_60px_-20px_rgba(0,0,0,0.2)]'
        }`}>
          {/* Header */}
          <div className={`flex items-center justify-between border-b px-4 py-3.5 ${dark ? 'border-[#262626] bg-[#1a1a1a]' : 'border-neutral-100 bg-neutral-50/80'}`}>
            <div className="flex items-center gap-2.5">
              <div className={`flex h-8 w-8 items-center justify-center rounded-full shadow-sm ring-1 ${dark ? 'bg-gradient-to-br from-neutral-600 to-neutral-800 ring-[#333]' : 'bg-gradient-to-br from-neutral-200 to-neutral-300 ring-neutral-200'}`}>
                <Command className={`h-4 w-4 ${dark ? 'text-neutral-300' : 'text-neutral-600'}`} />
              </div>
              <span className={`font-semibold tracking-tight ${dark ? 'text-neutral-200' : 'text-neutral-800'}`}>Zep</span>
            </div>
            <button onClick={() => setIsOpen(false)} className={`rounded-md p-1 transition-colors ${dark ? 'text-neutral-500 hover:bg-[#262626] hover:text-neutral-300' : 'text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700'}`}>
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Messages */}
          <div className={`flex-1 space-y-4 overflow-y-auto p-4 ${dark ? 'bg-[#0a0a0a]' : 'bg-[#fafafa]'}`}>
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] rounded-2xl px-4 py-3 text-[14px] leading-relaxed subpixel-antialiased ${
                  m.role === 'user'
                    ? 'bg-neutral-700 text-white shadow-sm'
                    : dark
                      ? 'border border-[#262626] bg-[#1a1a1a] text-neutral-200 shadow-sm'
                      : 'border border-neutral-200/80 bg-white text-neutral-700 shadow-sm'
                }`}>
                  {m.text.split('\n').map((line, j) => (
                    <div key={j}>{line || <br />}</div>
                  ))}
                </div>
              </div>
            ))}

            {/* Confirmation buttons */}
            {confirmCommand && (
              <div className="flex gap-2 pt-1">
                <button onClick={confirm} className="rounded-xl bg-neutral-700 px-4 py-2 text-[13px] font-medium text-white shadow-sm transition-colors hover:bg-neutral-600">
                  Confirm
                </button>
                <button onClick={cancel} className={`rounded-xl border px-4 py-2 text-[13px] font-medium transition-colors ${dark ? 'border-[#333] bg-[#1a1a1a] text-neutral-300 hover:bg-[#262626]' : 'border-neutral-200 bg-white text-neutral-600 hover:bg-neutral-50'}`}>
                  Cancel
                </button>
              </div>
            )}

            {processing && (
              <div className="flex justify-start pt-1">
                <div className={`flex items-center gap-2 rounded-2xl border px-4 py-2.5 shadow-sm ${dark ? 'border-[#262626] bg-[#1a1a1a] text-neutral-400' : 'border-neutral-200 bg-white text-neutral-500'}`}>
                  <Sparkles className="h-4 w-4 animate-pulse text-neutral-400" />
                  <span className="text-[13px]">Thinking...</span>
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div className={`border-t p-3.5 ${dark ? 'border-[#262626] bg-[#1a1a1a]' : 'border-neutral-200 bg-white'}`}>
            <div className="flex items-end gap-2.5">
              <button
                onClick={isListening ? stopListening : startListening}
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border transition-all ${
                  isListening
                    ? 'border-neutral-300 bg-neutral-100 text-neutral-600'
                    : dark
                      ? 'border-[#333] bg-[#262626] text-neutral-400 hover:bg-[#333]'
                      : 'border-neutral-200 bg-neutral-50 text-neutral-500 hover:bg-neutral-100'
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
                className={`max-h-24 flex-1 resize-none rounded-xl border border-transparent px-3 py-2 text-[14px] subpixel-antialiased outline-none transition-all focus:border-neutral-400 ${
                  dark
                    ? 'bg-[#262626] text-neutral-200 placeholder:text-neutral-500 focus:bg-[#1a1a1a]'
                    : 'bg-neutral-50 text-neutral-800 placeholder:text-neutral-400 focus:bg-white focus:border-neutral-300'
                }`}
              />
              <button
                onClick={() => void handleCommand(input)}
                disabled={processing || !input.trim()}
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl shadow-sm transition-all hover:opacity-90 disabled:opacity-30 ${
                  dark ? 'bg-neutral-600 text-white hover:bg-neutral-500' : 'bg-neutral-800 text-white hover:bg-neutral-700'
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
