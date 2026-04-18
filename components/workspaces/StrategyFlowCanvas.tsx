'use client';

/**
 * Strategy plan canvas — draggable steps, explicit linking, bendable edges.
 * Uses Pointer Events + refs for stable drag (avoids listener churn when parent re-renders each move).
 */

import React, { useState, useCallback, useRef, useEffect, useId, useMemo } from 'react';
import type { FlowEdge, FlowNode } from '@/lib/strategyDoc';
import {
    Plus,
    Trash2,
    GripHorizontal,
    LayoutGrid,
    Link2,
    X,
    ZoomIn,
    ZoomOut,
    RotateCcw,
    ArrowLeft,
    ArrowRight,
    ArrowUp,
    ArrowDown,
    Hand,
} from 'lucide-react';

const NODE_W = 248;
/** Approx. full card height (Move rail + label + actions); used for drag bounds and anchors */
const NODE_BOX_H = 132;
const RAIL_H = 28;
const ANCHOR_Y = NODE_BOX_H / 2;
const CANVAS_PAD = 96;
const ZOOM_MIN = 0.4;
const ZOOM_MAX = 2.5;
const ZOOM_FACTOR = 1.12;
const PAN_STEP = 80;

/** Subtle left-edge tint per step (no gradients on cards) */
const STEP_EDGE = [
    'border-l-teal-500/55',
    'border-l-violet-500/50',
    'border-l-amber-500/50',
    'border-l-sky-500/50',
];

function defaultBendForChord(p1: { x: number; y: number }, p2: { x: number; y: number }) {
    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    const dist = Math.sqrt(dx * dx + dy * dy) || 1;
    const bulge = Math.min(72, Math.max(24, dist * 0.24));
    return { bendMx: (-dy / dist) * bulge, bendMy: (dx / dist) * bulge };
}

function getBendForEdge(e: FlowEdge, p1: { x: number; y: number }, p2: { x: number; y: number }) {
    if (e.bendMx != null && e.bendMy != null) return { bendMx: e.bendMx, bendMy: e.bendMy };
    if (e.bendMx != null || e.bendMy != null) return { bendMx: e.bendMx ?? 0, bendMy: e.bendMy ?? 0 };
    return defaultBendForChord(p1, p2);
}

function quadraticEdgePath(
    p1: { x: number; y: number },
    p2: { x: number; y: number },
    bendMx: number,
    bendMy: number
) {
    const midX = (p1.x + p2.x) / 2;
    const midY = (p1.y + p2.y) / 2;
    const cx = midX + bendMx;
    const cy = midY + bendMy;
    return `M ${p1.x} ${p1.y} Q ${cx} ${cy} ${p2.x} ${p2.y}`;
}

function anchorsForEdge(e: FlowEdge, a: FlowNode, b: FlowNode) {
    const p1 = { x: a.x + (e.fromX ?? NODE_W), y: a.y + (e.fromY ?? ANCHOR_Y) };
    const p2 = { x: b.x + (e.toX ?? 0), y: b.y + (e.toY ?? ANCHOR_Y) };
    return { p1, p2 };
}

type Props = {
    nodes: FlowNode[];
    edges: FlowEdge[];
    onChange: (next: { nodes: FlowNode[]; edges: FlowEdge[] }) => void;
    readOnly?: boolean;
    expanded?: boolean;
    fillHeight?: boolean;
    /** Fill parent flex height only (e.g. full-screen CEO map); avoids a fixed vh min that can overflow the shell */
    edgeToEdge?: boolean;
};

function findNodeIdAtPoint(
    clientX: number,
    clientY: number,
    wrapEl: HTMLElement,
    nodeIds: string[]
): string | null {
    const el = document.elementFromPoint(clientX, clientY);
    const hit = el?.closest?.('[data-flow-node]') as HTMLElement | null;
    const id = hit?.getAttribute('data-flow-node');
    if (id) return id;

    const all = wrapEl.querySelectorAll('[data-flow-node]');
    for (const node of all) {
        const nid = node.getAttribute('data-flow-node');
        if (!nid || !nodeIds.includes(nid)) continue;
        const r = (node as HTMLElement).getBoundingClientRect();
        if (clientX >= r.left && clientX <= r.right && clientY >= r.top && clientY <= r.bottom) {
            return nid;
        }
    }
    return null;
}

