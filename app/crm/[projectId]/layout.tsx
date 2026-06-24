import React from 'react';
import { ProjectSidebar } from '@/components/crm/ProjectSidebar';

export default async function ProjectLayout({
  children,
  params
}: {
  children: React.ReactNode;
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  return (
    <div className="flex h-full w-full">
      <ProjectSidebar projectId={projectId} />
      <main className="flex-1 overflow-auto bg-[#f5f5fb]">
        {children}
      </main>
    </div>
  );
}
