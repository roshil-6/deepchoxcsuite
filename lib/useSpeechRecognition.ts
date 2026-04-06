'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

type RecognitionInstance = {
    lang: string;
    interimResults: boolean;
    continuous: boolean;
    onresult: ((e: SpeechRecognitionResultEvent) => void) | null;
    onerror: (() => void) | null;
    onend: (() => void) | null;
    start: () => void;
    stop: () => void;
};

type SpeechRecognitionResultEvent = {
    resultIndex: number;
    results: {
        length: number;
        [i: number]: { isFinal: boolean; 0: { transcript: string } };
    };
};

function getSpeechRecognitionCtor(): (new () => RecognitionInstance) | null {
    if (typeof window === 'undefined') return null;
    const w = window as unknown as {
        SpeechRecognition?: new () => RecognitionInstance;
        webkitSpeechRecognition?: new () => RecognitionInstance;
    };
    return w.SpeechRecognition || w.webkitSpeechRecognition || null;
}

export function useSpeechRecognition(appendTranscript: (text: string) => void) {
    const recognitionRef = useRef<RecognitionInstance | null>(null);
    const [listening, setListening] = useState(false);
    const [voiceSupported, setVoiceSupported] = useState(false);

    useEffect(() => {
        setVoiceSupported(Boolean(getSpeechRecognitionCtor()));
    }, []);

    useEffect(() => {
        return () => {
            try {
                recognitionRef.current?.stop();
            } catch {
                /* noop */
            }
        };
    }, []);

    const stopListening = useCallback(() => {
        try {
            recognitionRef.current?.stop();
        } catch {
            /* noop */
        }
        recognitionRef.current = null;
        setListening(false);
    }, []);

    const startListening = useCallback(() => {
        const SR = getSpeechRecognitionCtor();
        if (!SR) return;
        stopListening();
        const rec = new SR();
        rec.lang = typeof navigator !== 'undefined' && navigator.language ? navigator.language : 'en-US';
        rec.interimResults = true;
        rec.continuous = true;
        rec.onresult = (event) => {
            let chunk = '';
            for (let i = event.resultIndex; i < event.results.length; i++) {
                const r = event.results[i];
                if (r.isFinal) chunk += r[0].transcript;
            }
            const t = chunk.trim();
            if (t) appendTranscript(t);
        };
        const release = () => {
            recognitionRef.current = null;
            setListening(false);
        };
        rec.onerror = release;
        rec.onend = release;
        recognitionRef.current = rec;
        try {
            rec.start();
            setListening(true);
        } catch {
            setListening(false);
        }
    }, [appendTranscript, stopListening]);

    const toggleListening = useCallback(() => {
        if (listening) stopListening();
        else startListening();
    }, [listening, startListening, stopListening]);

    return { voiceSupported, listening, startListening, stopListening, toggleListening };
}
