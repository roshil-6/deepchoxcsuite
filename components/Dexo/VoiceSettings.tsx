'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Settings, Gauge, Mic, Play, Square } from 'lucide-react';
import { 
    type VoicePreset, 
    PRESETS, 
    selectBestVoice, 
    getVoices,
    speak,
    stopSpeaking 
} from '@/lib/voiceEngine';

const STORAGE_KEY = 'dexo-voice-preset';

interface VoiceSettingsPanelProps {
    isOpen: boolean;
    onClose: () => void;
}

export function VoiceSettingsPanel({ isOpen, onClose }: VoiceSettingsPanelProps) {
    const [selectedPreset, setSelectedPreset] = useState<VoicePreset>('jarvis');
    const [isTesting, setIsTesting] = useState(false);
    const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([]);
    const [customRate, setCustomRate] = useState(1);
    const [customPitch, setCustomPitch] = useState(1);
    const [useCustom, setUseCustom] = useState(false);
    
    useEffect(() => {
        const saved = localStorage.getItem(STORAGE_KEY) as VoicePreset | null;
        if (saved && PRESETS[saved]) {
            setSelectedPreset(saved);
        }
        setAvailableVoices(getVoices());
    }, []);
    
    const handlePresetChange = (preset: VoicePreset) => {
        setSelectedPreset(preset);
        setUseCustom(false);
        localStorage.setItem(STORAGE_KEY, preset);
    };
    
    const testVoice = useCallback(async () => {
        if (isTesting) {
            stopSpeaking();
            setIsTesting(false);
            return;
        }
        
        setIsTesting(true);
        const testText = "This is Dexo. I'm analyzing your venture and will provide strategic insights. Hold the mic to speak with me.";
        
        try {
            await speak(testText, {
                preset: useCustom ? undefined : selectedPreset,
                rate: useCustom ? customRate : undefined,
                pitch: useCustom ? customPitch : undefined,
                onEnd: () => setIsTesting(false),
                onError: () => setIsTesting(false),
            });
        } catch {
            setIsTesting(false);
        }
    }, [isTesting, selectedPreset, useCustom, customRate, customPitch]);
    
    const presetDescriptions: Record<VoicePreset, { label: string; desc: string }> = {
        jarvis: { 
            label: 'Jarvis', 
            desc: 'Crisp, authoritative AI assistant. Perfect for command center mode.' 
        },
        natural: { 
            label: 'Natural', 
            desc: 'Balanced conversational tone. Friendly and approachable.' 
        },
        fast: { 
            label: 'Fast', 
            desc: 'Quick delivery for power users who want rapid updates.' 
        },
        slow: { 
            label: 'Slow', 
            desc: 'Deliberate pace for complex explanations and deep analysis.' 
        },
        warm: { 
            label: 'Warm', 
            desc: 'Soft, reassuring tone. Great for feedback and encouragement.' 
        },
        dramatic: { 
            label: 'Dramatic', 
            desc: 'Deep, cinematic presence for important announcements.' 
        },
    };
    
    if (!isOpen || typeof window === 'undefined') return null;
    
    const modalContent = (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="max-h-[90vh] w-full max-w-md space-y-4 overflow-y-auto rounded-2xl border border-[var(--border)] bg-[var(--surface-strong)] p-6 shadow-[var(--shadow-panel)]">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Settings className="h-4 w-4 text-[var(--muted)]" strokeWidth={1.75} aria-hidden />
                        <h3 className="text-sm font-semibold text-[var(--text)]">Voice Settings</h3>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="text-[11px] text-[var(--muted)] transition hover:text-[var(--text)]"
                    >
                        Close
                    </button>
                </div>
                
                {/* Preset Selection */}
                <div className="space-y-2">
                    <p className="text-[10px] uppercase tracking-wider text-[var(--muted)]">Voice Preset</p>
                    <div className="grid grid-cols-2 gap-2">
                        {(Object.keys(PRESETS) as VoicePreset[]).map((preset) => (
                            <button
                                key={preset}
                                type="button"
                                onClick={() => handlePresetChange(preset)}
                                className={`rounded-lg border px-3 py-2 text-left transition-all ${
                                    !useCustom && selectedPreset === preset
                                        ? 'border-[var(--border-strong)] bg-white/[0.08]'
                                        : 'border-[var(--border)] bg-white/[0.03] hover:border-[var(--border-strong)] hover:bg-white/[0.05]'
                                }`}
                            >
                                <p
                                    className={`text-[11px] font-medium ${
                                        !useCustom && selectedPreset === preset ? 'text-[var(--text)]' : 'text-[var(--muted)]'
                                    }`}
                                >
                                    {presetDescriptions[preset].label}
                                </p>
                                <p className="mt-0.5 text-[9px] leading-tight text-[var(--muted)]">
                                    {presetDescriptions[preset].desc}
                                </p>
                            </button>
                        ))}
                    </div>
                </div>
                
                {/* Custom Controls Toggle */}
                <div className="flex items-center gap-2 border-t border-[var(--border)] py-2">
                    <button
                        type="button"
                        onClick={() => setUseCustom(!useCustom)}
                        className={`text-[11px] transition ${useCustom ? 'font-medium text-[var(--text)]' : 'text-[var(--muted)] hover:text-[var(--text)]'}`}
                    >
                        {useCustom ? '✓ Using custom settings' : 'Use custom settings'}
                    </button>
                </div>
                
                {/* Custom Sliders */}
                {useCustom && (
                    <div className="space-y-3 rounded-lg border border-[var(--border)] bg-white/[0.03] p-3">
                        <div className="space-y-1">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-1.5 text-[10px] text-[var(--muted)]">
                                    <Gauge className="h-3 w-3" aria-hidden />
                                    Speed
                                </div>
                                <span className="text-[10px] text-[var(--muted)]">{customRate.toFixed(2)}x</span>
                            </div>
                            <input
                                type="range"
                                min="0.5"
                                max="1.5"
                                step="0.05"
                                value={customRate}
                                onChange={(e) => setCustomRate(parseFloat(e.target.value))}
                                className="h-1 w-full cursor-pointer appearance-none rounded-full bg-white/[0.08] accent-[var(--accent)]"
                            />
                        </div>

                        <div className="space-y-1">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-1.5 text-[10px] text-[var(--muted)]">
                                    <Mic className="h-3 w-3" aria-hidden />
                                    Pitch
                                </div>
                                <span className="text-[10px] text-[var(--muted)]">{customPitch.toFixed(2)}</span>
                            </div>
                            <input
                                type="range"
                                min="0.5"
                                max="1.5"
                                step="0.05"
                                value={customPitch}
                                onChange={(e) => setCustomPitch(parseFloat(e.target.value))}
                                className="h-1 w-full cursor-pointer appearance-none rounded-full bg-white/[0.08] accent-[var(--accent)]"
                            />
                        </div>
                    </div>
                )}
                
                {/* Available Voices Info */}
                <div className="rounded-lg border border-[var(--border)] bg-white/[0.02] p-2">
                    <p className="mb-1 text-[9px] text-[var(--muted)]">{availableVoices.length} voices available</p>
                    <div className="flex flex-wrap gap-1">
                        {availableVoices.slice(0, 8).map((voice) => (
                            <span
                                key={voice.name}
                                className="rounded bg-white/[0.06] px-1.5 py-0.5 text-[8px] text-[var(--muted)]"
                            >
                                {voice.name.split(' ')[0]}
                            </span>
                        ))}
                        {availableVoices.length > 8 && (
                            <span className="rounded bg-white/[0.06] px-1.5 py-0.5 text-[8px] text-[var(--muted)]">
                                +{availableVoices.length - 8} more
                            </span>
                        )}
                    </div>
                </div>
                
                {/* Test Button */}
                <button
                    type="button"
                    onClick={testVoice}
                    className={`flex w-full items-center justify-center gap-2 rounded-lg border py-2.5 text-[12px] font-medium transition-all ${
                        isTesting
                            ? 'border-[var(--border-strong)] bg-white/[0.08] text-[var(--text)]'
                            : 'border-[var(--border)] bg-white/[0.06] text-[var(--text)] hover:bg-white/[0.1]'
                    }`}
                >
                    {isTesting ? (
                        <><Square className="h-3.5 w-3.5" /> Stop Test</>
                    ) : (
                        <><Play className="h-3.5 w-3.5" /> Test Voice</>
                    )}
                </button>
            </div>
        </div>
    );
    
    return createPortal(modalContent, document.body);
}

// Hook to get current preset
export function useVoicePreset(): VoicePreset {
    const [preset, setPreset] = useState<VoicePreset>('jarvis');
    
    useEffect(() => {
        const saved = localStorage.getItem(STORAGE_KEY) as VoicePreset | null;
        if (saved && PRESETS[saved]) {
            setPreset(saved);
        }
    }, []);
    
    return preset;
}

export { PRESETS, type VoicePreset };