export function StrategyFlowCanvas({ nodes, edges, onChange, readOnly, expanded, fillHeight, edgeToEdge }: Props) {
    const uid = useId();
    const safeSvgId = uid.replace(/:/g, '');
    const markerId = `arrow-${safeSvgId}`;

    const [dragId, setDragId] = useState<string | null>(null);
    const dragIdRef = useRef<string | null>(null);
    dragIdRef.current = dragId;

    const dragOffsetRef = useRef({ x: 0, y: 0 });
    const wrapRef = useRef<HTMLDivElement>(null);
    const surfaceSizeRef = useRef({ w: 800, h: 560 });
    const [scrollViewport, setScrollViewport] = useState({ w: 0, h: 0 });

    const { surfaceW, surfaceH } = useMemo(() => {
        const maxR = nodes.length ? Math.max(...nodes.map((n) => n.x + NODE_W)) : 0;
        const maxB = nodes.length ? Math.max(...nodes.map((n) => n.y + NODE_BOX_H)) : 0;
        const vw = scrollViewport.w || 640;
        const vh = scrollViewport.h || 420;
        return {
            surfaceW: Math.max(vw, maxR + CANVAS_PAD, 800),
            surfaceH: Math.max(vh, maxB + CANVAS_PAD, 560),
        };
    }, [nodes, scrollViewport.w, scrollViewport.h]);

    surfaceSizeRef.current = { w: surfaceW, h: surfaceH };

    const [zoom, setZoom] = useState(1);
    const zoomRef = useRef(1);
    zoomRef.current = zoom;

    const nodesRef = useRef(nodes);
    const edgesRef = useRef(edges);
    const onChangeRef = useRef(onChange);
    nodesRef.current = nodes;
    edgesRef.current = edges;
    onChangeRef.current = onChange;

    useEffect(() => {
        const el = wrapRef.current;
        if (!el) return;
        const ro = new ResizeObserver(() => {
            setScrollViewport({ w: el.clientWidth, h: el.clientHeight });
        });
        ro.observe(el);
        setScrollViewport({ w: el.clientWidth, h: el.clientHeight });
        return () => ro.disconnect();
    }, []);

    useEffect(() => {
        const el = wrapRef.current;
        if (!el) return;
        const onWheel = (e: WheelEvent) => {
            if (!e.ctrlKey && !e.metaKey) return;
            e.preventDefault();
            const dz = e.deltaY > 0 ? -0.09 : 0.09;
            setZoom((z) => Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, z + dz)));
        };
        el.addEventListener('wheel', onWheel, { passive: false });
        return () => el.removeEventListener('wheel', onWheel);
    }, []);

    const zoomIn = useCallback(() => {
        setZoom((z) => Math.min(ZOOM_MAX, Math.round(z * ZOOM_FACTOR * 100) / 100));
    }, []);

    const zoomOut = useCallback(() => {
        setZoom((z) => Math.max(ZOOM_MIN, Math.round((z / ZOOM_FACTOR) * 100) / 100));
    }, []);

    const resetView = useCallback(() => {
        setZoom(1);
        requestAnimationFrame(() => {
            wrapRef.current?.scrollTo({ left: 0, top: 0, behavior: 'smooth' });
        });
    }, []);

    const panBy = useCallback((dx: number, dy: number) => {
        wrapRef.current?.scrollBy({ left: dx, top: dy, behavior: 'smooth' });
    }, []);

    /** Armed source for explicit “Connect” → click target */
    const [linkFrom, setLinkFrom] = useState<string | null>(null);
    const [linkHover, setLinkHover] = useState<string | null>(null);

    /** Hold and drag on empty canvas to pan (hand tool) */
    const [holdPanMode, setHoldPanMode] = useState(false);
    const [canvasPanning, setCanvasPanning] = useState(false);

    const onCanvasPointerDown = useCallback(
        (e: React.PointerEvent<HTMLDivElement>) => {
            if (!holdPanMode || linkFrom) return;
            if (e.button !== 0) return;
            const t = e.target as HTMLElement;
            if (t.closest('[data-flow-node]') || t.closest('button') || t.closest('input')) return;
            const wrap = wrapRef.current;
            if (!wrap) return;
            e.preventDefault();
            const start = {
                px: e.clientX,
                py: e.clientY,
                sl: wrap.scrollLeft,
                st: wrap.scrollTop,
            };
            setCanvasPanning(true);
            const onMove = (ev: PointerEvent) => {
                wrap.scrollLeft = start.sl - (ev.clientX - start.px);
                wrap.scrollTop = start.st - (ev.clientY - start.py);
            };
            const onUp = () => {
                window.removeEventListener('pointermove', onMove);
                window.removeEventListener('pointerup', onUp);
                window.removeEventListener('pointercancel', onUp);
                setCanvasPanning(false);
            };
            window.addEventListener('pointermove', onMove);
            window.addEventListener('pointerup', onUp);
            window.addEventListener('pointercancel', onUp);
        },
        [holdPanMode, linkFrom]
    );

    const [bendDragIndex, setBendDragIndex] = useState<number | null>(null);

    const addEdgeIfAbsent = useCallback((fromId: string, toId: string) => {
        if (fromId === toId) return;
        const curNodes = nodesRef.current;
        const curEdges = edgesRef.current;
        if (curEdges.some((x) => x.from === fromId && x.to === toId)) return;
        const a = curNodes.find((n) => n.id === fromId);
        const b = curNodes.find((n) => n.id === toId);
        if (!a || !b) return;
        const fromLocal = { x: NODE_W, y: ANCHOR_Y };
        const toLocal = { x: 0, y: ANCHOR_Y };
        const p1 = { x: a.x + fromLocal.x, y: a.y + fromLocal.y };
        const p2 = { x: b.x + toLocal.x, y: b.y + toLocal.y };
        const { bendMx, bendMy } = defaultBendForChord(p1, p2);
        onChangeRef.current({
            nodes: curNodes,
            edges: [
                ...curEdges,
                {
                    from: fromId,
                    to: toId,
                    fromX: fromLocal.x,
                    fromY: fromLocal.y,
                    toX: toLocal.x,
                    toY: toLocal.y,
                    bendMx,
                    bendMy,
                },
            ],
        });
    }, []);

    const beginDrag = useCallback(
        (e: React.PointerEvent, id: string) => {
            if (readOnly) return;
            e.preventDefault();
            e.stopPropagation();
            const node = nodesRef.current.find((n) => n.id === id);
            const wrap = wrapRef.current;
            if (!node || !wrap) return;
            const rect = wrap.getBoundingClientRect();
            const z = zoomRef.current;
            const px = (e.clientX - rect.left + wrap.scrollLeft) / z;
            const py = (e.clientY - rect.top + wrap.scrollTop) / z;
            dragOffsetRef.current = { x: px - node.x, y: py - node.y };
            setDragId(id);
            try {
                (e.target as HTMLElement).setPointerCapture(e.pointerId);
            } catch {
                /* ignore */
            }
        },
        [readOnly]
    );

    const endDrag = useCallback((e: React.PointerEvent) => {
        try {
            (e.target as HTMLElement).releasePointerCapture(e.pointerId);
        } catch {
            /* ignore */
        }
        setDragId(null);
    }, []);

    useEffect(() => {
        if (!dragId) return;

        const onMove = (e: PointerEvent) => {
            const id = dragIdRef.current;
            const wrap = wrapRef.current;
            if (!id || !wrap) return;
            const rect = wrap.getBoundingClientRect();
            const z = zoomRef.current;
            const { w: sw, h: sh } = surfaceSizeRef.current;
            const curNodes = nodesRef.current;
            const curEdges = edgesRef.current;
            const wx = (e.clientX - rect.left + wrap.scrollLeft) / z - dragOffsetRef.current.x;
            const wy = (e.clientY - rect.top + wrap.scrollTop) / z - dragOffsetRef.current.y;
            const x = Math.max(0, Math.min(sw - NODE_W, wx));
            const y = Math.max(0, Math.min(sh - NODE_BOX_H, wy));
            onChangeRef.current({
                nodes: curNodes.map((n) => (n.id === id ? { ...n, x, y } : n)),
                edges: curEdges,
            });
        };

        const onUp = () => setDragId(null);

        window.addEventListener('pointermove', onMove);
        window.addEventListener('pointerup', onUp);
        window.addEventListener('pointercancel', onUp);
        return () => {
            window.removeEventListener('pointermove', onMove);
            window.removeEventListener('pointerup', onUp);
            window.removeEventListener('pointercancel', onUp);
        };
    }, [dragId]);

    useEffect(() => {
        if (!linkFrom || readOnly) return;
        const wrap = wrapRef.current;
        if (!wrap) return;

        const fromId = linkFrom;

        const onMove = (e: MouseEvent) => {
            const ids = nodesRef.current.map((n) => n.id);
            const hit = findNodeIdAtPoint(e.clientX, e.clientY, wrap, ids);
            setLinkHover(hit && hit !== fromId ? hit : null);
        };

        const onDown = (e: MouseEvent) => {
            const t = e.target as HTMLElement;
            if (t.closest('button') || t.closest('input')) return;
            const ids = nodesRef.current.map((n) => n.id);
            const toId = findNodeIdAtPoint(e.clientX, e.clientY, wrap, ids);
            if (!toId || toId === fromId) return;
            addEdgeIfAbsent(fromId, toId);
            setLinkFrom(null);
            setLinkHover(null);
        };

        const onKey = (ev: KeyboardEvent) => {
            if (ev.key === 'Escape') {
                setLinkFrom(null);
                setLinkHover(null);
            }
        };

        wrap.addEventListener('mousemove', onMove);
        wrap.addEventListener('mousedown', onDown);
        window.addEventListener('keydown', onKey);
        return () => {
            wrap.removeEventListener('mousemove', onMove);
            wrap.removeEventListener('mousedown', onDown);
            window.removeEventListener('keydown', onKey);
        };
    }, [linkFrom, readOnly, addEdgeIfAbsent]);

    useEffect(() => {
        if (bendDragIndex === null || readOnly) return;

        const move = (e: MouseEvent) => {
            const pt = (() => {
                const wrap = wrapRef.current;
                if (!wrap) return null;
                const rect = wrap.getBoundingClientRect();
                const z = zoomRef.current;
                return {
                    x: (e.clientX - rect.left + wrap.scrollLeft) / z,
                    y: (e.clientY - rect.top + wrap.scrollTop) / z,
                };
            })();
            if (!pt) return;
            const curEdges = edgesRef.current;
            const curNodes = nodesRef.current;
            const edge = curEdges[bendDragIndex];
            if (!edge) return;
            const na = curNodes.find((n) => n.id === edge.from);
            const nb = curNodes.find((n) => n.id === edge.to);
            if (!na || !nb) return;
            const { p1, p2 } = anchorsForEdge(edge, na, nb);
            const midX = (p1.x + p2.x) / 2;
            const midY = (p1.y + p2.y) / 2;
            onChangeRef.current({
                nodes: curNodes,
                edges: curEdges.map((ed, i) =>
                    i === bendDragIndex ? { ...ed, bendMx: pt.x - midX, bendMy: pt.y - midY } : ed
                ),
            });
        };

        const up = () => setBendDragIndex(null);

        window.addEventListener('mousemove', move);
        window.addEventListener('mouseup', up);
        return () => {
            window.removeEventListener('mousemove', move);
            window.removeEventListener('mouseup', up);
        };
    }, [bendDragIndex, readOnly]);

    const addNode = () => {
        if (readOnly) return;
        const id = Date.now().toString();
        const n = nodes.length;
        onChange({
            nodes: [
                ...nodes,
                {
                    id,
                    x: 40 + (n % 3) * (NODE_W + 36),
                    y: 48 + Math.floor(n / 3) * (NODE_BOX_H + 40),
                    label: `Step ${n + 1}`,
                },
            ],
            edges,
        });
    };

    const autoLayout = () => {
        if (readOnly || nodes.length === 0) return;
        const cols = Math.max(1, Math.ceil(Math.sqrt(nodes.length)));
        const gapX = NODE_W + 40;
        const gapY = NODE_BOX_H + 48;
        const next = nodes.map((node, i) => ({
            ...node,
            x: 32 + (i % cols) * gapX,
            y: 32 + Math.floor(i / cols) * gapY,
        }));
        onChange({ nodes: next, edges });
    };

    const updateLabel = (id: string, label: string) => {
        if (readOnly) return;
        onChange({
            nodes: nodes.map((n) => (n.id === id ? { ...n, label } : n)),
            edges,
        });
    };

    const removeNode = (id: string) => {
        if (readOnly) return;
        if (linkFrom === id) setLinkFrom(null);
        onChange({
            nodes: nodes.filter((n) => n.id !== id),
            edges: edges.filter((e) => e.from !== id && e.to !== id),
        });
    };

    const removeEdge = (i: number) => {
        if (readOnly) return;
        onChange({ nodes, edges: edges.filter((_, idx) => idx !== i) });
    };

    const nodeById = (id: string) => nodes.find((n) => n.id === id);

    const canvasBoxClass =
        expanded && fillHeight
            ? edgeToEdge
                ? 'min-h-0 flex-1'
                : 'min-h-[min(86vh,1024px)] flex-1'
            : expanded
              ? 'min-h-[min(78vh,900px)] flex-1'
              : 'min-h-[420px]';

    const isEmpty = nodes.length === 0;
    const linkActive = Boolean(linkFrom);
    const ee = Boolean(edgeToEdge);
    /** Planning-room mirror: no nested card chrome — one surface with the parent panel */
    const mirror = Boolean(readOnly);

    return (
        <div
            className={`${ee || mirror ? 'gap-0 space-y-0' : 'space-y-4'} ${expanded ? 'flex min-h-0 min-w-0 flex-1 flex-col' : ''}`}
        >
            {!readOnly && (
                <div
                    className={`flex shrink-0 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between ${
                        ee
                            ? 'border-b border-zinc-800 bg-zinc-900/50 px-3 py-2 sm:px-4'
                            : 'rounded-lg border border-zinc-700 bg-zinc-900/40 px-4 py-3'
                    }`}
                >
                    <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
                        <span className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-zinc-600 bg-zinc-800 text-zinc-400">
                            <LayoutGrid className="h-4 w-4" aria-hidden />
                        </span>
                        <div className="min-w-0">
                            <p className="text-[11px] font-medium text-zinc-200">Plan canvas</p>
                            <p className="text-[10px] leading-snug text-zinc-500">
                                Drag the <span className="text-zinc-400">strip</span> to move a step.{' '}
                                <span className="text-zinc-400">Connect</span> then tap the target. Turn on{' '}
                                <span className="text-zinc-400">Hold &amp; move</span> to drag the map. Esc cancels linking.
                            </p>
                        </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                        <button
                            type="button"
                            onClick={addNode}
                            className="inline-flex items-center gap-2 rounded-md bg-teal-600 px-3 py-2 text-xs font-medium text-white hover:bg-teal-500"
                        >
                            <Plus className="h-3.5 w-3.5" aria-hidden />
                            Add step
                        </button>
                        <button
                            type="button"
                            onClick={autoLayout}
                            disabled={isEmpty}
                            className="inline-flex items-center gap-2 rounded-md border border-zinc-600 bg-zinc-800 px-3 py-2 text-xs font-medium text-zinc-200 hover:bg-zinc-700 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                            <LayoutGrid className="h-3.5 w-3.5" aria-hidden />
                            Auto layout
                        </button>
                        {linkActive && (
                            <button
                                type="button"
                                onClick={() => {
                                    setLinkFrom(null);
                                    setLinkHover(null);
                                }}
                                className="inline-flex items-center gap-1.5 rounded-md border border-rose-500/40 bg-rose-950/40 px-3 py-2 text-xs font-medium text-rose-200"
                            >
                                <X className="h-3.5 w-3.5" aria-hidden />
                                Cancel link
                            </button>
                        )}
                    </div>
                    <div className="flex flex-wrap items-center gap-2 text-[11px] text-zinc-500">
                        <span className="rounded border border-zinc-700 bg-zinc-800/80 px-2 py-0.5 tabular-nums text-zinc-400">
                            {nodes.length} step{nodes.length === 1 ? '' : 's'}
                        </span>
                        <span className="rounded border border-zinc-700 bg-zinc-800/80 px-2 py-0.5 tabular-nums text-zinc-400">
                            <Link2 className="mr-1 inline h-3 w-3 opacity-70" aria-hidden />
                            {edges.length} link{edges.length === 1 ? '' : 's'}
                        </span>
                    </div>
                </div>
            )}

            <div
                className={`flex shrink-0 flex-wrap items-center gap-2 ${
                    mirror
                        ? 'border-0 border-b border-[var(--border)] bg-transparent px-0 py-2'
                        : ee
                          ? 'border-b border-zinc-800 bg-zinc-900/40 px-3 py-2 sm:px-4'
                          : 'rounded-lg border border-zinc-700 bg-zinc-900/40 px-3 py-2 sm:px-4'
                }`}
            >
                <span
                    className={`text-[10px] font-semibold uppercase tracking-[0.14em] ${mirror ? 'text-[var(--text-secondary)]' : 'text-zinc-500'}`}
                >
                    {mirror ? 'Pan & zoom' : 'View'}
                </span>
                <div className="flex flex-wrap items-center gap-1">
                    <button
                        type="button"
                        onClick={zoomOut}
                        disabled={zoom <= ZOOM_MIN + 0.001}
                        className={`inline-flex h-8 w-8 items-center justify-center rounded-lg border text-[var(--text-primary)] disabled:cursor-not-allowed disabled:opacity-35 ${
                            mirror
                                ? 'border-[var(--border)] bg-[var(--bg-elevated)] hover:bg-[var(--bg-card)]'
                                : 'border-zinc-600 bg-zinc-800 text-zinc-300 hover:bg-zinc-700 hover:text-zinc-100'
                        }`}
                        title="Zoom out"
                        aria-label="Zoom out"
                    >
                        <ZoomOut className="h-4 w-4" aria-hidden />
                    </button>
                    <span
                        className={`min-w-[2.75rem] text-center text-[11px] tabular-nums ${mirror ? 'text-[var(--text-secondary)]' : 'text-zinc-400'}`}
                    >
                        {Math.round(zoom * 100)}%
                    </span>
                    <button
                        type="button"
                        onClick={zoomIn}
                        disabled={zoom >= ZOOM_MAX - 0.001}
                        className={`inline-flex h-8 w-8 items-center justify-center rounded-lg border disabled:cursor-not-allowed disabled:opacity-35 ${
                            mirror
                                ? 'border-[var(--border)] bg-[var(--bg-elevated)] text-[var(--text-primary)] hover:bg-[var(--bg-card)]'
                                : 'border-zinc-600 bg-zinc-800 text-zinc-300 hover:bg-zinc-700 hover:text-zinc-100'
                        }`}
                        title="Zoom in"
                        aria-label="Zoom in"
                    >
                        <ZoomIn className="h-4 w-4" aria-hidden />
                    </button>
                    <button
                        type="button"
                        onClick={resetView}
                        className={`inline-flex h-8 items-center gap-1 rounded-lg border px-2 text-[10px] font-medium ${
                            mirror
                                ? 'border-[var(--border)] bg-[var(--bg-elevated)] text-[var(--text-secondary)] hover:bg-[var(--bg-card)] hover:text-[var(--text-primary)]'
                                : 'border-zinc-600 bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-zinc-200'
                        }`}
                        title="Reset zoom and pan"
                        aria-label="Reset zoom and pan"
                    >
                        <RotateCcw className="h-3.5 w-3.5" aria-hidden />
                        Reset
                    </button>
                    <button
                        type="button"
                        onClick={() => setHoldPanMode((v) => !v)}
                        aria-pressed={holdPanMode}
                        className={`inline-flex h-8 items-center gap-1 rounded-lg border px-2 text-[10px] font-medium transition ${
                            holdPanMode
                                ? mirror
                                    ? 'border-violet-500/45 bg-violet-500/15 text-violet-100'
                                    : 'border-teal-500/50 bg-teal-950/50 text-teal-200'
                                : mirror
                                  ? 'border-[var(--border)] bg-[var(--bg-elevated)] text-[var(--text-secondary)] hover:bg-[var(--bg-card)] hover:text-[var(--text-primary)]'
                                  : 'border-zinc-600 bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-zinc-200'
                        }`}
                        title="Hold and drag on empty map to pan"
                        aria-label="Hold and move: drag the map by pressing on empty space"
                    >
                        <Hand className="h-3.5 w-3.5" aria-hidden />
                        Hold &amp; move
                    </button>
                </div>
                <span
                    className={`hidden h-4 w-px sm:block ${mirror ? 'bg-[var(--border)]' : 'bg-zinc-700'}`}
                    aria-hidden
                />
                <div
                    className={`flex items-center gap-0.5 rounded-lg p-0.5 ${
                        mirror
                            ? 'border border-[var(--border)] bg-[var(--bg-elevated)]/80'
                            : 'border border-zinc-700 bg-zinc-800/50'
                    }`}
                >
                    <button
                        type="button"
                        onClick={() => panBy(-PAN_STEP, 0)}
                        className={`inline-flex h-7 w-7 items-center justify-center rounded-md ${
                            mirror
                                ? 'text-[var(--text-secondary)] hover:bg-[var(--bg-card)] hover:text-[var(--text-primary)]'
                                : 'text-zinc-400 hover:bg-zinc-700 hover:text-zinc-100'
                        }`}
                        title="Pan left"
                        aria-label="Pan canvas left"
                    >
                        <ArrowLeft className="h-3.5 w-3.5" aria-hidden />
                    </button>
                    <button
                        type="button"
                        onClick={() => panBy(0, -PAN_STEP)}
                        className={`inline-flex h-7 w-7 items-center justify-center rounded-md ${
                            mirror
                                ? 'text-[var(--text-secondary)] hover:bg-[var(--bg-card)] hover:text-[var(--text-primary)]'
                                : 'text-zinc-400 hover:bg-zinc-700 hover:text-zinc-100'
                        }`}
                        title="Pan up"
                        aria-label="Pan canvas up"
                    >
                        <ArrowUp className="h-3.5 w-3.5" aria-hidden />
                    </button>
                    <button
                        type="button"
                        onClick={() => panBy(0, PAN_STEP)}
                        className={`inline-flex h-7 w-7 items-center justify-center rounded-md ${
                            mirror
                                ? 'text-[var(--text-secondary)] hover:bg-[var(--bg-card)] hover:text-[var(--text-primary)]'
                                : 'text-zinc-400 hover:bg-zinc-700 hover:text-zinc-100'
                        }`}
                        title="Pan down"
                        aria-label="Pan canvas down"
                    >
                        <ArrowDown className="h-3.5 w-3.5" aria-hidden />
                    </button>
                    <button
                        type="button"
                        onClick={() => panBy(PAN_STEP, 0)}
                        className={`inline-flex h-7 w-7 items-center justify-center rounded-md ${
                            mirror
                                ? 'text-[var(--text-secondary)] hover:bg-[var(--bg-card)] hover:text-[var(--text-primary)]'
                                : 'text-zinc-400 hover:bg-zinc-700 hover:text-zinc-100'
                        }`}
                        title="Pan right"
                        aria-label="Pan canvas right"
                    >
                        <ArrowRight className="h-3.5 w-3.5" aria-hidden />
                    </button>
                </div>
                <p
                    className={`ml-auto hidden text-[10px] sm:block ${mirror ? 'text-[var(--text-secondary)]' : 'text-zinc-600'}`}
                >
                    Ctrl / ⌘ + scroll to zoom
                </p>
            </div>

            <div
                ref={wrapRef}
                onPointerDown={onCanvasPointerDown}
                className={`relative w-full min-h-0 overflow-auto transition-colors ${
                    holdPanMode ? (canvasPanning ? 'cursor-grabbing' : 'cursor-grab') : ''
                } ${
                    mirror
                        ? 'rounded-xl border-0 ring-1 ring-inset ring-violet-500/10'
                        : ee
                          ? `rounded-none border-0 ${linkActive ? 'ring-1 ring-inset ring-teal-600/25' : ''}`
                          : `rounded-lg border ${linkActive ? 'border-teal-600/40' : 'border-zinc-700'}`
                } ${canvasBoxClass}`}
                style={{
                    background: mirror ? 'transparent' : ee ? '#0A0A0B' : '#111113',
                }}
            >
                <div
                    className="relative shrink-0"
                    style={{
                        width: Math.max(1, Math.ceil(surfaceW * zoom)),
                        height: Math.max(1, Math.ceil(surfaceH * zoom)),
                    }}
                >
                    <div
                        className="absolute left-0 top-0 origin-top-left will-change-transform"
                        style={{
                            width: surfaceW,
                            height: surfaceH,
                            transform: `scale(${zoom})`,
                        }}
                    >
                <div
                    className="pointer-events-none absolute inset-0 opacity-[0.22]"
                    style={{
                        backgroundImage: mirror
                            ? `linear-gradient(rgba(167,139,250,0.07) 1px, transparent 1px), linear-gradient(90deg, rgba(167,139,250,0.07) 1px, transparent 1px)`
                            : `linear-gradient(rgba(255,255,255,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.04) 1px, transparent 1px)`,
                        backgroundSize: '32px 32px',
                    }}
                />

                <svg className="pointer-events-none absolute inset-0 z-[2] h-full w-full">
                    <defs>
                        <marker id={markerId} markerWidth="5" markerHeight="5" refX="4" refY="2.5" orient="auto" markerUnits="userSpaceOnUse">
                            <path
                                d="M0,0 L5,2.5 L0,5 Z"
                                fill={mirror ? 'rgb(167 139 250 / 0.78)' : 'rgb(94 234 212 / 0.75)'}
                            />
                        </marker>
                    </defs>
                    {edges.map((e, i) => {
                        const a = nodeById(e.from);
                        const b = nodeById(e.to);
                        if (!a || !b) return null;
                        const { p1, p2 } = anchorsForEdge(e, a, b);
                        const { bendMx, bendMy } = getBendForEdge(e, p1, p2);
                        const d = quadraticEdgePath(p1, p2, bendMx, bendMy);
                        return (
                            <path
                                key={`${e.from}-${e.to}-${i}`}
                                d={d}
                                fill="none"
                                stroke={mirror ? 'rgba(167, 139, 250, 0.4)' : 'rgb(94 234 212 / 0.38)'}
                                strokeWidth="1.25"
                                strokeLinecap="round"
                                markerEnd={`url(#${markerId})`}
                            />
                        );
                    })}
                </svg>

                {nodes.map((n, index) => {
                    const isDragging = dragId === n.id;
                    const armed = linkFrom === n.id;
                    const isTarget = linkHover === n.id;
                    const edgeTint = STEP_EDGE[index % STEP_EDGE.length];

                    return (
                        <div
                            key={n.id}
                            data-flow-node={n.id}
                            className={`group/node absolute z-[10] overflow-hidden rounded-md border border-zinc-600 bg-zinc-900 ${edgeTint} border-l-2 ${
                                isDragging
                                    ? 'z-[30] border-zinc-500'
                                    : armed
                                      ? 'border-teal-500/70'
                                      : isTarget
                                        ? 'border-violet-500/60'
                                        : ''
                            }`}
                            style={{ left: n.x, top: n.y, width: NODE_W, minHeight: NODE_BOX_H }}
                        >
                            {!readOnly && (
                                <button
                                    type="button"
                                    aria-label={`Drag to move: ${n.label || 'step'}`}
                                    title="Drag to move"
                                    onPointerDown={(e) => beginDrag(e, n.id)}
                                    onPointerUp={endDrag}
                                    onPointerCancel={endDrag}
                                    className="flex w-full cursor-grab touch-none items-center justify-center gap-2 border-b border-zinc-700 bg-zinc-800/60 py-1.5 text-[10px] font-medium uppercase tracking-[0.08em] text-zinc-500 active:cursor-grabbing hover:bg-zinc-800"
                                    style={{ height: RAIL_H }}
                                >
                                    <GripHorizontal className="h-4 w-4 text-zinc-500" aria-hidden />
                                    Move
                                </button>
                            )}

                            <div className="flex items-stretch">
                                <div className="flex w-9 shrink-0 items-center justify-center border-r border-zinc-700 bg-zinc-800/40 text-[11px] font-semibold tabular-nums text-zinc-500">
                                    {index + 1}
                                </div>
                                <div className="relative flex min-w-0 flex-1 flex-col gap-1 px-2.5 py-2">
                                    <label className="sr-only">Step label</label>
                                    <input
                                        value={n.label}
                                        readOnly={readOnly}
                                        onChange={(e) => updateLabel(n.id, e.target.value)}
                                        className="min-w-0 border-0 bg-transparent text-[13px] font-medium leading-tight text-zinc-100 placeholder:text-zinc-600 outline-none"
                                        placeholder="Name this step"
                                    />
                                    {!readOnly && (
                                        <div className="flex items-center gap-1.5">
                                            <button
                                                type="button"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    if (linkFrom && linkFrom !== n.id) {
                                                        addEdgeIfAbsent(linkFrom, n.id);
                                                        setLinkFrom(null);
                                                        setLinkHover(null);
                                                        return;
                                                    }
                                                    setLinkFrom((prev) => (prev === n.id ? null : n.id));
                                                    setLinkHover(null);
                                                }}
                                                className={`inline-flex items-center gap-1 rounded border px-2 py-0.5 text-[10px] font-medium ${
                                                    armed
                                                        ? 'border-teal-500/50 bg-teal-950/40 text-teal-200'
                                                        : 'border-zinc-600 bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
                                                }`}
                                            >
                                                <Link2 className="h-3 w-3" aria-hidden />
                                                {armed ? 'Tap target…' : 'Connect'}
                                            </button>
                                            <button
                                                type="button"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    removeNode(n.id);
                                                }}
                                                className="ml-auto rounded p-1 text-zinc-500 hover:bg-zinc-800 hover:text-rose-400"
                                                title="Remove step"
                                                aria-label="Remove step"
                                            >
                                                <Trash2 className="h-3.5 w-3.5" aria-hidden />
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    );
                })}

                {readOnly && isEmpty && (
                    <div className="pointer-events-none absolute inset-0 z-[25] flex items-center justify-center p-6">
                        <p className="text-sm text-zinc-500">No strategy flow steps yet.</p>
                    </div>
                )}

                {!readOnly && isEmpty && (
                    <div className="pointer-events-none absolute inset-0 z-[25] flex items-center justify-center p-6">
                        <div className="pointer-events-auto max-w-md rounded-lg border border-zinc-700 bg-zinc-900 px-8 py-8 text-center">
                            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-md border border-zinc-600 bg-zinc-800">
                                <LayoutGrid className="h-6 w-6 text-zinc-400" aria-hidden />
                            </div>
                            <p className="text-base font-medium text-zinc-200">Map your plan</p>
                            <p className="mt-2 text-sm leading-relaxed text-zinc-500">
                                Add steps, arrange on the canvas, then use{' '}
                                <span className="text-zinc-400">Connect</span> for dependencies.
                            </p>
                            <button
                                type="button"
                                onClick={addNode}
                                className="mt-5 inline-flex items-center justify-center gap-2 rounded-md bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-500"
                            >
                                <Plus className="h-4 w-4" aria-hidden />
                                First step
                            </button>
                        </div>
                    </div>
                )}

                {!readOnly && (
                    <div className="pointer-events-none absolute inset-0 z-[18]">
                        {edges.map((e, i) => {
                            const a = nodeById(e.from);
                            const b = nodeById(e.to);
                            if (!a || !b) return null;
                            const { p1, p2 } = anchorsForEdge(e, a, b);
                            const { bendMx, bendMy } = getBendForEdge(e, p1, p2);
                            const midX = (p1.x + p2.x) / 2;
                            const midY = (p1.y + p2.y) / 2;
                            const hx = midX + bendMx;
                            const hy = midY + bendMy;
                            const isActive = bendDragIndex === i;
                            return (
                                <button
                                    key={`bend-${e.from}-${e.to}-${i}`}
                                    type="button"
                                    aria-label="Drag to bend line"
                                    title="Bend line"
                                    className={`pointer-events-auto absolute h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full border border-teal-500/60 bg-zinc-900 focus:outline-none ${
                                        isActive ? 'cursor-grabbing border-teal-400' : 'cursor-grab hover:border-teal-400/90'
                                    }`}
                                    style={{ left: hx, top: hy }}
                                    onMouseDown={(ev) => {
                                        ev.stopPropagation();
                                        ev.preventDefault();
                                        setBendDragIndex(i);
                                    }}
                                />
                            );
                        })}
                    </div>
                )}
                    </div>
                </div>
            </div>

            {edges.length > 0 && (
                <div
                    className={`flex flex-wrap gap-2 ${
                        mirror
                            ? 'border-0 border-t border-[var(--border)] bg-transparent px-0 py-2'
                            : ee
                              ? 'border-t border-zinc-800 bg-[#0A0A0B] px-3 py-2 sm:px-4'
                              : ''
                    } ${expanded && fillHeight ? 'max-h-28 shrink-0 overflow-y-auto' : ''}`}
                >
                    {edges.map((e, i) => (
                        <div
                            key={i}
                            className={`inline-flex max-w-full items-center gap-2 rounded-lg border px-2.5 py-1 text-[10px] ${
                                mirror
                                    ? 'border-[var(--border)] bg-[var(--bg-elevated)]/90 text-[var(--text-secondary)]'
                                    : 'border-white/[0.08] bg-white/[0.04] px-3 py-1.5 text-[11px] text-zinc-400'
                            }`}
                        >
                            <span
                                className={`min-w-0 truncate ${mirror ? 'text-[var(--text-primary)]' : 'text-zinc-300'}`}
                            >
                                {nodeById(e.from)?.label || e.from}
                                <span className={`mx-1 ${mirror ? 'text-[var(--text-secondary)]' : 'text-zinc-600'}`}>→</span>
                                {nodeById(e.to)?.label || e.to}
                            </span>
                            {!readOnly && (
                                <button
                                    type="button"
                                    onClick={() => removeEdge(i)}
                                    className="shrink-0 rounded-lg p-0.5 text-zinc-500 hover:bg-rose-500/15 hover:text-rose-400"
                                    aria-label="Remove link"
                                >
                                    <Trash2 className="h-3 w-3" />
                                </button>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
