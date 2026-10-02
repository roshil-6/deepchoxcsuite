'use client';

import React, { useState } from 'react';

interface LibraryViewProps {
  initialTab?: 'library' | 'playlists';
  onAddMedia: () => void;
}

export function LibraryView({ initialTab = 'library', onAddMedia }: LibraryViewProps) {
  const [tab, setTab] = useState<'library' | 'playlists'>(initialTab);

  return (
    <div className="py-16 sm:py-24 bg-transparent min-h-[400px]">
      <div className="mx-auto max-w-[1240px] px-6 sm:px-8">
        {/* Navigation tabs */}
        <div className="flex items-center gap-6 border-b border-[#E9E4EC] pb-3 mb-12">
          <button
            onClick={() => setTab('library')}
            className={`text-sm font-semibold transition-cf ${
              tab === 'library' ? 'text-[#6D3FC0] border-b-2 border-[#6D3FC0] pb-3 -mb-3.5' : 'text-[#69636E] hover:text-[#211D25]'
            }`}
          >
            Library
          </button>
          <button
            onClick={() => setTab('playlists')}
            className={`text-sm font-semibold transition-cf ${
              tab === 'playlists' ? 'text-[#6D3FC0] border-b-2 border-[#6D3FC0] pb-3 -mb-3.5' : 'text-[#69636E] hover:text-[#211D25]'
            }`}
          >
            Playlists
          </button>
        </div>

        {/* Clean Empty States (No sad cartoon illustrations) */}
        {tab === 'library' && (
          <div className="max-w-[480px] py-12">
            <h2 className="text-2xl font-semibold text-[#211D25] tracking-tight">
              Nothing saved yet
            </h2>
            <p className="mt-2 text-sm text-[#69636E] leading-relaxed">
              Audio and clips you save to your library will appear here.
            </p>
            <div className="mt-6">
              <button
                onClick={onAddMedia}
                className="rounded-[11px] bg-[#6D3FC0] hover:bg-[#5B32A8] px-5 py-2.5 text-xs font-semibold text-white transition-cf"
              >
                Add media
              </button>
            </div>
          </div>
        )}

        {tab === 'playlists' && (
          <div className="max-w-[480px] py-12">
            <h2 className="text-2xl font-semibold text-[#211D25] tracking-tight">
              No playlists yet
            </h2>
            <p className="mt-2 text-sm text-[#69636E] leading-relaxed">
              Create a playlist to organize the music and clips you've saved.
            </p>
            <div className="mt-6">
              <button
                onClick={onAddMedia}
                className="rounded-[11px] bg-[#6D3FC0] hover:bg-[#5B32A8] px-5 py-2.5 text-xs font-semibold text-white transition-cf"
              >
                Create playlist
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
