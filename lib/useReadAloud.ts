'use client';

import { useCallback, useEffect, useState } from 'react';

/** Strip common markdown / formatting noise for TTS. */
export function plainTextForSpeech(raw: string): string {
    return raw
        .replace(/\*\*([^*]+)\*\*/g, '$1')
        .replace(/\*([^*]+)\*/g, '$1')
        .replace(/^#{1,6}\s+/gm, '')
        .replace(/`{1,3}[^`]*`{1,3}/g, ' ')
        .replace(/\[[^\]]*\]\([^)]*\)/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, 12000);
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
            const utt = new SpeechSynthesisUtterance(text);
            utt.rate = 0.92;
            utt.pitch = 1;
            utt.volume = 1;

            const run = () => {
                const voices = window.speechSynthesis.getVoices();
                const voice =
                    voices.find((v) => /en-GB/i.test(v.lang) && !/female|zira|hazel/i.test(v.name)) ??
                    voices.find((v) => v.lang.startsWith('en')) ??
                    voices[0];
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
