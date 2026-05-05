'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageCircle, X, Sparkles, Mic, ChevronRight } from 'lucide-react';

interface AICompanionProps {
    onVoiceInput?: (text: string) => void;
    onChatOpen?: () => void;
    position?: 'bottom-right' | 'bottom-left' | 'floating';
}

type CompanionState = 'idle' | 'listening' | 'speaking' | 'thinking';

export function AICompanion({
    onVoiceInput,
    onChatOpen,
    position = 'bottom-right',
}: AICompanionProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [state, setState] = useState<CompanionState>('idle');
    const [transcript, setTranscript] = useState('');
    const [speechSupported, setSpeechSupported] = useState(true);
    const recognitionRef = useRef<SpeechRecognition | null>(null);

    useEffect(() => {
        if (typeof window === 'undefined') return;
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRecognition) {
            setSpeechSupported(false);
        }
    }, []);

    const startListening = useCallback(() => {
        if (!speechSupported) return;
        
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRecognition) return;

        setState('listening');
        setTranscript('');
        setIsOpen(true);

        const recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = 'en-US';

        recognition.onresult = (event) => {
            let final = '';
            let interim = '';

            for (let i = event.resultIndex; i < event.results.length; i++) {
                const transcript = event.results[i][0].transcript;
                if (event.results[i].isFinal) {
                    final += transcript;
                } else {
                    interim += transcript;
                }
            }

            if (interim) setTranscript(interim);
            if (final) {
                setState('thinking');
                setTimeout(() => {
                    onVoiceInput?.(final);
                    setState('idle');
                    setTranscript('');
                    setIsOpen(false);
                }, 800);
            }
        };

        recognition.onerror = () => {
            setState('idle');
        };

        recognition.onend = () => {
            if (state === 'listening') {
                setState('idle');
            }
        };

        recognitionRef.current = recognition;
        recognition.start();

        // Auto stop after 10 seconds of silence
        setTimeout(() => {
            recognition.stop();
        }, 10000);
    }, [speechSupported, state, onVoiceInput]);

    const handleClick = () => {
        if (state === 'idle') {
            startListening();
        } else {
            setState('idle');
            setTranscript('');
            setIsOpen(false);
            recognitionRef.current?.stop();
        }
    };

    const positionStyles = {
        'bottom-right': 'fixed bottom-6 right-6',
        'bottom-left': 'fixed bottom-6 left-6',
        'floating': 'fixed bottom-1/2 right-6 translate-y-1/2',
    };

    return (
        <div className={`${positionStyles[position]} z-50 flex flex-col items-end gap-4`}>
            {/* Speech Bubble */}
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: 20, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 20, scale: 0.95 }}
                        transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                        className="mb-2 w-[300px] rounded-2xl rounded-br-sm border border-white/[0.06] p-4 shadow-2xl backdrop-blur-xl"
                        style={{
                            background: 'linear-gradient(145deg, rgba(28,28,31,0.98), rgba(18,18,21,0.98))',
                        }}
                    >
                        {/* Header */}
                        <div className="mb-3 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-gradient-to-br from-[#A855F7] to-[#6366F1]">
                                    <Sparkles className="h-3 w-3 text-white" />
                                </div>
                                <span className="text-xs font-medium text-[#A1A1AA]">
                                    {state === 'listening' ? 'Listening...' : 
                                     state === 'thinking' ? 'Processing...' : 'AI Assistant'}
                                </span>
                            </div>
                            <button
                                onClick={() => {
                                    setIsOpen(false);
                                    setState('idle');
                                    recognitionRef.current?.stop();
                                }}
                                className="rounded p-1 text-[#52525B] transition-colors hover:bg-white/[0.06] hover:text-[#A1A1AA]"
                            >
                                <X className="h-3.5 w-3.5" />
                            </button>
                        </div>

                        {/* Transcript */}
                        <div className="min-h-[40px] rounded-xl bg-white/[0.03] px-3 py-2.5">
                            {transcript ? (
                                <p className="text-sm leading-relaxed text-[#FAFAFA]">
                                    {transcript}
                                </p>
                            ) : (
                                <p className="text-sm text-[#52525B]">
                                    {state === 'listening' ? 'Speak now...' : 'Say something...'}
                                </p>
                            )}
                        </div>

                        {/* Quick actions */}
                        <div className="mt-3 flex gap-2">
                            <button
                                onClick={() => onChatOpen?.()}
                                className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-white/[0.06] py-2 text-[11px] font-medium text-[#A1A1AA] transition-colors hover:bg-white/[0.1] hover:text-[#FAFAFA]"
                            >
                                <MessageCircle className="h-3 w-3" />
                                Open Chat
                            </button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Main Avatar Button */}
            <motion.button
                onClick={handleClick}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="group relative"
            >
                {/* Outer glow rings when listening */}
                {state === 'listening' && (
                    <>
                        {[...Array(3)].map((_, i) => (
                            <motion.span
                                key={i}
                                className="absolute inset-0 rounded-full"
                                style={{
                                    background: `linear-gradient(135deg, rgba(168,85,247,${0.3 - i * 0.1}), rgba(99,102,241,${0.3 - i * 0.1}))`,
                                }}
                                animate={{
                                    scale: [1, 1.4 + i * 0.2, 1],
                                    opacity: [0.6, 0, 0.6],
                                }}
                                transition={{
                                    duration: 2,
                                    repeat: Infinity,
                                    delay: i * 0.3,
                                    ease: 'easeInOut',
                                }}
                            />
                        ))}
                    </>
                )}

                {/* Main avatar container */}
                <motion.div
                    className="relative h-14 w-14 overflow-hidden rounded-full shadow-2xl"
                    style={{
                        background: state === 'listening'
                            ? 'linear-gradient(135deg, #A855F7 0%, #6366F1 50%, #EC4899 100%)'
                            : 'linear-gradient(135deg, #1C1C1F 0%, #27272A 50%, #1C1C1F 100%)',
                    }}
                    animate={{
                        boxShadow: state === 'listening'
                            ? '0 0 50px rgba(168,85,247,0.5), 0 0 100px rgba(99,102,241,0.3)'
                            : '0 4px 20px rgba(0,0,0,0.4), 0 0 0 1px rgba(255,255,255,0.05)',
                    }}
                    transition={{ duration: 0.4 }}
                >
                    {/* Inner gradient orb */}
                    <div className="absolute inset-1 rounded-full bg-gradient-to-br from-white/10 to-transparent" />
                    
                    {/* Core animation */}
                    <div className="absolute inset-0 flex items-center justify-center">
                        {state === 'listening' ? (
                            <ListeningWaveform />
                        ) : state === 'thinking' ? (
                            <ThinkingSpinner />
                        ) : (
                            <IdleAvatar />
                        )}
                    </div>

                    {/* Shine effect */}
                    <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-transparent via-white/5 to-transparent" />
                </motion.div>

                {/* Status indicator dot */}
                <motion.div
                    className="absolute -bottom-0.5 -right-0.5 h-4 w-4 rounded-full border-2 border-[#0A0A0B]"
                    style={{
                        background: state === 'listening' 
                            ? 'linear-gradient(135deg, #EC4899, #F43F5E)' 
                            : 'linear-gradient(135deg, #10B981, #059669)',
                    }}
                    animate={{
                        scale: state === 'listening' ? [1, 1.2, 1] : 1,
                    }}
                    transition={{ duration: 1, repeat: state === 'listening' ? Infinity : 0 }}
                />

                {/* Tooltip */}
                <motion.span
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="absolute -bottom-7 left-1/2 -translate-x-1/2 whitespace-nowrap text-[10px] font-medium text-[#71717A] opacity-0 transition-opacity group-hover:opacity-100"
                >
                    {state === 'listening' ? 'Tap to stop' : state === 'thinking' ? 'Thinking...' : 'Ask AI'}
                </motion.span>
            </motion.button>
        </div>
    );
}

