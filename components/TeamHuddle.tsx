'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Users } from 'lucide-react';

const huddleMessages = [
    "Accountant is reviewing the CEO's new pivot...",
    "Product Manager is drafting user stories...",
    "The Scout found a new gap in the market.",
    "CEO is refining the 3-month vision.",
    'DEEPCHOX is syncing AI teammates…',
    "Legal is checking compliance on the new feature..."
];

export const TeamHuddle = () => {
    const [index, setIndex] = useState(0);

    useEffect(() => {
        const timer = setInterval(() => {
            setIndex((i) => (i + 1) % huddleMessages.length);
        }, 8000);
        return () => clearInterval(timer);
    }, []);

    return (
        <div className="group relative mb-4 overflow-hidden rounded-md border border-brand-border bg-brand-card p-3">
            <div className="relative mb-2 flex items-center gap-2">
                <Users className="h-3.5 w-3.5 shrink-0 text-brand-muted" strokeWidth={2} aria-hidden />
                <p className="text-[11px] font-medium text-brand-muted">Activity</p>
            </div>

            <div className="relative flex h-12 items-center">
                <AnimatePresence mode="wait">
                    <motion.p
                        key={index}
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -6 }}
                        transition={{ duration: 0.5, ease: "easeInOut" }}
                        className="absolute w-full text-[13px] font-normal leading-relaxed text-brand-text/90"
                    >
                        {huddleMessages[index]}
                    </motion.p>
                </AnimatePresence>
            </div>

            {/* Subtle progress bar */}
            <motion.div
                key={index}
                initial={{ width: "0%" }}
                animate={{ width: "100%" }}
                transition={{ duration: 8, ease: "linear" }}
                className="absolute bottom-0 left-0 h-0.5 bg-zinc-500/20"
            />
        </div>
    );
};
