'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useAuth, useClerk } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
import { LandingPage } from '@/components/LandingPage';

function HomeContent() {
  const { isLoaded, isSignedIn } = useAuth();
  const router = useRouter();

  // Auto-enter workspace when signed in
  useEffect(() => {
    if (isLoaded && isSignedIn) {
      router.push('/crm/projects');
    }
  }, [isLoaded, isSignedIn, router]);

  const handleContinueGuest = () => {
    router.push('/crm/projects');
  };

  if (!isLoaded) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#030304] text-zinc-400">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-zinc-700 border-t-brand-teal" />
      </div>
    );
  }

  return <LandingPage onContinueGuest={handleContinueGuest} />;
}

export default function Home() {
  return (
    <Suspense fallback={
      <div className="flex h-screen items-center justify-center bg-[#030304] text-zinc-400">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-zinc-700 border-t-brand-teal" />
      </div>
    }>
      <HomeContent />
    </Suspense>
  );
}
