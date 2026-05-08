'use client';

import React, { useState } from 'react';
import { useOffice } from '@/lib/OfficeContext';
import { MessageCircle, Video } from 'lucide-react';
import { PAChatSurface } from '@/components/pa/PersonalAssistantChatContext';
import { RelayMeetingRoom } from '@/components/pa/RelayMeetingRoom';
import { PA_BUDDY_NAME, PA_BUDDY_TAGLINE } from '@/lib/paBuddy';
import { DeskTabButton } from '@/components/workspaces/DeskShell';

type RelayMode = 'chat' | 'meeting';

function PersonalAssistantLayout() {
    const { activeProject, switchRoom } = useOffice();
    const [relayMode, setRelayMode] = useState<RelayMode>('chat');

    if (!activeProject) {
        return (
            <div className="flex min-h-[50vh] w-full flex-col items-center justify-center gap-4 bg-[var(--color-brand-bg)] px-6 py-12 text-center">
                <p className="max-w-md text-sm text-[var(--muted)]">Choose a venture first.</p>
                <button
                    type="button"
                    onClick={() => switchRoom('dexo')}
                    className="rounded-lg bg-white/[0.06] px-4 py-2 text-sm font-medium text-[var(--text)] transition-colors hover:bg-white/[0.1]"
                >
                    Open Deepchox
                </button>
            </div>
        );
    }

    const modeTabs = (
        <>
            <DeskTabButton
                chroming="ghost"
                active={relayMode === 'chat'}
                onClick={() => setRelayMode('chat')}
                icon={<MessageCircle className="h-3.5 w-3.5" aria-hidden />}
                className={
                    relayMode === 'chat' ? '!bg-[var(--color-brand-card)] text-[var(--text)]' : ''
                }
            >
                Chat
            </DeskTabButton>
            <DeskTabButton
                chroming="ghost"
                active={relayMode === 'meeting'}
                onClick={() => setRelayMode('meeting')}
                icon={<Video className="h-3.5 w-3.5" aria-hidden />}
                className={
                    relayMode === 'meeting' ? '!bg-[var(--color-brand-card)] text-[var(--text)]' : ''
                }
            >
                Meeting
            </DeskTabButton>
        </>
    );

    return (
        <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-[var(--color-brand-bg)]">
            <header className="flex shrink-0 items-center justify-between gap-2 bg-white/[0.02] px-3 py-2 sm:px-4 sm:py-2.5">
                <p className="min-w-0 truncate text-[11px] text-[var(--muted)]">
                    <span className="font-medium text-[var(--text)]/90">{activeProject.name}</span>
                    <span className="mx-1.5 text-white/20" aria-hidden>
                        ·
                    </span>
                    <span>Deepchox Cofounder</span>
                </p>
                <div className="flex shrink-0 flex-wrap justify-end gap-1">{modeTabs}</div>
            </header>
            <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
                {relayMode === 'chat' ? (
                    <PAChatSurface
                        variant="page"
                        pageIntro={{
                            ventureName: activeProject.name,
                            buddyLabel: PA_BUDDY_NAME,
                            tagline: PA_BUDDY_TAGLINE,
                        }}
                    />
                ) : (
                    <RelayMeetingRoom onSwitchToChat={() => setRelayMode('chat')} />
                )}
            </div>
        </div>
    );
}

/** Full Assistant room — must render under `PersonalAssistantChatProvider`. */
export function PersonalAssistant() {
    return <PersonalAssistantLayout />;
}
