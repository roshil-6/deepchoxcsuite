'use client';

import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';

type DeskChatThreadSlotValue = {
    slot: HTMLElement | null;
    setDeskThreadSlot: (el: HTMLElement | null) => void;
};

const DeskChatThreadSlotContext = createContext<DeskChatThreadSlotValue | null>(null);

export function DeskChatThreadSlotProvider({ children }: { children: React.ReactNode }) {
    const [slot, setSlot] = useState<HTMLElement | null>(null);
    const setDeskThreadSlot = useCallback((el: HTMLElement | null) => {
        setSlot((prev) => (prev === el ? prev : el));
    }, []);
    const value = useMemo(() => ({ slot, setDeskThreadSlot }), [slot, setDeskThreadSlot]);
    return (
        <DeskChatThreadSlotContext.Provider value={value}>{children}</DeskChatThreadSlotContext.Provider>
    );
}

export function useDeskChatThreadSlotState() {
    return useContext(DeskChatThreadSlotContext);
}

/** Mount under desk Details; ChatAssistant portals the thread here when a block is focused. */
export function DeskChatThreadMount({ className }: { className?: string }) {
    const ctx = useContext(DeskChatThreadSlotContext);
    const setDeskThreadSlot = ctx?.setDeskThreadSlot;
    const ref = useCallback(
        (el: HTMLDivElement | null) => {
            setDeskThreadSlot?.(el);
        },
        [setDeskThreadSlot],
    );
    if (!setDeskThreadSlot) return null;
    return (
        <div
            ref={ref}
            className={`pointer-events-auto w-full ${className ?? 'mt-4 sm:mt-5'}`}
            data-desk-inline-chat-mount=""
        />
    );
}
