'use client';

import { useCallback, useEffect, useState } from 'react';
import { speechFriendlyText } from './speechFriendly';
import { pickEnglishPlaybackVoice, resumeSpeechSynthIfNeeded } from './voiceEngine';

/** Markdown strip + spoken-language cleanup for TTS. */
export function plainTextForSpeech(raw: string): string {
    return speechFriendlyText(raw);
}

export function useReadAloud() {
    const [speakingKey, setSpeakingKey] = useState<string | null>(null);

    const stop = useCallback(() => {
        if (typeof window !== 'undefined') {
            window.speechSynthesis?.cancel();
        }
        setSpeakingKey(null);
    }, []);

    const speak = useCallback(
        (raw: string, key: string) => {
            if (typeof window === 'undefined' || !window.speechSynthesis) return;
            const text = plainTextForSpeech(raw);
            if (!text) return;

            window.speechSynthesis.cancel();
            resumeSpeechSynthIfNeeded();
            const utt = new SpeechSynthesisUtterance(text);
            utt.rate = 1;
            utt.pitch = 1;
            utt.volume = 1;

            const run = () => {
                const voice = pickEnglishPlaybackVoice();
                if (voice) utt.voice = voice;
                utt.onstart = () => setSpeakingKey(key);
                utt.onend = () => setSpeakingKey(null);
                utt.onerror = () => setSpeakingKey(null);
                window.speechSynthesis.speak(utt);
            };

            if (window.speechSynthesis.getVoices().length > 0) run();
            else window.speechSynthesis.addEventListener('voiceschanged', run, { once: true });
        },
        [],
    );

    useEffect(
        () => () => {
            if (typeof window !== 'undefined') window.speechSynthesis?.cancel();
        },
        [],
    );

    return { speak, stop, speakingKey, isSpeaking: (key: string) => speakingKey === key };
}
