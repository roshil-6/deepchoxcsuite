'use client';

// WorkspaceStage is kept as a thin passthrough for compatibility.
// The app now renders EngineeringPlatform directly from page.tsx.
import { EngineeringPlatform } from './EngineeringPlatform';

export function WorkspaceStage({ selectedProjectId }: { selectedProjectId?: string | null }) {
  return <EngineeringPlatform selectedProjectId={selectedProjectId} />;
}
