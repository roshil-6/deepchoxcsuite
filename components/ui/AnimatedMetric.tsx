'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface AnimatedMetricProps {
    value: number;
    label: string;
    suffix?: string;
    prefix?: string;
    color?: string;
    trend?: 'up' | 'down' | 'neutral';
    trendValue?: string;
    onClick?: () => void;
}

export function AnimatedMetric({
    value,
    label,
    suffix = '',
    prefix = '',
    color = '#10B981',
    trend = 'neutral',
    trendValue,
    onClick,
}: AnimatedMetricProps) {
    const [displayValue, setDisplayValue] = useState(0);
    const [isHovered, setIsHovered] = useState(false);

    useEffect(() => {
        const duration = 1500;
        const steps = 60;
        const increment = value / steps;
        let current = 0;

        const timer = setInterval(() => {
            current += increment;
            if (current >= value) {
                setDisplayValue(value);
                clearInterval(timer);
            } else {
                setDisplayValue(Math.floor(current));
            }
        }, duration / steps);

        return () => clearInterval(timer);
    }, [value]);

    const trendColors = {
        up: '#10B981',
        down: '#F43F5E',
        neutral: '#71717A',
    };

    return (
        <motion.div
            className="relative overflow-hidden rounded-xl border border-white/[0.06] p-4 cursor-pointer"
            style={{
                background: 'linear-gradient(180deg, rgba(255,255,255,0.03), rgba(255,255,255,0.01))',
            }}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            onClick={onClick}
            animate={{
                scale: isHovered ? 1.02 : 1,
                boxShadow: isHovered
                    ? `0 8px 32px -8px ${color}30, 0 4px 16px -4px rgba(0,0,0,0.4)`
                    : '0 4px 16px -8px rgba(0,0,0,0.3)',
            }}
            transition={{ duration: 0.2 }}
        >
            {/* Animated background ring */}
            <motion.div
                className="absolute -right-4 -top-4 w-24 h-24 rounded-full opacity-20"
                style={{ background: `radial-gradient(circle, ${color}, transparent 70%)` }}
                animate={{
                    scale: isHovered ? 1.2 : 1,
                    opacity: isHovered ? 0.3 : 0.2,
                }}
                transition={{ duration: 0.4 }}
            />

            {/* Label */}
            <p className="text-[10px] font-medium uppercase tracking-wider text-[#71717A]">{label}</p>

            {/* Value */}
            <div className="mt-1 flex items-baseline gap-1">
                <span className="text-[11px] text-[#A1A1AA]">{prefix}</span>
                <motion.span
                    className="text-2xl font-bold tracking-tight"
                    style={{ color }}
                    key={value}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3 }}
                >
                    {displayValue}
                </motion.span>
                <span className="text-[11px] text-[#A1A1AA]">{suffix}</span>
            </div>

            {/* Trend indicator */}
            <AnimatePresence>
                {trendValue && (
                    <motion.div
                        initial={{ opacity: 0, y: 5 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -5 }}
                        className="mt-2 flex items-center gap-1"
                    >
                        <span style={{ color: trendColors[trend] }}>
                            {trend === 'up' && '↑'}
                            {trend === 'down' && '↓'}
                            {trend === 'neutral' && '→'}
                        </span>
                        <span className="text-[10px]" style={{ color: trendColors[trend] }}>
                            {trendValue}
                        </span>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Hover indicator line */}
            <motion.div
                className="absolute bottom-0 left-0 right-0 h-0.5"
                style={{ background: color }}
                animate={{ scaleX: isHovered ? 1 : 0 }}
                transition={{ duration: 0.25 }}
            />
        </motion.div>
    );
}

interface PulseIndicatorProps {
    color?: string;
    size?: 'sm' | 'md' | 'lg';
    pulse?: boolean;
}

export function PulseIndicator({
    color = '#10B981',
    size = 'md',
    pulse = true,
}: PulseIndicatorProps) {
    const sizeClasses = {
        sm: 'w-2 h-2',
        md: 'w-3 h-3',
        lg: 'w-4 h-4',
    };

    return (
        <span className="relative flex">
            {pulse && (
                <span
                    className={`absolute inline-flex ${sizeClasses[size]} rounded-full animate-ping`}
                    style={{ backgroundColor: color, opacity: 0.75 }}
                />
            )}
            <span
                className={`relative inline-flex ${sizeClasses[size]} rounded-full`}
                style={{ backgroundColor: color }}
            />
        </span>
    );
}

interface CountUpProps {
    end: number;
    duration?: number;
    prefix?: string;
    suffix?: string;
    className?: string;
}

export function CountUp({
    end,
    duration = 2,
    prefix = '',
    suffix = '',
    className = '',
}: CountUpProps) {
    const [count, setCount] = useState(0);

    useEffect(() => {
        let startTime: number;
        let animationFrame: number;

        const animate = (timestamp: number) => {
            if (!startTime) startTime = timestamp;
            const progress = Math.min((timestamp - startTime) / (duration * 1000), 1);

            // Ease out cubic
            const easeOut = 1 - Math.pow(1 - progress, 3);
            setCount(Math.floor(easeOut * end));

            if (progress < 1) {
                animationFrame = requestAnimationFrame(animate);
            }
        };

        animationFrame = requestAnimationFrame(animate);
        return () => cancelAnimationFrame(animationFrame);
    }, [end, duration]);

    return (
        <span className={className}>
            {prefix}
            {count}
            {suffix}
        </span>
    );
}
