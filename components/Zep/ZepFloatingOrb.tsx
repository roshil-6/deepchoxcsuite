'use client';

import React, { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { useZepConversationalVoice } from '@/lib/useZepVoice';
import { useOffice } from '@/lib/OfficeContext';
import { useTheme } from '@/lib/ThemeContext';
import { Mic, X, Send, Sparkles, Bot, User, ChevronRight, Waves } from 'lucide-react';
import {
  dispatchZepNav,
  loadEngineeringSummaries,
  readActiveShellView,
  readSelectedEngProjectId,
} from '@/lib/zepAppBridge';
import { ZepParticles } from './ZepParticles';
import { ZepTypingText } from './ZepTypingText';
import { 
  detectEmotion, 
  addEmotionalLayer, 
  getStateVisuals, 
  humanizeResponse,
  getContextualGreeting,
  ZepMemory,
  type ZepEmotion,
  type ZepState as ZepPersonalityState
} from './ZepPersonality';

interface ZepCommand {
  action: string;
  params: Record<string, unknown>;
}

interface Message {
  role: 'user' | 'zep';
  text: string;
  command?: ZepCommand;
  emotion?: ZepEmotion;
  isNew?: boolean;
  timestamp: number;
}

export function ZepFloatingOrb() {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');
  const [emotion, setEmotion] = useState<ZepEmotion>('neutral');
  const [orbHovered, setOrbHovered] = useState(false);
  const [showGreeting, setShowGreeting] = useState(true);
  const memoryRef = useRef(new ZepMemory());
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const { activeProject, switchRoom, createNewProject, updateProjectField } = useOffice();
  const { theme } = useTheme();
  const dark = theme === 'dark';

  // Initial greeting with personality
  const initialGreeting = useMemo(() => {
    const greeting = getContextualGreeting();
    return [
      greeting,
      '',
      'I\'m Zep — your workspace companion. I can help you:',
      '• Navigate to Engineering, Research, or Sites',
      '• Start new projects and track progress',
      '• Answer questions about your workspace',
      '• Just chat — I\'m here to help!',
      '',
      'What would you like to do?',
    ].join('\n');
  }, []);

  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'zep',
      text: initialGreeting,
      emotion: 'helpful',
      isNew: true,
      timestamp: Date.now(),
    },
  ]);

  const [processing, setProcessing] = useState(false);
  const [confirmCommand, setConfirmCommand] = useState<ZepCommand | null>(null);
  const [currentState, setCurrentState] = useState<ZepPersonalityState>('idle');

  const {
    interimTranscript,
    isListening,
    startListening,
    stopListening,
    speak,
  } = useZepConversationalVoice({
    onTranscript: (text) => handleCommand(text),
    onInterim: (text) => setInput(text),
  });

  // Update state based on voice
  useEffect(() => {
    if (isListening) {
      setCurrentState('listening');
    } else if (processing) {
      setCurrentState('thinking');
    } else {
      setCurrentState('idle');
    }
  }, [isListening, processing]);

  // Auto-scroll
  useEffect(() => { 
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); 
  }, [messages, confirmCommand]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  // Hide greeting after first interaction
  useEffect(() => {
    if (messages.length > 1) {
      setShowGreeting(false);
    }
  }, [messages.length]);

  // Execute commands
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
            return 'Opening Research. This is where market intelligence lives.';
          }
          if (room === 'engineering') {
            dispatchZepNav({ kind: 'set_view', view: 'engineering' });
            switchRoom(room as Parameters<typeof switchRoom>[0]);
            return 'Opening Engineering — time to build something amazing!';
          }
          if (room === 'sites') {
            dispatchZepNav({ kind: 'set_view', view: 'sites' });
            return 'Opening Sites. Describe the page you want and I\'ll help generate it!';
          }
          if (room === 'dashboard') {
            dispatchZepNav({ kind: 'set_view', view: 'engineering' });
            switchRoom('dashboard' as Parameters<typeof switchRoom>[0]);
            return 'Bringing you to Engineering — your central hub.';
          }

          dispatchZepNav({ kind: 'set_view', view: 'engineering' });
          switchRoom(room as Parameters<typeof switchRoom>[0]);
          const nice = roomAliases[room] || room;
          return `I don't have a "${nice}" screen in this workspace — I\'ll take you to Engineering instead, where most of the action happens.`;
        }

        case 'create_venture': {
          dispatchZepNav({ kind: 'new_project' });
          createNewProject?.();
          memoryRef.current.addTopic('new project');
          return 'Fresh project created! Use the prompt on the Engineering page — eight specialist agents will run after you submit. Exciting stuff!';
        }

        case 'open_research': {
          dispatchZepNav({ kind: 'set_view', view: 'research' });
          switchRoom('research' as Parameters<typeof switchRoom>[0]);
          memoryRef.current.addTopic('research');
          return 'Opening Research. What market or topic should we dive into?';
        }

        case 'open_engineering': {
          dispatchZepNav({ kind: 'set_view', view: 'engineering' });
          switchRoom('engineering' as Parameters<typeof switchRoom>[0]);
          memoryRef.current.addTopic('engineering');
          return 'Engineering it is! Ready to orchestrate some builds?';
        }

        case 'open_sites': {
          dispatchZepNav({ kind: 'set_view', view: 'sites' });
          memoryRef.current.addTopic('sites');
          return 'Sites opened — type a brief, paste styles you like, then hit Generate. Let\'s make something beautiful!';
        }

        case 'open_dashboard': {
          dispatchZepNav({ kind: 'set_view', view: 'engineering' });
          switchRoom('dashboard' as Parameters<typeof switchRoom>[0]);
          return 'Welcome to Engineering — your command center.';
        }

        case 'list_ventures': {
          const list = loadEngineeringSummaries();
          memoryRef.current.addTopic('viewing projects');
          if (!list.length) {
            return 'No saved projects yet. Say "new project" to get started — I\'ll walk you through it!';
          }
          const lines = list.slice(0, 8).map((p) => `• ${p.title}`).join('\n');
          return `You have ${list.length} project${list.length === 1 ? '' : 's'} saved:\n${lines}${list.length > 8 ? `\n...and ${list.length - 8} more` : ''}\n\nWant to open one?`;
        }

        case 'status': {
          const view = readActiveShellView();
          const id = readSelectedEngProjectId();
          const summaries = loadEngineeringSummaries();
          const projLabel = id != null 
            ? (summaries.find((p) => p.id === id)?.title ?? 'Selected project') 
            : 'New-build screen';
          const viewLabel = view === 'research' ? 'Research' : view === 'sites' ? 'Sites' : 'Engineering';
          
          return [
            `Current view: ${viewLabel}`,
            `Project focus: ${projLabel}`,
            `Saved projects: ${summaries.length}`,
            '',
            memoryRef.current.getRecentContext(),
          ].join('\n');
        }

        case 'close_zep': {
          setIsOpen(false);
          return 'See you later! Just click the orb whenever you need me.';
        }

        case 'run_staff_sync': {
          return 'Staff sync is more of a legacy feature. Here, I recommend rerunning Research headlines or kicking off a fresh Engineering build!';
        }

        case 'update_strategy': {
          if (!activeProject) {
            return 'No active project for that command — strategy edits live inside Engineering specs after a run.';
          }
          const content = cmd.params.content as string;
          await updateProjectField?.('strategy', content);
          memoryRef.current.addTopic('strategy update');
          return 'Strategy updated! You\'re thinking strategically — love it.';
        }

        case 'update_product_plan': {
          if (!activeProject) return 'No project loaded. Use the tabs under an Engineering build for product-shaped output.';
          const content = cmd.params.content as string;
          await updateProjectField?.('productPlan', content);
          memoryRef.current.addTopic('product plan');
          return 'Product plan updated. You\'re really nailing this!';
        }

        case 'update_budget': {
          if (!activeProject) return 'No project loaded.';
          const content = cmd.params.content as string;
          await updateProjectField?.('budget', content);
          memoryRef.current.addTopic('budget');
          return 'Budget updated. Keeping those numbers in check!';
        }

        case 'update_market_insights': {
          if (!activeProject) return 'No project loaded — try Research for market intel.';
          const content = cmd.params.content as string;
          await updateProjectField?.('marketInsights', content);
          memoryRef.current.addTopic('market insights');
          return 'Market intelligence updated. You\'re staying ahead of the curve!';
        }

        case 'add_note': {
          if (!activeProject) return 'No project loaded for notes.';
          const note = cmd.params.note as string;
          const current = (activeProject as { userNotes?: string }).userNotes || '';
          await updateProjectField?.('userNotes', current + '\n\n' + note);
          memoryRef.current.addTopic('notes');
          return 'Note saved. I love a good brain dump!';
        }

        case 'ask_help':
          return [
            'Here\'s what I can do in this workspace:',
            '',
            '📍 Navigation:',
            '• "Open Engineering" — your build orchestrator',
            '• "Open Research" — market intelligence',
            '• "Open Sites" — prompt-to-landing-page builder',
            '',
            '🚀 Actions:',
            '• "New project" — start fresh',
            '• "Show my projects" — see what you\'ve saved',
            '• "Status" — current workspace state',
            '',
            '💬 Chat: Just talk to me naturally — I\'ll do my best to help!',
          ].join('\n');

        default:
          return `Hmm, I don't recognize "${cmd.action}". Try asking for help to see what I can do!`;
      }
    } catch (err) {
      return `Oops! Something went wrong: ${err instanceof Error ? err.message : 'Unknown error'}`;
    }
  }, [activeProject, switchRoom, createNewProject, updateProjectField]);

  // Parse natural language
  const parseCommand = (text: string): ZepCommand | null => {
    const lower = text.toLowerCase();

    if (/(take me to|switch to|go to|show me|open) (?:the )?sites\b/i.test(lower)) {
      return { action: 'switch_room', params: { room: 'sites' } };
    }

    const roomMatches = [
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
      { pattern: /go to (?:the )?(ceo|pm|accountant|scout|cmo|dexo|shark|research|dashboard|engineering|calendar|reports|invention)/, room: '$1' },
      { pattern: /open (?:the )?(ceo|pm|accountant|scout|cmo|dexo|shark|research|dashboard|engineering|calendar|reports|invention)/, room: '$1' },
      { pattern: /show me (?:the )?(ceo|pm|accountant|scout|cmo|dexo|shark|research|dashboard|engineering|calendar|reports|invention)/, room: '$1' },
    ];

    for (const m of roomMatches) {
      const match = lower.match(m.pattern);
      if (match) return { action: 'switch_room', params: { room: m.room === '$1' ? match[1] : m.room } };
    }

    if (/open research|show research|go to research/i.test(lower)) {
      return { action: 'open_research', params: {} };
    }

    if (/open engineering|show engineering|go to engineering|open platform/i.test(lower)) {
      return { action: 'open_engineering', params: {} };
    }

    if (/open sites|sites builder|\bsite builder\b|prompt to website|website from prompt|landing page builder/i.test(lower)) {
      return { action: 'open_sites', params: {} };
    }

    if (/open dashboard|show dashboard|go to dashboard|go home/i.test(lower)) {
      return { action: 'open_dashboard', params: {} };
    }

    if (
      /create (?:a )?(?:new )?venture|new venture|add venture|start (?:a )?venture/i.test(lower)
      || /start (?:a )?new project|open (?:a )?new project|^(?:new project|fresh build)$/i.test(lower.trim())
    ) {
      return { action: 'create_venture', params: {} };
    }

    if (/list (?:my )?ventures|show (?:my )?ventures|what ventures|(?:show|list) (?:my )?projects|^my projects$/i.test(lower.trim())) {
      return { action: 'list_ventures', params: {} };
    }

    if (/what'?s the status|status update|current status|where am i|what\'s happening/i.test(lower)) {
      return { action: 'status', params: {} };
    }

    if (/close zep|hide zep|goodbye|bye zep|exit/i.test(lower)) {
      return { action: 'close_zep', params: {} };
    }

    if (/run (?:staff )?sync|sync (?:the )?staff|refresh (?:all )?agents|sync now|sync agents/i.test(lower)) {
      return { action: 'run_staff_sync', params: {} };
    }

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

    const noteMatch = lower.match(/(?:add|write) (?:a )?note[:\s]*(.+)/i);
    if (noteMatch) return { action: 'add_note', params: { note: noteMatch[1].trim() } };

    if (/help|what can you do|how do i|commands|what do you do|what are you/i.test(lower)) {
      return { action: 'ask_help', params: {} };
    }

    return null;
  };

  const handleCommand = async (text: string) => {
    if (!text.trim()) return;
    setProcessing(true);
    setInput('');
    setCurrentState('thinking');

    // Detect emotion and update
    const detectedEmotion = detectEmotion(text, memoryRef.current.getRecentContext());
    setEmotion(detectedEmotion);

    // Add user message
    setMessages(m => [...m, { 
      role: 'user', 
      text,
      emotion: detectedEmotion,
      timestamp: Date.now()
    }]);

    const command = parseCommand(text);

    if (command) {
      const needsConfirm = ['update_strategy', 'update_product_plan', 'update_budget', 'update_market_insights'].includes(command.action);

      if (needsConfirm && !confirmCommand) {
        setConfirmCommand(command);
        const confirmText = `I'll ${command.action.replace(/_/g, ' ')}. Confirm?`;
        const emotionalText = addEmotionalLayer(confirmText, 'helpful');
        setMessages(m => [...m, {
          role: 'zep',
          text: emotionalText,
          command,
          emotion: 'helpful',
          isNew: true,
          timestamp: Date.now()
        }]);
        speak(emotionalText);
      } else {
        const result = await executeCommand(command);
        const humanized = humanizeResponse(result);
        const emotional = addEmotionalLayer(humanized, detectedEmotion);
        setMessages(m => [...m, { 
          role: 'zep', 
          text: emotional,
          emotion: detectedEmotion,
          isNew: true,
          timestamp: Date.now()
        }]);
        speak(emotional);
      }
    } else {
      // Send to AI with personality context
      try {
        setCurrentState('thinking');
        const res = await fetch('/api/zep', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: text,
            context: buildContext(),
            history: messages.slice(-10),
            emotion: detectedEmotion,
          }),
        });
        const data = await res.json();
        let reply = data.reply || "Hmm, I'm not quite sure about that. Try asking for help to see what I can do!";
        
        // Humanize and add emotion
        reply = humanizeResponse(reply);
        reply = addEmotionalLayer(reply, detectedEmotion);
        
        setMessages(m => [...m, { 
          role: 'zep', 
          text: reply,
          emotion: detectedEmotion,
          isNew: true,
          timestamp: Date.now()
        }]);
        speak(reply);
      } catch {
        const fallback = "Oops, I couldn't process that. My circuits might be a bit tired — try again?";
        setMessages(m => [...m, { 
          role: 'zep', 
          text: fallback,
          emotion: 'helpful',
          isNew: true,
          timestamp: Date.now()
        }]);
        speak(fallback);
      }
    }

    setProcessing(false);
    setCurrentState('idle');
  };

  const buildContext = () => {
    const view = readActiveShellView();
    const eng = loadEngineeringSummaries();
    const shell = view === 'research' ? 'Research headlines' : view === 'sites' ? 'Sites builder' : 'Engineering orchestration';
    return [
      `Active: ${shell}`,
      `Project: ${activeProject?.name ?? 'none'}`,
      `Saved: ${eng.length}`,
      memoryRef.current.getRecentContext(),
    ].join('\n');
  };

  const confirm = async () => {
    if (!confirmCommand) return;
    setCurrentState('processing');
    const result = await executeCommand(confirmCommand);
    const humanized = humanizeResponse(result);
    const emotional = addEmotionalLayer(humanized, 'encouraging');
    setMessages(m => [...m, { 
      role: 'zep', 
      text: emotional,
      emotion: 'encouraging',
      isNew: true,
      timestamp: Date.now()
    }]);
    speak(emotional);
    setConfirmCommand(null);
    setCurrentState('idle');
  };

  const cancel = () => {
    setConfirmCommand(null);
    const cancelText = addEmotionalLayer('No problem, cancelled.', 'neutral');
    setMessages(m => [...m, { 
      role: 'zep', 
      text: cancelText,
      emotion: 'neutral',
      isNew: true,
      timestamp: Date.now()
    }]);
    speak('Cancelled.');
  };

  const visuals = getStateVisuals(currentState, dark);

  return (
    <>
      {/* Floating Orb with Particles */}
      {!isOpen && (
        <div className="fixed z-[45] max-lg:right-4 max-lg:bottom-[calc(4.75rem+env(safe-area-inset-bottom))] lg:bottom-6 lg:right-6">
          {/* Greeting tooltip */}
          {showGreeting && (
            <div 
              className={`absolute bottom-full right-0 mb-3 w-64 rounded-xl border p-3 text-sm shadow-lg animate-in fade-in slide-in-from-bottom-2 ${
                dark 
                  ? 'border-neutral-800 bg-neutral-900 text-neutral-200' 
                  : 'border-neutral-200 bg-white text-neutral-700'
              }`}
            >
              <p className="font-medium">Hey there! I&apos;m Zep 👋</p>
              <p className="mt-1 text-xs opacity-70">Click me for help with your workspace</p>
              <button 
                onClick={() => setShowGreeting(false)}
                className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-neutral-500 text-white text-xs"
              >
                ×
              </button>
            </div>
          )}
          
          <button
            onClick={() => setIsOpen(true)}
            onMouseEnter={() => setOrbHovered(true)}
            onMouseLeave={() => setOrbHovered(false)}
            className={`relative flex h-14 w-14 items-center justify-center rounded-full transition-all duration-300 hover:scale-110 ${
              dark
                ? 'shadow-[0_8px_32px_-8px_rgba(0,0,0,0.5)] hover:shadow-[0_12px_40px_-10px_rgba(255,255,255,0.12)]'
                : 'shadow-[0_8px_32px_-8px_rgba(0,0,0,0.25)] hover:shadow-[0_12px_40px_-10px_rgba(0,0,0,0.35)]'
            }`}
            style={{
              background: `linear-gradient(135deg, ${visuals.glow}, transparent)`,
            }}
            aria-label="Open Zep"
          >
            {/* Particle Canvas */}
            <ZepParticles 
              isDark={dark} 
              state={currentState} 
              isHovered={orbHovered}
              size={56}
            />
            
            {/* Inner Orb */}
            <div className={`relative flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br ${visuals.gradient} shadow-inner`}>
              {currentState === 'listening' ? (
                <Waves className="h-4 w-4 animate-pulse text-white" />
              ) : currentState === 'thinking' ? (
                <Sparkles className="h-4 w-4 animate-spin text-white" />
              ) : (
                <Bot className="h-4 w-4 text-white" />
              )}
            </div>

            {/* Status Ring */}
            {currentState !== 'idle' && (
              <div 
                className="absolute inset-0 rounded-full border-2 border-dashed animate-spin"
                style={{ 
                  borderColor: visuals.ringColor,
                  animationDuration: currentState === 'listening' ? '3s' : '8s'
                }}
              />
            )}
          </button>
        </div>
      )}

      {/* Chat Panel */}
      {isOpen && (
        <div className={`fixed z-[45] flex flex-col overflow-hidden rounded-2xl border shadow-[0_24px_60px_-20px_rgba(0,0,0,0.35)] max-lg:inset-x-3 max-lg:bottom-[calc(4.75rem+env(safe-area-inset-bottom))] max-lg:h-[min(72dvh,520px)] max-lg:w-auto lg:bottom-6 lg:right-6 lg:h-[520px] lg:w-[400px] ${
          dark
            ? 'border-[#262626] bg-[#141414]'
            : 'border-neutral-200/80 bg-white shadow-[0_24px_60px_-20px_rgba(0,0,0,0.2)]'
        }`}>
          {/* Header with emotion indicator */}
          <div className={`flex items-center justify-between border-b px-4 py-3.5 ${dark ? 'border-[#262626] bg-[#1a1a1a]' : 'border-neutral-100 bg-neutral-50/80'}`}>
            <div className="flex items-center gap-3">
              <div 
                className={`flex h-9 w-9 items-center justify-center rounded-full shadow-sm transition-all duration-300 bg-gradient-to-br ${visuals.gradient}`}
              >
                {currentState === 'listening' ? (
                  <Waves className="h-4 w-4 text-white animate-pulse" />
                ) : currentState === 'thinking' ? (
                  <Sparkles className="h-4 w-4 text-white animate-spin" />
                ) : (
                  <Bot className="h-4 w-4 text-white" />
                )}
              </div>
              <div>
                <span className={`font-semibold tracking-tight ${dark ? 'text-neutral-200' : 'text-neutral-800'}`}>Zep</span>
                <span className={`ml-2 text-xs capitalize opacity-60 ${dark ? 'text-neutral-400' : 'text-neutral-500'}`}>
                  {currentState === 'idle' ? emotion : currentState}
                </span>
              </div>
            </div>
            <button 
              onClick={() => setIsOpen(false)} 
              className={`rounded-md p-1.5 transition-colors ${dark ? 'text-neutral-500 hover:bg-[#262626] hover:text-neutral-300' : 'text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700'}`}
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Messages with typing effect */}
          <div className={`flex-1 space-y-4 overflow-y-auto p-4 ${dark ? 'bg-[#0a0a0a]' : 'bg-[#fafafa]'}`}>
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'} gap-2`}>
                {m.role === 'zep' && (
                  <div className={`mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${dark ? 'bg-neutral-800' : 'bg-neutral-200'}`}>
                    <Bot className={`h-3 w-3 ${dark ? 'text-neutral-400' : 'text-neutral-600'}`} />
                  </div>
                )}
                <div className={`max-w-[80%] rounded-2xl px-4 py-3 text-[14px] leading-relaxed ${
                  m.role === 'user'
                    ? 'bg-neutral-700 text-white shadow-sm'
                    : dark
                      ? 'border border-[#262626] bg-[#1a1a1a] text-neutral-200 shadow-sm'
                      : 'border border-neutral-200/80 bg-white text-neutral-700 shadow-sm'
                }`}>
                  {m.isNew && m.role === 'zep' ? (
                    <ZepTypingText 
                      text={m.text} 
                      speed={22}
                      onComplete={() => {
                        setMessages(prev => prev.map((msg, idx) => 
                          idx === i ? { ...msg, isNew: false } : msg
                        ));
                      }}
                    />
                  ) : (
                    m.text.split('\n').map((line, j) => (
                      <div key={j} className={line.trim() === '' ? 'h-3' : ''}>
                        {line || ''}
                      </div>
                    ))
                  )}
                </div>
                {m.role === 'user' && (
                  <div className={`mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${dark ? 'bg-neutral-700' : 'bg-neutral-300'}`}>
                    <User className={`h-3 w-3 ${dark ? 'text-neutral-300' : 'text-neutral-600'}`} />
                  </div>
                )}
              </div>
            ))}

            {/* Confirmation */}
            {confirmCommand && (
              <div className="flex gap-2 pl-8 pt-1">
                <button 
                  onClick={confirm} 
                  className="flex items-center gap-1.5 rounded-lg bg-neutral-700 px-3 py-2 text-[13px] font-medium text-white shadow-sm transition-colors hover:bg-neutral-600"
                >
                  <ChevronRight className="h-3.5 w-3.5" />
                  Confirm
                </button>
                <button 
                  onClick={cancel} 
                  className={`rounded-lg border px-3 py-2 text-[13px] font-medium transition-colors ${dark ? 'border-[#333] bg-[#1a1a1a] text-neutral-300 hover:bg-[#262626]' : 'border-neutral-200 bg-white text-neutral-600 hover:bg-neutral-50'}`}
                >
                  Cancel
                </button>
              </div>
            )}

            {/* Thinking indicator */}
            {processing && !confirmCommand && (
              <div className="flex justify-start gap-2 pl-8 pt-1">
                <div className={`flex items-center gap-2 rounded-2xl border px-4 py-2.5 shadow-sm ${dark ? 'border-[#262626] bg-[#1a1a1a] text-neutral-400' : 'border-neutral-200 bg-white text-neutral-500'}`}>
                  <div className="flex gap-1">
                    <span className="h-2 w-2 animate-bounce rounded-full bg-current" style={{ animationDelay: '0ms' }} />
                    <span className="h-2 w-2 animate-bounce rounded-full bg-current" style={{ animationDelay: '150ms' }} />
                    <span className="h-2 w-2 animate-bounce rounded-full bg-current" style={{ animationDelay: '300ms' }} />
                  </div>
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
                    ? 'border-amber-400 bg-amber-100 text-amber-600 animate-pulse'
                    : dark
                      ? 'border-[#333] bg-[#262626] text-neutral-400 hover:bg-[#333] hover:text-neutral-300'
                      : 'border-neutral-200 bg-neutral-50 text-neutral-500 hover:bg-neutral-100'
                }`}
              >
                <Mic className="h-4 w-4" />
              </button>
              <textarea
                ref={inputRef}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    void handleCommand(input);
                  }
                }}
                placeholder={isListening ? 'Listening...' : 'Ask me anything...'}
                rows={1}
                disabled={processing}
                className={`max-h-24 flex-1 resize-none rounded-xl border border-transparent px-3 py-2 text-[14px] outline-none transition-all focus:border-neutral-400 ${
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
                {interimTranscript || 'Listening... Speak clearly'}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
