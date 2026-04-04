'use client';

import React from 'react';
import { motion } from 'framer-motion';

export function WorkspacePanel({
    children,
    reserveBottom,
}: {
    children: React.ReactNode;
    /** Space for floating AI composer */
    reserveBottom?: boolean;
}) {
    return (
        <motion.div
            initial={{ opacity: 0.96 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.35 }}
            className="relative flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-[var(--bg)]"
        >
            <div
                className={`mx-auto flex h-full w-full max-w-[min(100%,72rem)] min-h-0 flex-1 flex-col px-4 sm:px-6 ${
                    reserveBottom
                        ? 'pb-[max(12rem,min(44vh,26rem))] sm:pb-[max(13rem,min(44vh,26rem))] lg:pb-[max(14rem,min(42vh,26rem))]'
                        : ''
                }`}
            >
                {children}
            </div>
        </motion.div>
    );
}
