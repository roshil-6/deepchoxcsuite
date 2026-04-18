'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowUpRight, Sparkles } from 'lucide-react';

interface QuickAction {
    id: string;
    label: string;
    description?: string;
    icon: React.ReactNode;
    color: string;
    onClick: () => void;
    badge?: number;
    shortcut?: string;
}

interface QuickActionGridProps {
    actions: QuickAction[];
    columns?: 2 | 3 | 4;
}

export function QuickActionGrid({ actions, columns = 2 }: QuickActionGridProps) {
    const [hoveredId, setHoveredId] = useState<string | null>(null);

    const gridCols = {
        2: 'grid-cols-2',
        3: 'grid-cols-3',
        4: 'grid-cols-4',
    };

    return (
        <div className={`grid ${gridCols[columns]} gap-3`}>
            {actions.map((action, index) => {
                const isHovered = hoveredId === action.id;

                return (
                    <motion.button
                        key={action.id}
                        type="button"
                        onClick={action.onClick}
                        onMouseEnter={() => setHoveredId(action.id)}
                        onMouseLeave={() => setHoveredId(null)}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{
                            opacity: 1,
                            y: 0,
                            scale: isHovered ? 1.02 : 1,
                        }}
                        transition={{
                            opacity: { duration: 0.2, delay: index * 0.05 },
                            y: { duration: 0.2, delay: index * 0.05 },
                            scale: { duration: 0.15 },
                        }}
                        className="group relative overflow-hidden rounded-xl border border-white/[0.06] p-3 text-left transition-colors"
                        style={{
                            background: isHovered
                                ? `linear-gradient(180deg, ${action.color}10, ${action.color}05)`
                                : 'linear-gradient(180deg, rgba(255,255,255,0.03), rgba(255,255,255,0.01))',
                        }}
                    >
                        {/* Glow effect on hover */}
                        <motion.div
                            className="absolute -right-8 -top-8 h-24 w-24 rounded-full opacity-0 blur-2xl transition-opacity"
                            style={{ background: action.color }}
                            animate={{ opacity: isHovered ? 0.3 : 0 }}
                            transition={{ duration: 0.3 }}
                        />

                        {/* Content */}
                        <div className="relative z-10">
                            {/* Icon and badge row */}
                            <div className="flex items-center justify-between">
                                <motion.div
                                    className="flex h-8 w-8 items-center justify-center rounded-lg transition-colors"
                                    style={{
                                        background: isHovered ? `${action.color}20` : 'rgba(255,255,255,0.04)',
                                        color: isHovered ? action.color : '#A1A1AA',
                                    }}
                                    animate={{
                                        scale: isHovered ? 1.1 : 1,
                                        rotate: isHovered ? 5 : 0,
                                    }}
                                    transition={{ duration: 0.2 }}
                                >
                                    {action.icon}
                                </motion.div>

                                {/* Badge */}
                                {action.badge !== undefined && action.badge > 0 && (
                                    <motion.span
                                        initial={{ scale: 0 }}
                                        animate={{ scale: 1 }}
                                        className="flex h-5 min-w-[1.25rem] items-center justify-center rounded-full px-1.5 text-[10px] font-medium"
                                        style={{
                                            background: action.color,
                                            color: '#000',
                                        }}
                                    >
                                        {action.badge > 99 ? '99+' : action.badge}
                                    </motion.span>
                                )}

                                {/* Arrow on hover */}
                                <motion.div
                                    initial={{ opacity: 0, x: -5 }}
                                    animate={{
                                        opacity: isHovered ? 1 : 0,
                                        x: isHovered ? 0 : -5,
                                    }}
                                    transition={{ duration: 0.2 }}
                                    style={{ color: action.color }}
                                >
                                    <ArrowUpRight className="h-4 w-4" />
                                </motion.div>
                            </div>

                            {/* Label */}
                            <p className="mt-2 text-xs font-medium text-[#FAFAFA]">{action.label}</p>

                            {/* Description on hover */}
                            <motion.p
                                initial={{ opacity: 0, height: 0 }}
                                animate={{
                                    opacity: isHovered ? 1 : 0,
                                    height: isHovered ? 'auto' : 0,
                                }}
                                transition={{ duration: 0.2 }}
                                className="mt-1 overflow-hidden text-[10px] leading-tight text-[#71717A]"
                            >
                                {action.description}
                            </motion.p>

                            {/* Shortcut hint */}
                            {action.shortcut && (
                                <motion.span
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: isHovered ? 0.6 : 0 }}
                                    className="absolute bottom-2 right-2 text-[9px] text-[#52525B]"
                                >
                                    {action.shortcut}
                                </motion.span>
                            )}
                        </div>

                        {/* Bottom accent line */}
                        <motion.div
                            className="absolute bottom-0 left-0 right-0 h-0.5"
                            style={{ background: action.color }}
                            initial={{ scaleX: 0 }}
                            animate={{ scaleX: isHovered ? 1 : 0 }}
                            transition={{ duration: 0.25 }}
                        />
                    </motion.button>
                );
            })}
        </div>
    );
}

interface ActionButtonProps {
    children: React.ReactNode;
    onClick?: () => void;
    variant?: 'primary' | 'secondary' | 'ghost';
    color?: string;
    icon?: React.ReactNode;
    loading?: boolean;
}

export function ActionButton({
    children,
    onClick,
    variant = 'secondary',
    color = '#10B981',
    icon,
    loading = false,
}: ActionButtonProps) {
    const [isHovered, setIsHovered] = useState(false);
    const [isPressed, setIsPressed] = useState(false);

    const variants = {
        primary: {
            background: `linear-gradient(180deg, ${color}, ${color}dd)`,
            color: '#000',
        },
        secondary: {
            background: isHovered
                ? `linear-gradient(180deg, ${color}15, ${color}08)`
                : 'linear-gradient(180deg, rgba(255,255,255,0.06), rgba(255,255,255,0.02))',
            color: isHovered ? color : '#FAFAFA',
        },
        ghost: {
            background: 'transparent',
            color: isHovered ? color : '#A1A1AA',
        },
    };

    return (
        <motion.button
            type="button"
            onClick={onClick}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            onMouseDown={() => setIsPressed(true)}
            onMouseUp={() => setIsPressed(false)}
            animate={{
                scale: isPressed ? 0.98 : isHovered ? 1.02 : 1,
                boxShadow: isHovered
                    ? `0 4px 20px -8px ${color}40`
                    : '0 2px 8px -4px rgba(0,0,0,0.2)',
            }}
            transition={{ duration: 0.15 }}
            className="relative flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium transition-colors"
            style={{
                ...variants[variant],
                border: variant === 'secondary' ? '1px solid rgba(255,255,255,0.06)' : 'none',
            }}
        >
            {loading ? (
                <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                >
                    <Sparkles className="h-4 w-4" />
                </motion.div>
            ) : (
                icon
            )}
            {children}
        </motion.button>
    );
}
