import React from 'react';
import { GlobalSidebar } from '@/components/crm/GlobalSidebar';

export default function ProjectsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-full w-full">
      <GlobalSidebar />
      <main className="flex-1 overflow-auto bg-[#f5f5fb]">
        {children}
      </main>
    </div>
  );
}