// Sleek idle state - minimalist AI orb
function IdleAvatar() {
    return (
        <div className="relative flex items-center justify-center">
            {/* Inner core */}
            <motion.div
                className="h-3 w-3 rounded-full bg-white"
                animate={{
                    scale: [1, 1.1, 1],
                    opacity: [0.9, 1, 0.9],
                }}
                transition={{
                    duration: 3,
                    repeat: Infinity,
                    ease: 'easeInOut',
                }}
            />
            
            {/* Subtle ring */}
            <motion.div
                className="absolute h-6 w-6 rounded-full border border-white/20"
                animate={{
                    scale: [1, 1.1, 1],
                    opacity: [0.3, 0.5, 0.3],
                }}
                transition={{
                    duration: 3,
                    repeat: Infinity,
                    ease: 'easeInOut',
                    delay: 0.5,
                }}
            />
        </div>
    );
}

// Listening waveform visualization
function ListeningWaveform() {
    return (
        <div className="flex items-center justify-center gap-[3px]">
            {[...Array(5)].map((_, i) => (
                <motion.div
                    key={i}
                    className="w-[3px] rounded-full bg-white"
                    animate={{
                        height: [8, 24, 8],
                        opacity: [0.7, 1, 0.7],
                    }}
                    transition={{
                        duration: 0.5,
                        repeat: Infinity,
                        delay: i * 0.1,
                        ease: 'easeInOut',
                    }}
                />
            ))}
        </div>
    );
}

