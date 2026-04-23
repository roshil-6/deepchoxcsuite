'use client';

import { AuthenticateWithRedirectCallback } from '@clerk/nextjs';
import { useEffect, useState } from 'react';
import { AuthPageBackground } from '@/components/auth/AuthPageBackground';

const STEPS = [
  { label: 'Authenticating with provider',  completesAt: 350  },
  { label: 'Verifying your identity',        completesAt: 850  },
  { label: 'Preparing your workspace',       completesAt: 99999 }, // stays active until Clerk redirects
];

function CheckIcon({ done, active }: { done: boolean; active: boolean }) {
  if (done) {
    return (
      <span className="relative flex h-6 w-6 shrink-0 items-center justify-center">
        <span
          className="absolute inset-0 rounded-full bg-[#7456ff]/20"
          style={{ animation: 'auth-beacon 1.4s ease-out forwards' }}
        />
        <svg
          viewBox="0 0 24 24"
          className="relative h-5 w-5"
          fill="none"
          stroke="#9d88ff"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{
            strokeDasharray: 22,
            strokeDashoffset: 0,
            animation: 'auth-check 0.4s ease forwards',
          }}
        >
          <polyline points="20 6 9 17 4 12" />
        </svg>
      </span>
    );
  }

  if (active) {
    return (
      <span className="relative flex h-6 w-6 shrink-0 items-center justify-center">
        <svg
          className="h-5 w-5"
          viewBox="0 0 24 24"
          fill="none"
          style={{ animation: 'auth-spin-ring 0.8s linear infinite' }}
        >
          <circle cx="12" cy="12" r="9" stroke="#7456ff" strokeWidth="2" strokeOpacity="0.2" />
          <path
            d="M12 3a9 9 0 0 1 9 9"
            stroke="#7456ff"
            strokeWidth="2.2"
            strokeLinecap="round"
          />
        </svg>
      </span>
    );
  }

  return (
    <span className="flex h-6 w-6 shrink-0 items-center justify-center">
      <span className="h-2 w-2 rounded-full bg-zinc-700" />
    </span>
  );
}

export default function SsoCallbackPage() {
  const [doneSteps, setDoneSteps] = useState<Set<number>>(new Set());

  useEffect(() => {
    const timers = STEPS.slice(0, -1).map((step, i) =>
      setTimeout(() => setDoneSteps((prev) => new Set([...prev, i])), step.completesAt),
    );
    return () => timers.forEach(clearTimeout);
  }, []);

  const activeStep = STEPS.findIndex((_, i) => !doneSteps.has(i));

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#030304]">
      <AuthPageBackground />

      {/* Clerk processes the callback silently */}
      <div className="sr-only">
        <AuthenticateWithRedirectCallback
          signInFallbackRedirectUrl="/"
          signUpFallbackRedirectUrl="/"
        />
      </div>

      {/* Verification UI */}
      <div
        className="relative z-10 flex w-full max-w-sm flex-col items-center gap-8 px-6"
        style={{ animation: 'auth-step-in 0.4s ease forwards' }}
      >
        {/* Pulsing orb */}
        <div className="relative flex h-20 w-20 items-center justify-center">
          <div
            className="absolute inset-0 rounded-full bg-[#7456ff]/25 blur-lg"
            style={{ animation: 'auth-glow 2s ease-in-out infinite' }}
          />
          <div className="relative flex h-20 w-20 items-center justify-center rounded-full border border-[#7456ff]/30 bg-[#7456ff]/10 shadow-[0_0_40px_rgba(116,86,255,0.3)]">
            <svg
              className="h-9 w-9"
              viewBox="0 0 24 24"
              fill="none"
              style={activeStep < STEPS.length - 1 ? { animation: 'auth-spin-ring 1.2s linear infinite' } : {}}
            >
              <circle cx="12" cy="12" r="9" stroke="#7456ff" strokeWidth="1.5" strokeOpacity="0.18" />
              <path d="M12 3a9 9 0 0 1 9 9" stroke="#7456ff" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
          </div>
        </div>

        {/* Title */}
        <div className="text-center">
          <h1 className="font-sans text-[1.2rem] font-bold text-white">
            Signing you in
          </h1>
          <p className="mt-1.5 font-sans text-[13px] text-zinc-500">
            Hang tight — this takes just a moment
          </p>
        </div>

        {/* Steps */}
        <div className="w-full rounded-2xl border border-zinc-800/70 bg-zinc-950/80 p-5 shadow-[0_16px_48px_rgba(0,0,0,0.6)] backdrop-blur-md">
          {/* Top accent */}
          <div className="absolute inset-x-0 top-0 h-px rounded-t-2xl bg-gradient-to-r from-transparent via-[#7456ff]/50 to-transparent" aria-hidden />

          <ul className="flex flex-col gap-4">
            {STEPS.map((step, i) => {
              const done = doneSteps.has(i);
              const active = activeStep === i;
              return (
                <li
                  key={i}
                  className="flex items-center gap-3.5"
                  style={
                    active || done
                      ? { animation: 'auth-step-in 0.35s ease forwards', animationDelay: `${i * 60}ms` }
                      : { opacity: 0.4 }
                  }
                >
                  <CheckIcon done={done} active={active} />
                  <span
                    className={`font-sans text-[14px] font-medium transition-colors duration-300 ${
                      done ? 'text-[#9d88ff]' : active ? 'text-white' : 'text-zinc-600'
                    }`}
                  >
                    {step.label}
                  </span>
                  {active && (
                    <span className="ml-auto font-sans text-[11px] text-zinc-600 tabular-nums">
                      …
                    </span>
                  )}
                  {done && (
                    <span
                      className="ml-auto font-sans text-[11px] text-[#7456ff]/70"
                      style={{ animation: 'auth-step-in 0.3s ease forwards' }}
                    >
                      done
                    </span>
                  )}
                </li>
              );
            })}
          </ul>
        </div>

        {/* Wordmark footer */}
        <p className="font-sans text-[11px] text-zinc-700">
          north<span className="text-[#7456ff]/70">ROSC</span> · Deepchox
        </p>
      </div>
    </div>
  );
}
