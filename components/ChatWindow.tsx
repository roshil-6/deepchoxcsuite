'use client';

import React, { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import { useOffice, getAgentSystemPrompt, AgentRole } from '@/lib/OfficeContext';
import { updateProjectField } from '@/lib/db';
import { Send, User, Sparkles, Paperclip, ArrowUp, Bot, Terminal, Shield, Wifi, Cpu, Activity, Lock, Smartphone, Settings, MoreVertical } from 'lucide-react';
import { ModelAttribution } from '@/components/ModelAttribution';
import { formatProductPlanForContext, formatStrategyForContext } from '@/lib/ventureReadableContext';

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
    updateMarketInsights,
    addFile,
    updateStrategy,
    updateProductPlan,
    updateBudget,
    systemState,
    addSystemLog,
  } = useOffice();

  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [messageCount, setMessageCount] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Ensure we have a valid agent, otherwise default to CEO
  const safeRoom = (['ceo', 'pm', 'accountant', 'scout', 'cmo'].includes(activeRoom)) ? activeRoom as AgentRole : 'ceo';
  const currentAgent = agents[safeRoom];
  const maxFreeMessages = 5;
  const canChat = (messageCount < maxFreeMessages) && !systemState.isDeepWork;

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
        switch (role) {
          case 'ceo':
            updateStrategy(structuredData);
            await updateProjectField(activeProject.id, 'strategy', structuredData);
            break;
          case 'pm':
            updateProductPlan(structuredData);
            await updateProjectField(activeProject.id, 'productPlan', structuredData);
            break;
          case 'accountant':
            updateBudget(structuredData);
            await updateProjectField(activeProject.id, 'budget', structuredData);
            break;
          case 'scout':
            updateMarketInsights(structuredData);
            await updateProjectField(activeProject.id, 'marketInsights', structuredData);
            break;
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

    setMessages((prev) => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);
    addSystemLog(`User Directive: ${inputValue.substring(0, 50)}...`, 'CEO', 'info');

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

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [{ role: 'user', content: `${systemPrompt}\n\n${projectContext}\n\nUser message: ${inputValue}` }],
          model: 'gemini-1.5-flash',
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
      setMessageCount((prev) => prev + 1);
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
    <div className="flex flex-col h-full bg-[#0a0a0a] text-zinc-300 relative font-sans transition-colors duration-500">

      {/* Header - Floating Glass */}
      <div className="absolute top-4 left-0 right-0 z-20 px-4 flex justify-center">
        <header className="h-14 bg-black/60 backdrop-blur-xl border border-zinc-800 rounded-full px-6 flex items-center justify-between shadow-xl min-w-[320px] max-w-4xl w-full">
          <div className="flex items-center gap-4">
            <div className="w-8 h-8 rounded-full bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
              <Bot className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-zinc-100 tracking-tight">Dexo Intelligence</h2>
              <div className="flex items-center gap-1.5">
                <span className="w-1 h-1 bg-violet-500 rounded-full animate-pulse"></span>
                <span className="text-[9px] font-bold text-violet-500/80 uppercase tracking-widest">Online</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button className="p-2 text-zinc-500 hover:text-white transition-colors rounded-full hover:bg-zinc-800/50">
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
              <div className="w-20 h-20 bg-zinc-900/30 rounded-3xl flex items-center justify-center mx-auto mb-8 border border-zinc-800 shadow-2xl relative overflow-hidden">
                <div className="absolute inset-0 bg-indigo-500/5 rotate-45 transform scale-150"></div>
                <Terminal className="w-10 h-10 text-zinc-700" />
              </div>
              <h3 className="text-xl font-bold text-zinc-200 mb-2 tracking-tight">Neural Link Established</h3>
              <p className="text-zinc-600 max-w-sm mx-auto font-mono text-xs leading-relaxed uppercase tracking-widest">
                {'>'} Awaiting input coordinates...<br />
                {'>'} System ready.
              </p>
            </div>
          )}

          {messages.map((msg, idx) => (
            <div key={idx} className={`flex gap-4 ${msg.role === 'user' ? 'flex-row-reverse' : ''} animate-in fade-in slide-in-from-bottom-2 duration-300 group`}>
              {/* Avatar */}
              <div className={`w-8 h-8 rounded-full shrink-0 flex items-center justify-center shadow-lg border ${msg.role === 'user'
                ? 'bg-zinc-800 border-zinc-700 text-zinc-300'
                : 'bg-indigo-950/20 border-indigo-500/20 text-indigo-400'
                }`}>
                {msg.role === 'user' ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
              </div>

              {/* Bubble */}
              <div className={`flex flex-col max-w-[85%] ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                <div className={`px-6 py-4 rounded-3xl shadow-sm text-sm font-medium leading-relaxed backdrop-blur-sm border transition-all ${msg.role === 'user'
                  ? 'bg-zinc-900 border-zinc-800 text-zinc-100 rounded-tr-sm hover:border-zinc-700'
                  : 'bg-zinc-900/60 border-zinc-800 text-zinc-300 rounded-tl-sm hover:border-indigo-500/20'
                  }`}>
                  <ReactMarkdown components={{
                    code: ({ node, inline, className, children, ...props }: any) => (
                      inline ?
                        <code className="bg-zinc-950 px-1.5 py-0.5 rounded text-indigo-400 font-mono text-xs border border-zinc-800" {...props}>{children}</code> :
                        <div className="bg-black/40 border border-zinc-800 rounded-xl p-4 my-3 overflow-x-auto shadow-inner">
                          <code className="text-xs font-mono text-zinc-400" {...props}>{children}</code>
                        </div>
                    ),
                    strong: ({ node, children }) => <strong className="text-white font-bold">{children}</strong>,
                    a: ({ node, children, href }) => <a href={href} className="text-indigo-400 hover:text-indigo-300 underline underline-offset-2" target="_blank" rel="noreferrer">{children}</a>
                  }}>
                    {msg.content}
                  </ReactMarkdown>
                  {msg.role === 'assistant' ? <ModelAttribution model={msg.model} /> : null}
                </div>
                <span className="text-[9px] text-zinc-600 mt-2 font-mono px-1 opacity-0 group-hover:opacity-100 transition-opacity uppercase tracking-widest">
                  {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            </div>
          ))}

          {isLoading && (
            <div className="flex gap-4 animate-in fade-in pl-1">
              <div className="w-8 h-8 rounded-full bg-indigo-950/20 border border-indigo-500/20 shrink-0 flex items-center justify-center text-indigo-400">
                <Bot className="w-4 h-4 animate-pulse" />
              </div>
              <div className="bg-zinc-900 border border-zinc-800 rounded-3xl rounded-tl-sm px-5 py-4 flex items-center gap-2">
                <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-bounce"></div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} className="h-24" />
        </div>
      </div>

      {/* Input Area - Floating Capsule */}
      <div className="absolute bottom-6 left-0 right-0 px-4 flex justify-center z-20">
        <div className="max-w-3xl w-full bg-black/80 backdrop-blur-xl border border-zinc-800 rounded-[2rem] shadow-2xl shadow-black/80 p-2 flex items-end gap-2 transition-all hover:border-zinc-700 focus-within:border-indigo-500/50 focus-within:ring-4 focus-within:ring-indigo-500/10">

          <button
            onClick={() => document.getElementById('chat-upload')?.click()}
            className="w-10 h-10 rounded-full flex items-center justify-center text-zinc-500 hover:bg-zinc-800 hover:text-white transition-colors flex-shrink-0"
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
            className="flex-1 bg-transparent border-none focus:ring-0 text-zinc-200 placeholder:text-zinc-600 resize-none outline-none font-medium text-sm leading-relaxed py-3 max-h-32 min-h-[44px]"
            rows={1}
          />

          <button
            onClick={() => handleSendMessage()}
            disabled={!inputValue.trim() || isLoading}
            className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${inputValue.trim() && !isLoading
              ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/30 hover:bg-indigo-500 hover:scale-110'
              : 'bg-zinc-800/50 text-zinc-600 cursor-not-allowed'
              }`}
          >
            <ArrowUp className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
