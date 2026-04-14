'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Settings, Volume2, Gauge, Mic, Play, Square } from 'lucide-react';
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
            <div className="w-full max-w-md space-y-4 rounded-2xl border border-slate-700/50 bg-slate-900/95 p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Settings className="h-4 w-4 text-sky-400" />
                        <h3 className="text-sm font-semibold text-slate-200">Voice Settings</h3>
                    </div>
                    <button 
                        onClick={onClose}
                        className="text-[11px] text-slate-500 hover:text-slate-300"
                    >
                        Close
                    </button>
                </div>
                
                {/* Preset Selection */}
                <div className="space-y-2">
                    <p className="text-[10px] uppercase tracking-wider text-slate-500">Voice Preset</p>
                    <div className="grid grid-cols-2 gap-2">
                        {(Object.keys(PRESETS) as VoicePreset[]).map((preset) => (
                            <button
                                key={preset}
                                onClick={() => handlePresetChange(preset)}
                                className={`rounded-lg border px-3 py-2 text-left transition-all ${
                                    !useCustom && selectedPreset === preset
                                        ? 'border-sky-500/50 bg-sky-950/30'
                                        : 'border-slate-700/50 bg-slate-800/30 hover:border-slate-600'
                                }`}
                            >
                                <p className={`text-[11px] font-medium ${
                                    !useCustom && selectedPreset === preset ? 'text-sky-300' : 'text-slate-300'
                                }`}>
                                    {presetDescriptions[preset].label}
                                </p>
                                <p className="text-[9px] text-slate-500 leading-tight mt-0.5">
                                    {presetDescriptions[preset].desc}
                                </p>
                            </button>
                        ))}
                    </div>
                </div>
                
                {/* Custom Controls Toggle */}
                <div className="flex items-center gap-2 py-2 border-t border-slate-800">
                    <button
                        onClick={() => setUseCustom(!useCustom)}
                        className={`text-[11px] ${useCustom ? 'text-sky-400' : 'text-slate-500'}`}
                    >
                        {useCustom ? '✓ Using custom settings' : 'Use custom settings'}
                    </button>
                </div>
                
                {/* Custom Sliders */}
                {useCustom && (
                    <div className="space-y-3 rounded-lg bg-slate-800/30 p-3">
                        <div className="space-y-1">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-1.5 text-[10px] text-slate-400">
                                    <Gauge className="h-3 w-3" />
                                    Speed
                                </div>
                                <span className="text-[10px] text-slate-500">{customRate.toFixed(2)}x</span>
                            </div>
                            <input
                                type="range"
                                min="0.5"
                                max="1.5"
                                step="0.05"
                                value={customRate}
                                onChange={(e) => setCustomRate(parseFloat(e.target.value))}
                                className="w-full h-1 bg-slate-700 rounded-full appearance-none cursor-pointer accent-sky-500"
                            />
                        </div>
                        
                        <div className="space-y-1">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-1.5 text-[10px] text-slate-400">
                                    <Mic className="h-3 w-3" />
                                    Pitch
                                </div>
                                <span className="text-[10px] text-slate-500">{customPitch.toFixed(2)}</span>
                            </div>
                            <input
                                type="range"
                                min="0.5"
                                max="1.5"
                                step="0.05"
                                value={customPitch}
                                onChange={(e) => setCustomPitch(parseFloat(e.target.value))}
                                className="w-full h-1 bg-slate-700 rounded-full appearance-none cursor-pointer accent-sky-500"
                            />
                        </div>
                    </div>
                )}
                
                {/* Available Voices Info */}
                <div className="rounded-lg border border-slate-800 bg-slate-950/50 p-2">
                    <p className="text-[9px] text-slate-600 mb-1">
                        {availableVoices.length} voices available
                    </p>
                    <div className="flex flex-wrap gap-1">
                        {availableVoices.slice(0, 8).map((voice) => (
                            <span 
                                key={voice.name}
                                className="text-[8px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-500"
                            >
                                {voice.name.split(' ')[0]}
                            </span>
                        ))}
                        {availableVoices.length > 8 && (
                            <span className="text-[8px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-500">
                                +{availableVoices.length - 8} more
                            </span>
                        )}
                    </div>
                </div>
                
                {/* Test Button */}
                <button
                    onClick={testVoice}
                    className={`w-full flex items-center justify-center gap-2 rounded-lg py-2.5 text-[12px] font-medium transition-all ${
                        isTesting
                            ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                            : 'bg-sky-500/20 text-sky-300 border border-sky-500/30 hover:bg-sky-500/30'
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
