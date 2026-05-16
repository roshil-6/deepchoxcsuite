// Zep Personality System - Human-like emotional responses

export type ZepEmotion = 'neutral' | 'curious' | 'excited' | 'thoughtful' | 'helpful' | 'encouraging';
export type ZepState = 'idle' | 'listening' | 'thinking' | 'speaking' | 'processing';

interface EmotionalResponse {
  prefix: string;
  suffix: string;
  emotion: ZepEmotion;
}

// Emotional prefixes that make Zep sound more human
const emotionalPrefixes: Record<ZepEmotion, string[]> = {
  neutral: ['', 'Sure. ', 'Alright. ', 'Okay. '],
  curious: ['Hmm, interesting. ', 'Oh? ', 'Let me think... ', 'Curious. '],
  excited: ['Great! ', 'Awesome! ', 'Love this! ', 'Excellent! '],
  thoughtful: ['Let me see... ', 'Thinking it through... ', 'Hmm... ', 'Consider this: '],
  helpful: ['I can help with that. ', 'Here you go: ', 'Let me assist. ', 'No problem. '],
  encouraging: ['You got this! ', 'Nice work! ', 'Keep going! ', 'Looking good! '],
};

// Context-aware suffixes
const emotionalSuffixes: Record<ZepEmotion, string[]> = {
  neutral: ['', ' Let me know if you need anything else.'],
  curious: [' What would you like to explore next?', ' Want to dig deeper?'],
  excited: [' This is going to be great!', ' Let\'s do more!'],
  thoughtful: [' Take your time with this.', ' Let me know your thoughts.'],
  helpful: [' I\'m here if you need more help.', ' Just ask if anything\'s unclear.'],
  encouraging: [' You\'re making great progress!', ' Keep the momentum going!'],
};

// Detect emotion based on user input and context
export function detectEmotion(input: string, context: string): ZepEmotion {
  const lower = input.toLowerCase();
  const lowerContext = context.toLowerCase();
  
  // Positive/excited triggers
  if (/great|awesome|excellent|love|amazing|perfect|wonderful|fantastic/i.test(lower)) {
    return 'excited';
  }
  
  // Question/curious triggers
  if (/why|how|what if|curious|wonder|explain/i.test(lower)) {
    return 'curious';
  }
  
  // Help request
  if (/help|assist|support|stuck|confused|lost/i.test(lower)) {
    return 'helpful';
  }
  
  // Achievement/progress
  if (/done|finished|completed|created|built|made|success/i.test(lowerContext)) {
    return 'encouraging';
  }
  
  // Deep thinking
  if (/analyze|strategy|plan|consider|think|complex|complicated/i.test(lower)) {
    return 'thoughtful';
  }
  
  return 'neutral';
}

// Add emotional layer to response
export function addEmotionalLayer(response: string, emotion: ZepEmotion): string {
  // Don't modify short responses or commands
  if (response.length < 20 || response.includes('•')) {
    return response;
  }
  
  const prefixes = emotionalPrefixes[emotion];
  const suffixes = emotionalSuffixes[emotion];
  
  const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
  const suffix = suffixes[Math.floor(Math.random() * suffixes.length)];
  
  // Clean up any trailing periods before adding suffix
  const cleanResponse = response.replace(/\.+$/, '');
  
  return `${prefix}${cleanResponse}${suffix}`;
}

// Get state-based visual indicators
export function getStateVisuals(state: ZepState, isDark: boolean) {
  const base = {
    idle: {
      gradient: isDark 
        ? 'from-neutral-700 via-neutral-800 to-neutral-900'
        : 'from-neutral-200 via-neutral-300 to-neutral-400',
      glow: isDark ? 'rgba(107,114,128,0.4)' : 'rgba(156,163,175,0.3)',
      particleColor: isDark ? '#9ca3af' : '#6b7280',
      ringColor: 'transparent',
      animation: 'pulse',
    },
    listening: {
      gradient: isDark
        ? 'from-amber-600 via-amber-700 to-amber-800'
        : 'from-amber-400 via-amber-500 to-amber-600',
      glow: isDark ? 'rgba(245,158,11,0.5)' : 'rgba(251,191,36,0.4)',
      particleColor: isDark ? '#fbbf24' : '#f59e0b',
      ringColor: isDark ? '#fbbf24' : '#f59e0b',
      animation: 'bounce',
    },
    thinking: {
      gradient: isDark
        ? 'from-violet-600 via-violet-700 to-violet-800'
        : 'from-violet-400 via-violet-500 to-violet-600',
      glow: isDark ? 'rgba(139,92,246,0.5)' : 'rgba(167,139,250,0.4)',
      particleColor: isDark ? '#a78bfa' : '#8b5cf6',
      ringColor: isDark ? '#a78bfa' : '#8b5cf6',
      animation: 'spin',
    },
    speaking: {
      gradient: isDark
        ? 'from-emerald-600 via-emerald-700 to-emerald-800'
        : 'from-emerald-400 via-emerald-500 to-emerald-600',
      glow: isDark ? 'rgba(16,185,129,0.5)' : 'rgba(52,211,153,0.4)',
      particleColor: isDark ? '#34d399' : '#10b981',
      ringColor: isDark ? '#34d399' : '#10b981',
      animation: 'pulse',
    },
    processing: {
      gradient: isDark
        ? 'from-blue-600 via-blue-700 to-blue-800'
        : 'from-blue-400 via-blue-500 to-blue-600',
      glow: isDark ? 'rgba(59,130,246,0.5)' : 'rgba(96,165,250,0.4)',
      particleColor: isDark ? '#60a5fa' : '#3b82f6',
      ringColor: isDark ? '#60a5fa' : '#3b82f6',
      animation: 'ping',
    },
  };
  
  return base[state] || base.idle;
}

// Human-like response variations
export function humanizeResponse(response: string): string {
  // Replace robotic phrases with more natural ones
  const replacements: [RegExp, string][] = [
    [/^I understand\./i, 'Got it.'],
    [/^I will /i, 'I\'ll '],
    [/^I cannot /i, 'I can\'t '],
    [/^I do not /i, 'I don\'t '],
    [/^It is /i, 'It\'s '],
    [/^That is /i, 'That\'s '],
    [/\. Please /i, '. Feel free to '],
    [/\. You can /i, '. Go ahead and '],
  ];
  
  let humanized = response;
  for (const [pattern, replacement] of replacements) {
    humanized = humanized.replace(pattern, replacement);
  }
  
  return humanized;
}

// Get contextual greeting based on time
export function getContextualGreeting(): string {
  const hour = new Date().getHours();
  
  if (hour < 6) return 'Up late? I\'m here to help.';
  if (hour < 12) return 'Good morning! Ready to build something?';
  if (hour < 18) return 'Good afternoon! What are we working on?';
  return 'Good evening! Need a hand with anything?';
}

// Conversation memory for continuity
export class ZepMemory {
  private recentTopics: string[] = [];
  private maxTopics = 5;
  
  addTopic(topic: string) {
    this.recentTopics.unshift(topic);
    if (this.recentTopics.length > this.maxTopics) {
      this.recentTopics.pop();
    }
  }
  
  getRecentContext(): string {
    if (this.recentTopics.length === 0) return '';
    return `We were talking about: ${this.recentTopics.slice(0, 3).join(', ')}.`;
  }
  
  hasTopic(keyword: string): boolean {
    return this.recentTopics.some(t => t.toLowerCase().includes(keyword.toLowerCase()));
  }
}
