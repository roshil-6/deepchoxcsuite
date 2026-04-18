'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface TooltipProps {
    children: React.ReactNode;
    content: React.ReactNode;
    position?: 'top' | 'bottom' | 'left' | 'right';
    delay?: number;
}

export function Tooltip({
    children,
    content,
    position = 'top',
    delay = 0.3,
}: TooltipProps) {
    const [isVisible, setIsVisible] = useState(false);
    const [timeoutId, setTimeoutId] = useState<NodeJS.Timeout | null>(null);

    const showTooltip = () => {
        const id = setTimeout(() => setIsVisible(true), delay * 1000);
        setTimeoutId(id);
    };

    const hideTooltip = () => {
        if (timeoutId) clearTimeout(timeoutId);
        setIsVisible(false);
    };

    const positionStyles = {
        top: { bottom: '100%', left: '50%', transform: 'translateX(-50%) translateY(-8px)' },
        bottom: { top: '100%', left: '50%', transform: 'translateX(-50%) translateY(8px)' },
        left: { right: '100%', top: '50%', transform: 'translateY(-50%) translateX(-8px)' },
        right: { left: '100%', top: '50%', transform: 'translateY(-50%) translateX(8px)' },
    };

    return (
        <div
            className="relative inline-block"
            onMouseEnter={showTooltip}
            onMouseLeave={hideTooltip}
            onFocus={showTooltip}
            onBlur={hideTooltip}
        >
            {children}

            <AnimatePresence>
                {isVisible && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        transition={{ duration: 0.15, ease: 'easeOut' }}
                        className="pointer-events-none absolute z-50 whitespace-nowrap rounded-lg border border-white/[0.06] px-3 py-1.5 text-xs font-medium text-[#FAFAFA] shadow-lg"
                        style={{
                            ...positionStyles[position],
                            background: 'linear-gradient(180deg, rgba(28,28,31,0.98), rgba(24,24,27,0.98))',
                            backdropFilter: 'blur(8px)',
                        }}
                    >
                        {content}

                        {/* Arrow */}
                        <div
                            className="absolute h-2 w-2 rotate-45 border border-white/[0.06]"
                            style={{
                                background: 'linear-gradient(180deg, rgba(28,28,31,0.98), rgba(24,24,27,0.98))',
                                ...(position === 'top' && { bottom: '-4px', left: '50%', marginLeft: '-4px', borderTop: 'none', borderLeft: 'none' }),
                                ...(position === 'bottom' && { top: '-4px', left: '50%', marginLeft: '-4px', borderBottom: 'none', borderRight: 'none' }),
                                ...(position === 'left' && { right: '-4px', top: '50%', marginTop: '-4px', borderLeft: 'none', borderBottom: 'none' }),
                                ...(position === 'right' && { left: '-4px', top: '50%', marginTop: '-4px', borderRight: 'none', borderTop: 'none' }),
                            }}
                        />
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

// Simpler version for icon buttons
export function IconTooltip({
    icon: Icon,
    label,
    onClick,
    className = '',
}: {
    icon: React.ElementType;
    label: string;
    onClick?: () => void;
    className?: string;
}) {
    const [isHovered, setIsHovered] = useState(false);

    return (
        <Tooltip content={label} position="bottom" delay={0.2}>
            <button
                type="button"
                onClick={onClick}
                onMouseEnter={() => setIsHovered(true)}
                onMouseLeave={() => setIsHovered(false)}
                className={`relative rounded-lg p-2 text-[#A1A1AA] transition-colors hover:bg-white/[0.06] hover:text-[#FAFAFA] ${className}`}
            >
                <motion.div
                    animate={{ scale: isHovered ? 1.1 : 1 }}
                    transition={{ duration: 0.2 }}
                >
                    <Icon className="h-4 w-4" />
                </motion.div>
            </button>
        </Tooltip>
    );
}
