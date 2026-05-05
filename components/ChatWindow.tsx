'use client';

import React, { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import { useOffice, getAgentSystemPrompt, AgentRole } from '@/lib/OfficeContext';
import { Send, User, Sparkles, Paperclip, ArrowUp, Bot, Terminal, Shield, Wifi, Cpu, Activity, Lock, Smartphone, Settings, MoreVertical } from 'lucide-react';
import { ModelAttribution } from '@/components/ModelAttribution';
import { formatProductPlanForContext, formatStrategyForContext } from '@/lib/ventureReadableContext';
import { useSubscription } from '@/hooks/useSubscription';
import { useTokens } from '@/lib/tokens/useTokens';
import { TOKEN_COSTS } from '@/lib/tokens/tokenSystem';
import { submitDexoVenturePatch } from '@/lib/dexoProposalClient';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  model?: string;
}

interface ChatWindowProps {
  onProjectUpdate?: () => void;
}

export function ChatWindow({ onProjectUpdate }: ChatWindowProps) {
  const {
    activeRoom,
    activeProject,
    agents,
    addFile,
    updateProjectField,
    systemState,
    addSystemLog,
  } = useOffice();

  const { isPro } = useSubscription();
  const tokens = useTokens();

  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Ensure we have a valid agent, otherwise default to CEO
  const safeRoom = (['ceo', 'pm', 'accountant', 'scout', 'cmo'].includes(activeRoom)) ? activeRoom as AgentRole : 'ceo';
  const currentAgent = agents[safeRoom];
  const canChat = !systemState.isDeepWork && (isPro || tokens.canAfford(TOKEN_COSTS.CHAT_MESSAGE));

  // Auto-resize input
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 150)}px`;
    }
  }, [inputValue]);

  // Scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      const content = event.target?.result as string;
      if (content) {
        addFile(file.name, content, file.type);
        setMessages(prev => [...prev, {
          id: Date.now().toString(),
          role: 'assistant',
          content: `> DATA_INGEST: **${file.name}**\n> STATUS: ANALYSIS_COMPLETE\n> READY_FOR_INTEGRATION`,
          timestamp: Date.now()
        }]);
      }
    };
    reader.readAsText(file);
  };

  const parseAndUpdateProject = async (content: string, role: typeof activeRoom) => {
    if (!activeProject || !activeProject.id) return;
    try {
      const structuredData = extractStructuredData(content, role);
      if (structuredData) {
        const patch: Record<string, unknown> = {};
        switch (role) {
          case 'ceo':
            patch.strategy = structuredData;
            break;
          case 'pm':
            patch.productPlan = structuredData;
            break;
          case 'accountant':
            patch.budget = structuredData;
            break;
          case 'scout':
            patch.marketInsights = structuredData;
            break;
        }
        if (Object.keys(patch).length > 0) {
          await submitDexoVenturePatch({
            ventureId: activeProject.id,
            source: 'legacy_chat_window',
            model: 'Dexo',
            summary: 'Legacy desk chat suggested an update',
            patch,
            updateProjectField,
          });
        }
        onProjectUpdate?.();
      }
    } catch (err) {
      console.error('Failed to update project field:', err);
    }
  };

  const extractStructuredData = (content: string, role: string): string => {
    const lines = content.split('\n');
    const relevantLines: string[] = [];

    for (const line of lines) {
      if (line.trim().length > 0) {
        if (!line.includes('?') && !line.toLowerCase().includes('let me') && !line.toLowerCase().includes('i would')) {
          relevantLines.push(line.trim());
        }
      }
      if (relevantLines.length >= 8) break;
    }
    return relevantLines.join('\n').substring(0, 1000);
  };

  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputValue.trim() || !canChat || isLoading || !activeProject) return;

    setError(null);

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: inputValue,
      timestamp: Date.now(),
    };

    const paid = tokens.spend(TOKEN_COSTS.CHAT_MESSAGE, 'Dexo Intelligence');
    if (!paid.success) {
      setError(paid.message ?? 'Daily AI credits are used up.');
      setIsLoading(false);
      return;
    }

    setMessages((prev) => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);
    addSystemLog(`User Directive: ${userMessage.content.substring(0, 50)}...`, 'CEO', 'info');

    try {
      const safeRoom = (['ceo', 'pm', 'accountant', 'scout', 'cmo'].includes(activeRoom)) ? activeRoom as AgentRole : 'ceo';
      const systemPrompt = getAgentSystemPrompt(safeRoom);

      // Build File Context
      let fileContext = '';
      if (activeProject.files && activeProject.files.length > 0) {
        fileContext = '\n\nATTACHED FILE DATA:\n' + activeProject.files.map(f => `--- FILE: ${f.name} ---\n${f.content.substring(0, 5000)}... (truncated if too long)\n--- END FILE ---`).join('\n');
      }

      const projectContext = `
