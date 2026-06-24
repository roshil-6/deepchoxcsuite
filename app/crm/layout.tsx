import React from 'react';

// Light theme shell for CRM Builder
export default function CrmLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen w-full bg-[#f5f5fb] text-[#111827] overflow-hidden font-sans">
      {children}
    </div>
  );
}
