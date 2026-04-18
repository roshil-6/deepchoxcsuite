'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';

interface InteractiveCardProps {
    children: React.ReactNode;
    className?: string;
    onClick?: () => void;
    interactive?: boolean;
    glowColor?: string;
}

export function InteractiveCard({
    children,
    className = '',
    onClick,
    interactive = true,
    glowColor = 'rgba(116, 86, 255, 0.22)',
}: InteractiveCardProps) {
    const [isHovered, setIsHovered] = useState(false);

    return (
        <motion.div
            className={`relative overflow-hidden rounded-[1.15rem] border border-[var(--border)] ${
                interactive ? 'cursor-pointer' : ''
            } ${className}`}
            style={{
                background: 'var(--bg-card)',
            }}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            onClick={onClick}
            animate={{
                y: isHovered && interactive ? -2 : 0,
                boxShadow: isHovered && interactive
                    ? `0 16px 36px -18px ${glowColor}, 0 2px 6px rgba(0,0,0,0.35)`
                    : '0 1px 2px rgba(0,0,0,0.28)',
            }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
        >
            {/* Hover gradient overlay */}
            <motion.div
                className="absolute inset-0 pointer-events-none"
                style={{
                    background: `linear-gradient(180deg, ${glowColor.replace('0.22', '0.06')}, transparent)`,
                }}
                animate={{ opacity: isHovered ? 1 : 0 }}
                transition={{ duration: 0.2 }}
            />

            {/* Corner accent on hover */}
            <motion.div
                className="absolute top-0 right-0 w-16 h-16 pointer-events-none"
                style={{
                    background: `radial-gradient(circle at top right, ${glowColor.replace('0.22', '0.12')}, transparent 70%)`,
                }}
                animate={{ opacity: isHovered ? 1 : 0 }}
                transition={{ duration: 0.2 }}
            />

            {/* Content */}
            <div className="relative z-10">{children}</div>
        </motion.div>
    );
}

interface ExpandableCardProps {
    children: React.ReactNode;
    expandedContent: React.ReactNode;
    className?: string;
    title: string;
    subtitle?: string;
}

export function ExpandableCard({
    children,
    expandedContent,
    className = '',
    title,
    subtitle,
}: ExpandableCardProps) {
    const [isExpanded, setIsExpanded] = useState(false);
    const [isHovered, setIsHovered] = useState(false);

    return (
        <motion.div
            className={`relative overflow-hidden rounded-[1.15rem] border border-[var(--border)] ${className}`}
            style={{
                background: 'var(--bg-card)',
            }}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            animate={{
                y: isHovered && !isExpanded ? -2 : 0,
                boxShadow: isHovered
                    ? '0 16px 36px -18px rgba(116,86,255,0.18), 0 2px 6px rgba(0,0,0,0.35)'
                    : '0 1px 2px rgba(0,0,0,0.28)',
            }}
            transition={{ duration: 0.25 }}
        >
            {/* Header */}
            <div
                className="flex items-center justify-between p-4 cursor-pointer"
                onClick={() => setIsExpanded(!isExpanded)}
            >
                <div>
                    <h3 className="text-sm font-semibold text-[var(--text-primary)]">{title}</h3>
                    {subtitle && <p className="mt-0.5 text-xs text-[var(--text-muted)]">{subtitle}</p>}
                </div>
                <motion.div
                    animate={{ rotate: isExpanded ? 180 : 0 }}
                    transition={{ duration: 0.2 }}
                    className="text-[var(--text-muted)]"
                >
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                        <path
                            d="M4 6L8 10L12 6"
                            stroke="currentColor"
                            strokeWidth="1.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                        />
                    </svg>
                </motion.div>
            </div>

            {/* Collapsed content */}
            {!isExpanded && <div className="px-4 pb-4">{children}</div>}

            {/* Expanded content */}
            <motion.div
                initial={false}
                animate={{
                    height: isExpanded ? 'auto' : 0,
                    opacity: isExpanded ? 1 : 0,
                }}
                transition={{ duration: 0.3, ease: 'easeInOut' }}
                className="overflow-hidden"
            >
                <div className="border-t border-[var(--border)] px-4 pb-4 pt-4">
                    {expandedContent}
                </div>
            </motion.div>
        </motion.div>
    );
}

interface HoverRevealCardProps {
    children: React.ReactNode;
    revealContent: React.ReactNode;
    className?: string;
}

export function HoverRevealCard({
    children,
    revealContent,
    className = '',
}: HoverRevealCardProps) {
    const [isHovered, setIsHovered] = useState(false);

    return (
        <div
            className={`relative overflow-hidden rounded-[1.15rem] border border-[var(--border)] ${className}`}
            style={{
                background: 'var(--bg-card)',
            }}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
        >
            {/* Main content */}
            <div className="p-4">{children}</div>

            {/* Reveal content on hover */}
            <motion.div
                initial={false}
                animate={{
                    y: isHovered ? 0 : '100%',
                    opacity: isHovered ? 1 : 0,
                }}
                transition={{ duration: 0.25, ease: 'easeOut' }}
                className="absolute inset-x-0 bottom-0 border-t border-[var(--border)] p-4"
                style={{
                    background: 'linear-gradient(180deg, rgba(42,42,42,0.98), rgba(30,30,30,0.98))',
                    backdropFilter: 'blur(8px)',
                }}
            >
                {revealContent}
            </motion.div>
        </div>
    );
}
