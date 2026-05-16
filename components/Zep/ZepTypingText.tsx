'use client';

import React, { useState, useEffect, useCallback } from 'react';

interface ZepTypingTextProps {
  text: string;
  speed?: number;
  onComplete?: () => void;
  className?: string;
  showCursor?: boolean;
}

export function ZepTypingText({ 
  text, 
  speed = 30, 
  onComplete, 
  className = '',
  showCursor = true 
}: ZepTypingTextProps) {
  const [displayText, setDisplayText] = useState('');
  const [isComplete, setIsComplete] = useState(false);
  const [cursorVisible, setCursorVisible] = useState(true);

  // Natural typing with variable speed
  const getTypeDelay = useCallback(() => {
    // Vary speed for human-like effect
    const base = speed;
    const variance = Math.random() * 20 - 10;
    // Pause longer on punctuation
    const lastChar = displayText.slice(-1);
    if (['.', '!', '?', ','].includes(lastChar)) {
      return base + 150 + Math.random() * 100;
    }
    return Math.max(10, base + variance);
  }, [speed, displayText]);

  useEffect(() => {
    if (isComplete) return;

    if (displayText.length < text.length) {
      const timeout = setTimeout(() => {
        setDisplayText(text.slice(0, displayText.length + 1));
      }, getTypeDelay());
      return () => clearTimeout(timeout);
    } else {
      setIsComplete(true);
      onComplete?.();
    }
  }, [displayText, text, isComplete, getTypeDelay, onComplete]);

  // Cursor blink
  useEffect(() => {
    if (!showCursor || isComplete) return;
    const interval = setInterval(() => {
      setCursorVisible(v => !v);
    }, 530);
    return () => clearInterval(interval);
  }, [showCursor, isComplete]);

  return (
    <span className={className}>
      {displayText}
      {showCursor && !isComplete && (
        <span className={`inline-block w-0.5 h-4 ml-0.5 align-middle bg-current ${cursorVisible ? 'opacity-100' : 'opacity-0'}`} />
      )}
    </span>
  );
}

// Message bubble with typing effect
interface ZepMessageBubbleProps {
  role: 'user' | 'zep';
  text: string;
  isNew?: boolean;
  dark?: boolean;
}

export function ZepMessageBubble({ role, text, isNew = false, dark = true }: ZepMessageBubbleProps) {
  const [showTyping, setShowTyping] = useState(isNew && role === 'zep');

  return (
    <div className={`max-w-[85%] rounded-2xl px-4 py-3 text-[14px] leading-relaxed ${
      role === 'user'
        ? 'bg-neutral-700 text-white shadow-sm'
        : dark
          ? 'border border-[#262626] bg-[#1a1a1a] text-neutral-200 shadow-sm'
          : 'border border-neutral-200/80 bg-white text-neutral-700 shadow-sm'
    }`}>
      {showTyping ? (
        <ZepTypingText 
          text={text} 
          speed={25}
          onComplete={() => setShowTyping(false)}
        />
      ) : (
        text.split('\n').map((line, i) => (
          <div key={i} className={line.trim() === '' ? 'h-4' : ''}>
            {line || ''}
          </div>
        ))
      )}
    </div>
  );
}