// Thinking state - rotating spinner
function ThinkingSpinner() {
    return (
        <motion.div
            className="h-5 w-5 rounded-full border-2 border-white/20 border-t-white"
            animate={{ rotate: 360 }}
            transition={{
                duration: 1,
                repeat: Infinity,
                ease: 'linear',
            }}
        />
    );
}

// Expanded chat interface
export function AICompanionExpanded({
    onClose,
    onVoiceInput,
}: {
    onClose: () => void;
    onVoiceInput?: (text: string) => void;
}) {
    const [messages, setMessages] = useState<Array<{ type: 'user' | 'ai'; text: string }>>([
        { type: 'ai', text: 'Hello! I\'m your AI assistant. How can I help you today?' },
    ]);
    const [inputText, setInputText] = useState('');

    const handleSend = () => {
        if (!inputText.trim()) return;
        setMessages((prev) => [...prev, { type: 'user', text: inputText }]);
        setInputText('');
        setTimeout(() => {
            setMessages((prev) => [
                ...prev,
                { type: 'ai', text: 'I\'ll help you with that. Let me connect you to the right desk...' },
            ]);
        }, 1000);
    };

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="fixed bottom-24 right-6 z-50 w-[360px] overflow-hidden rounded-2xl border border-white/[0.06] shadow-2xl"
            style={{
                background: 'linear-gradient(180deg, rgba(22,22,25,0.98), rgba(14,14,17,0.98))',
            }}
        >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-white/[0.06] px-4 py-3">
                <div className="flex items-center gap-3">
                    <div className="relative h-8 w-8 overflow-hidden rounded-full bg-gradient-to-br from-[#A855F7] to-[#6366F1]">
                        <div className="absolute inset-0 flex items-center justify-center">
                            <div className="h-2 w-2 rounded-full bg-white" />
                        </div>
                    </div>
                    <div>
                        <p className="text-sm font-medium text-[#FAFAFA]">AI Assistant</p>
                        <p className="text-[10px] text-[#71717A]">Always here to help</p>
                    </div>
                </div>
                <button
                    onClick={onClose}
                    className="rounded-lg p-1.5 text-[#71717A] transition-colors hover:bg-white/[0.06] hover:text-[#FAFAFA]"
                >
                    <X className="h-4 w-4" />
                </button>
            </div>

            {/* Messages */}
            <div className="h-72 overflow-y-auto p-4 space-y-3">
                {messages.map((msg, i) => (
                    <motion.div
                        key={i}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className={`flex ${msg.type === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                        <div
                            className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm ${
                                msg.type === 'user'
                                    ? 'rounded-br-md bg-gradient-to-r from-[#94a3b8] to-[#6366F1] text-white'
                                    : 'rounded-bl-md bg-white/[0.06] text-[#A1A1AA]'
                            }`}
                        >
                            {msg.text}
                        </div>
                    </motion.div>
                ))}
            </div>

            {/* Input */}
            <div className="border-t border-white/[0.06] p-3">
                <div className="flex items-center gap-2 rounded-xl border border-white/[0.06] bg-white/[0.03] px-3 py-2.5">
                    <input
                        type="text"
                        value={inputText}
                        onChange={(e) => setInputText(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                        placeholder="Type a message..."
                        className="flex-1 bg-transparent text-sm text-[#FAFAFA] placeholder:text-[#52525B] focus:outline-none"
                    />
                    <button
                        onClick={handleSend}
                        disabled={!inputText.trim()}
                        className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#94a3b8] text-white transition-opacity hover:opacity-90 disabled:opacity-40"
                    >
                        <ChevronRight className="h-4 w-4" />
                    </button>
                </div>
            </div>
        </motion.div>
    );
}

