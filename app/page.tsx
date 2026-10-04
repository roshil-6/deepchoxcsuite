'use client';

import React, { useState } from 'react';
import { Header } from '@/components/clapfetch/Header';
import { HeroMediaInput } from '@/components/clapfetch/HeroMediaInput';
import { ToolDiscovery } from '@/components/clapfetch/ToolDiscovery';
import { Workspace } from '@/components/clapfetch/Workspace';
import { LibraryView } from '@/components/clapfetch/LibraryView';
import { Footer } from '@/components/clapfetch/Footer';
import { FluidBackground } from '@/components/clapfetch/FluidBackground';
import { WorkspaceMedia, WorkspaceTool } from '@/lib/media/types';

export default function Home() {
  const [activeView, setActiveView] = useState<'home' | 'tools' | 'library' | 'playlists'>('home');
  const [loadedMedia, setLoadedMedia] = useState<WorkspaceMedia | null>(null);
  const [selectedTool, setSelectedTool] = useState<WorkspaceTool>('editor');

  const handleMediaLoaded = (media: WorkspaceMedia) => {
    setLoadedMedia(media);
  };

  const handleSelectToolFromHome = (tool: 'download' | 'cut' | 'audio' | 'ringtone' | 'reel' | 'subtitles' | 'compress' | 'frame' | 'all') => {
    if (tool === 'all') {
      setActiveView('tools');
      return;
    }

    if (tool === 'download') {
      // Scroll to the HeroMediaInput bar to paste link
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    const toolMap: Record<string, WorkspaceTool> = {
      cut: 'editor',
      audio: 'audio_extract',
      ringtone: 'ringtone',
      reel: 'reel',
      subtitles: 'subtitle_edit',
      compress: 'compress',
      frame: 'frame',
    };
    setSelectedTool(toolMap[tool] || 'trim');

    // No media yet → take the user to the paste/upload box; the chosen tool opens once media loads
    if (!loadedMedia) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  return (
    <div className="relative min-h-screen bg-transparent text-[#211D25] font-sans antialiased flex flex-col justify-between selection:bg-[#F0EAF8] selection:text-[#4C268F]">
      {/* Background Fluid Flowing Colors matching Ref UI */}
      <FluidBackground />

      <div className="relative z-10 flex-1 flex flex-col justify-between">
        {/* Header */}
        <Header
          activeView={activeView}
          setActiveView={setActiveView}
          onResetWorkspace={() => setLoadedMedia(null)}
          isWorkspaceActive={Boolean(loadedMedia)}
        />

        {/* Content routing */}
        {loadedMedia ? (
          /* Active Media Workspace — branding drops away, media becomes the focus */
          <Workspace
            media={loadedMedia}
            initialTool={selectedTool}
            onCloseWorkspace={() => setLoadedMedia(null)}
          />
        ) : (
          <>
            {activeView === 'home' && (
              <>
                <HeroMediaInput onMediaLoaded={handleMediaLoaded} />
                <ToolDiscovery onSelectTool={handleSelectToolFromHome} />
                <LibraryView onAddMedia={() => window.scrollTo({ top: 0, behavior: 'smooth' })} />
              </>
            )}

            {activeView === 'tools' && (
              <ToolDiscovery onSelectTool={handleSelectToolFromHome} />
            )}

            {activeView === 'library' && (
              <LibraryView
                initialTab="library"
                onAddMedia={() => {
                  setActiveView('home');
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
              />
            )}

            {activeView === 'playlists' && (
              <LibraryView
                initialTab="playlists"
                onAddMedia={() => {
                  setActiveView('home');
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
              />
            )}
          </>
        )}
      </div>

      {/* Restrained Footer */}
      <Footer />
    </div>
  );
}