Current Project: ${activeProject.name}
CEO Strategy (readable summary, not raw JSON):
${formatStrategyForContext(activeProject.strategy)}
Product Plan (readable summary, not raw JSON):
${formatProductPlanForContext(activeProject.productPlan)}
Budget: ${activeProject.budget || 'Not yet defined'}
Market Insights: ${activeProject.marketInsights || 'Not yet defined'}
Org Structure: ${activeProject.orgStructure ? JSON.stringify(activeProject.orgStructure.map(n => ({ role: n.role, name: n.name }))) : 'None'}
Kanban Board: ${activeProject.kanban ? JSON.stringify(activeProject.kanban) : 'None'}
Founder's Diary: ${activeProject.diary ? JSON.stringify(activeProject.diary.slice(0, 5).map(e => ({ title: e.title, tags: e.tags }))) : 'None'}
${fileContext}
      `.trim();

      const response = await fetch('/api/dexo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'chat',
          payload: {
            messages: [{ role: 'user', content: `${systemPrompt}\n\n${projectContext}\n\nUser message: ${userMessage.content}` }],
            model: 'gemini-1.5-flash',
          },
        }),
      });

      if (!response.ok) throw new Error(`API error: ${response.statusText}`);

      const data = await response.json();
      const assistantContent =
        data.message?.content ??
        data.choices?.[0]?.message?.content ??
        'No response received - Check Signal';

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: assistantContent,
        timestamp: Date.now(),
        model: typeof data.model === 'string' ? data.model : undefined,
      };

      setMessages((prev) => [...prev, assistantMessage]);
      addSystemLog(`Dexo Response: Analysis Complete.`, 'DEXO', 'success');
      await parseAndUpdateProject(assistantContent, activeRoom);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'SIGNAL_LOST';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div className="relative flex h-full flex-col bg-transparent font-sans text-[var(--text-secondary)] transition-colors duration-500">

      {/* Header - Floating Glass */}
      <div className="absolute top-4 left-0 right-0 z-20 px-4 flex justify-center">
        <header className="flex h-14 w-full min-w-[320px] max-w-4xl items-center justify-between rounded-full border border-[var(--border)] bg-[var(--bg-card)]/94 px-6 shadow-[var(--shadow-soft)] backdrop-blur-xl">
          <div className="flex items-center gap-4">
            <div className="flex h-8 w-8 items-center justify-center rounded-full border border-[rgba(255,255,255,0.07)] bg-[var(--accent-soft)] text-[var(--accent)]">
              <Bot className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold tracking-tight text-[var(--text-primary)]">Dexo Intelligence</h2>
              <div className="flex items-center gap-1.5">
                <span className="h-1 w-1 rounded-full bg-[var(--accent)] animate-pulse"></span>
                <span className="text-[9px] font-bold uppercase tracking-widest text-[var(--accent)]">Online</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button className="rounded-full p-2 text-[var(--text-muted)] transition-colors hover:bg-[var(--accent-soft)] hover:text-[var(--text-primary)]">
              <Settings className="w-4 h-4" />
            </button>
          </div>
        </header>
      </div>

      {/* Chat Area */}
      <div className="flex-1 overflow-y-auto px-4 py-24 scroll-smooth custom-scrollbar">
        <div className="max-w-3xl mx-auto space-y-8">
          {messages.length === 0 && (
            <div className="text-center py-20 animate-in fade-in duration-700 slide-in-from-bottom-4">
              <div className="relative mx-auto mb-8 flex h-20 w-20 items-center justify-center overflow-hidden rounded-3xl border border-[var(--border)] bg-[var(--bg-card)] shadow-[var(--shadow-soft)]">
                <div className="absolute inset-0 scale-150 rotate-45 transform bg-[var(--accent-soft)]/50"></div>
                <Terminal className="h-10 w-10 text-[var(--text-muted)]" />
              </div>
              <h3 className="mb-2 text-xl font-bold tracking-tight text-[var(--text-primary)]">Neural Link Established</h3>
              <p className="mx-auto max-w-sm font-mono text-xs uppercase leading-relaxed tracking-widest text-[var(--text-muted)]">
                {'>'} Awaiting input coordinates...<br />
                {'>'} System ready.
              </p>
            </div>
          )}

          {messages.map((msg, idx) => (
            <div key={idx} className={`flex gap-4 ${msg.role === 'user' ? 'flex-row-reverse' : ''} animate-in fade-in slide-in-from-bottom-2 duration-300 group`}>
              {/* Avatar */}
              <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border shadow-sm ${msg.role === 'user'
                ? 'border-[rgba(255,255,255,0.07)] bg-[var(--accent-soft)] text-[var(--accent)]'
                : 'border-[var(--border)] bg-[var(--bg-card)] text-[var(--text-muted)]'
                }`}>
                {msg.role === 'user' ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
              </div>

              {/* Bubble */}
              <div className={`flex flex-col max-w-[85%] ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                <div className={`rounded-3xl border px-6 py-4 text-sm font-medium leading-relaxed shadow-sm backdrop-blur-sm transition-all ${msg.role === 'user'
                  ? 'rounded-tr-sm border-[rgba(255,255,255,0.07)] bg-[var(--accent-soft)] text-[var(--text-primary)] hover:border-[rgba(255,255,255,0.07)]'
                  : 'rounded-tl-sm border-[var(--border)] bg-[var(--bg-card)] text-[var(--text-secondary)] hover:border-[rgba(255,255,255,0.07)]'
                  }`}>
                  <ReactMarkdown components={{
                    code: ({ node, inline, className, children, ...props }: any) => (
                      inline ?
                        <code className="rounded border border-[var(--border)] bg-[var(--bg-elevated)] px-1.5 py-0.5 font-mono text-xs text-[var(--accent)]" {...props}>{children}</code> :
                        <div className="my-3 overflow-x-auto rounded-xl border border-[var(--border)] bg-[var(--bg-secondary)]/70 p-4 shadow-inner">
                          <code className="font-mono text-xs text-[var(--text-secondary)]" {...props}>{children}</code>
                        </div>
                    ),
                    strong: ({ node, children }) => <strong className="font-bold text-[var(--text-primary)]">{children}</strong>,
                    a: ({ node, children, href }) => <a href={href} className="text-[var(--accent)] underline underline-offset-2 hover:opacity-80" target="_blank" rel="noreferrer">{children}</a>
                  }}>
                    {msg.content}
                  </ReactMarkdown>
                  {msg.role === 'assistant' ? <ModelAttribution model={msg.model} /> : null}
                </div>
                <span className="mt-2 px-1 font-mono text-[9px] uppercase tracking-widest text-[var(--text-muted)] opacity-0 transition-opacity group-hover:opacity-100">
                  {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            </div>
          ))}

          {isLoading && (
            <div className="flex gap-4 animate-in fade-in pl-1">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-[var(--border)] bg-[var(--bg-card)] text-[var(--accent)]">
                <Bot className="w-4 h-4 animate-pulse" />
              </div>
              <div className="flex items-center gap-2 rounded-3xl rounded-tl-sm border border-[var(--border)] bg-[var(--bg-card)] px-5 py-4">
                <div className="h-1.5 w-1.5 animate-bounce rounded-full bg-[var(--accent)] [animation-delay:-0.3s]"></div>
                <div className="h-1.5 w-1.5 animate-bounce rounded-full bg-[var(--accent)] [animation-delay:-0.15s]"></div>
                <div className="h-1.5 w-1.5 animate-bounce rounded-full bg-[var(--accent)]"></div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} className="h-24" />
        </div>
      </div>

      {/* Input Area - Floating Capsule */}
      <div className="absolute bottom-6 left-0 right-0 px-4 flex justify-center z-20">
        <div className="flex w-full max-w-3xl items-end gap-2 rounded-[2rem] border border-[var(--border)] bg-[var(--bg-card)]/95 p-2 shadow-[var(--shadow-panel)] backdrop-blur-xl transition-all hover:border-[var(--border-strong)] focus-within:border-[rgba(255,255,255,0.07)] focus-within:ring-4 focus-within:ring-[rgba(255,255,255,0.07)]">

          <button
            onClick={() => document.getElementById('chat-upload')?.click()}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-[var(--text-muted)] transition-colors hover:bg-[var(--accent-soft)] hover:text-[var(--text-primary)]"
            title="Upload Data"
          >
            <Paperclip className="w-4 h-4" />
          </button>
          <input
            type="file"
            id="chat-upload"
            className="hidden"
            onChange={handleFileUpload}
          />

          <textarea
            ref={textareaRef}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Enter command or message..."
            className="max-h-32 min-h-[44px] flex-1 resize-none border-none bg-transparent py-3 text-sm font-medium leading-relaxed text-[var(--text-primary)] outline-none placeholder:text-[var(--text-muted)] focus:ring-0"
            rows={1}
          />

          <button
            onClick={() => handleSendMessage()}
            disabled={!inputValue.trim() || isLoading}
            className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${inputValue.trim() && !isLoading
              ? 'bg-[var(--accent)] text-white shadow-lg shadow-[rgba(255,255,255,0.07)] hover:scale-110 hover:opacity-90'
              : 'cursor-not-allowed bg-[var(--bg-secondary)] text-[var(--text-muted)]'
              }`}
          >
            <ArrowUp className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

