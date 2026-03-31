'use client';

import React from 'react';

type RoomChromeProps = {
  immersive?: boolean;
  chromeClass: string;
  children: React.ReactNode;
};

/** Optional inner frame: skipped for full-screen operational / Dexo modes. */
export function RoomChrome({ immersive, chromeClass, children }: RoomChromeProps) {
  if (immersive) {
    return <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden">{children}</div>;
  }
  return (
    <div className={`relative flex min-h-0 flex-1 flex-col overflow-hidden ${chromeClass}`}>
      {children}
    </div>
  );
}
