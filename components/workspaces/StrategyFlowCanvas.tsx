'use client';

import React, { useState, useCallback, useRef, useEffect, useId } from 'react';
import type { FlowEdge, FlowNode } from '@/lib/strategyDoc';
import { Plus, Trash2, GripVertical, LayoutGrid, Link2 } from 'lucide-react';

const NODE_W = 220;
/** Used for drag bounds & line anchors — keep in sync with card layout */
const NODE_H = 52;
const ANCHOR_Y = NODE_H / 2;

/** Nearest point on the node border to the cursor (local node coords). */
function clampPointToBorder(lx: number, ly: number, w: number, h: number): { x: number; y: number } {
    const cx = Math.max(0, Math.min(w, lx));
    const cy = Math.max(0, Math.min(h, ly));
    const dTop = cy;
    const dBottom = h - cy;
    const dLeft = cx;
    const dRight = w - cx;
    const m = Math.min(dTop, dBottom, dLeft, dRight);
    if (m === dTop) return { x: cx, y: 0 };
    if (m === dBottom) return { x: cx, y: h };
    if (m === dLeft) return { x: 0, y: cy };
    return { x: w, y: cy };
}

/** Smooth curve between any two anchor points (direction-aware) — used for live preview while wiring. */
function cubicEdgePath(p1: { x: number; y: number }, p2: { x: number; y: number }) {
    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    const dist = Math.sqrt(dx * dx + dy * dy) || 1;
    const pull = Math.min(140, Math.max(40, dist * 0.38));
    const ux = dx / dist;
    const uy = dy / dist;
    const c1x = p1.x + ux * pull;
    const c1y = p1.y + uy * pull;
    const c2x = p2.x - ux * pull;
    const c2y = p2.y - uy * pull;
    return `M ${p1.x} ${p1.y} C ${c1x} ${c1y}, ${c2x} ${c2y}, ${p2.x} ${p2.y}`;
}

/** Perpendicular bulge along the chord — default curve when bend is not stored yet. */
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

/** Quadratic Bézier: control point = chord midpoint + bend offset */
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
};

/** Resolve which flow node (if any) sits under the viewport point — works anywhere inside the box */
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

export function StrategyFlowCanvas({ nodes, edges, onChange, readOnly, expanded, fillHeight }: Props) {
    const uid = useId();
    const safeSvgId = uid.replace(/:/g, '');
    const markerId = `arrow-${safeSvgId}`;
    const [dragId, setDragId] = useState<string | null>(null);
    const offset = useRef({ x: 0, y: 0 });
    const wrapRef = useRef<HTMLDivElement>(null);

    const [connectFrom, setConnectFrom] = useState<string | null>(null);
    /** Border anchor on source node (local px) while dragging a link */
    const [connectFromLocal, setConnectFromLocal] = useState<{ x: number; y: number } | null>(null);
    const [connectPos, setConnectPos] = useState<{ x: number; y: number } | null>(null);
    /** Node under cursor while wiring — live drop hint */
    const [connectHoverTarget, setConnectHoverTarget] = useState<string | null>(null);

    const getCanvasPoint = useCallback((clientX: number, clientY: number) => {
        if (!wrapRef.current) return null;
        const rect = wrapRef.current.getBoundingClientRect();
        return {
            x: clientX - rect.left,
            y: clientY - rect.top,
        };
    }, []);

    const nodesRef = useRef(nodes);
    const edgesRef = useRef(edges);
    const onChangeRef = useRef(onChange);
    nodesRef.current = nodes;
    edgesRef.current = edges;
    onChangeRef.current = onChange;
    const connectDragRef = useRef<{ fromId: string; fromLocal: { x: number; y: number } } | null>(null);

    /** Dragging the bend handle on an edge (by edge index) */
    const [bendDragIndex, setBendDragIndex] = useState<number | null>(null);

    const onMoveNodeStart = (e: React.MouseEvent, id: string) => {
        if (readOnly) return;
        const node = nodes.find((n) => n.id === id);
        if (!node || !wrapRef.current) return;
        const rect = wrapRef.current.getBoundingClientRect();
        offset.current = {
            x: e.clientX - rect.left - node.x,
            y: e.clientY - rect.top - node.y,
        };
        setDragId(id);
    };

    const onMouseMove = useCallback(
        (e: MouseEvent) => {
            if (!dragId || !wrapRef.current) return;
            const rect = wrapRef.current.getBoundingClientRect();
            const x = Math.max(0, Math.min(rect.width - NODE_W, e.clientX - rect.left - offset.current.x));
            const y = Math.max(0, Math.min(rect.height - NODE_H, e.clientY - rect.top - offset.current.y));
            onChange({
                nodes: nodes.map((n) => (n.id === dragId ? { ...n, x, y } : n)),
                edges,
            });
        },
        [dragId, nodes, edges, onChange]
    );

    const onMouseUpMove = useCallback(() => setDragId(null), []);

    useEffect(() => {
        if (!dragId) return;
        window.addEventListener('mousemove', onMouseMove);
        window.addEventListener('mouseup', onMouseUpMove);
        return () => {
            window.removeEventListener('mousemove', onMouseMove);
            window.removeEventListener('mouseup', onMouseUpMove);
        };
    }, [dragId, onMouseMove, onMouseUpMove]);

    const beginConnect = useCallback(
        (e: React.MouseEvent, fromId: string) => {
            if (readOnly) return;
            e.stopPropagation();
            e.preventDefault();
            const wrap = wrapRef.current;
            const n = nodesRef.current.find((x) => x.id === fromId);
            if (!wrap || !n) return;
            const rect = wrap.getBoundingClientRect();
            const fromLocal = clampPointToBorder(
                e.clientX - rect.left - n.x,
                e.clientY - rect.top - n.y,
                NODE_W,
                NODE_H
            );
            const pt = getCanvasPoint(e.clientX, e.clientY);
            if (!pt) return;
            connectDragRef.current = { fromId, fromLocal };
            setConnectFrom(fromId);
            setConnectFromLocal(fromLocal);
            setConnectPos(pt);
        },
        [readOnly, getCanvasPoint]
    );

    useEffect(() => {
        if (!connectFrom) return;

        const move = (e: MouseEvent) => {
            const pt = getCanvasPoint(e.clientX, e.clientY);
            if (pt) setConnectPos(pt);
            const wrap = wrapRef.current;
            const pending = connectDragRef.current;
            if (wrap && pending) {
                const ids = nodesRef.current.map((n) => n.id);
                const hit = findNodeIdAtPoint(e.clientX, e.clientY, wrap, ids);
                setConnectHoverTarget(hit && hit !== pending.fromId ? hit : null);
            }
        };

        const up = (e: MouseEvent) => {
            const pending = connectDragRef.current;
            connectDragRef.current = null;
            setConnectFrom(null);
            setConnectFromLocal(null);
            setConnectPos(null);
            setConnectHoverTarget(null);

            const wrap = wrapRef.current;
            if (!pending || !wrap) return;

            const { fromId, fromLocal } = pending;
            const ids = nodesRef.current.map((n) => n.id);
            const toId = findNodeIdAtPoint(e.clientX, e.clientY, wrap, ids);

            if (!toId || toId === fromId) return;
            const curEdges = edgesRef.current;
            const curNodes = nodesRef.current;
            if (curEdges.some((x) => x.from === fromId && x.to === toId)) return;
            const toNode = curNodes.find((n) => n.id === toId);
            if (!toNode) return;
            const rect = wrap.getBoundingClientRect();
            const toLocal = clampPointToBorder(
                e.clientX - rect.left - toNode.x,
                e.clientY - rect.top - toNode.y,
                NODE_W,
                NODE_H
            );
            const fromNode = curNodes.find((n) => n.id === fromId)!;
            const p1 = { x: fromNode.x + fromLocal.x, y: fromNode.y + fromLocal.y };
            const p2 = { x: toNode.x + toLocal.x, y: toNode.y + toLocal.y };
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
        };

        const key = (ev: KeyboardEvent) => {
            if (ev.key === 'Escape') {
                connectDragRef.current = null;
                setConnectFrom(null);
                setConnectFromLocal(null);
                setConnectPos(null);
                setConnectHoverTarget(null);
            }
        };

        window.addEventListener('mousemove', move);
        window.addEventListener('mouseup', up);
        window.addEventListener('keydown', key);
        return () => {
            window.removeEventListener('mousemove', move);
            window.removeEventListener('mouseup', up);
            window.removeEventListener('keydown', key);
        };
    }, [connectFrom, getCanvasPoint]);

    useEffect(() => {
        if (bendDragIndex === null || readOnly) return;

        const move = (e: MouseEvent) => {
            const pt = getCanvasPoint(e.clientX, e.clientY);
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
            const bendMx = pt.x - midX;
            const bendMy = pt.y - midY;
            onChangeRef.current({
                nodes: curNodes,
                edges: curEdges.map((ed, i) => (i === bendDragIndex ? { ...ed, bendMx, bendMy } : ed)),
            });
        };

        const up = () => setBendDragIndex(null);

        window.addEventListener('mousemove', move);
        window.addEventListener('mouseup', up);
        return () => {
            window.removeEventListener('mousemove', move);
            window.removeEventListener('mouseup', up);
        };
    }, [bendDragIndex, readOnly, getCanvasPoint]);

    const addNode = () => {
        if (readOnly) return;
        const id = Date.now().toString();
        const n = nodes.length;
        onChange({
            nodes: [
                ...nodes,
                {
                    id,
                    x: 36 + (n % 4) * 200,
                    y: 36 + Math.floor(n / 4) * 88,
                    label: `Step ${n + 1}`,
                },
            ],
            edges,
        });
    };

    const autoLayout = () => {
        if (readOnly || nodes.length === 0) return;
        const cols = Math.max(1, Math.ceil(Math.sqrt(nodes.length)));
        const gapX = NODE_W + 32;
        const gapY = 96;
        const next = nodes.map((node, i) => ({
            ...node,
            x: 28 + (i % cols) * gapX,
            y: 28 + Math.floor(i / cols) * gapY,
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
        expanded && fillHeight ? 'min-h-0 flex-1' : expanded ? 'min-h-[min(72vh,820px)] flex-1' : 'min-h-[420px]';

    const gradStrokeId = `edge-grad-${safeSvgId}`;
    const markerFillId = `marker-fill-${safeSvgId}`;

    const previewPath =
        connectFrom && connectPos && connectFromLocal && nodeById(connectFrom)
            ? (() => {
                  const n = nodeById(connectFrom)!;
                  const a = { x: n.x + connectFromLocal.x, y: n.y + connectFromLocal.y };
                  const d = cubicEdgePath(a, connectPos);
                  return (
                      <path
                          d={d}
                          fill="none"
                          stroke={`url(#${gradStrokeId})`}
                          strokeWidth="1.15"
                          strokeLinecap="round"
                          opacity={0.72}
                      />
                  );
              })()
            : null;

    const isEmpty = nodes.length === 0;

    return (
        <div className={`space-y-3 ${expanded ? 'flex min-h-0 flex-1 flex-col' : ''}`}>
            {!readOnly && (
                <div className="flex shrink-0 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex flex-wrap items-center gap-2">
                        <button
                            type="button"
                            onClick={addNode}
                            className="inline-flex items-center gap-2 rounded-lg border border-brand-teal/35 bg-brand-card px-4 py-2 text-xs font-semibold text-zinc-100 shadow-sm shadow-black/20 transition hover:border-brand-teal/55 hover:bg-brand-input"
                        >
                            <Plus className="h-3.5 w-3.5 text-brand-teal" aria-hidden />
                            Add step
                        </button>
                        <button
                            type="button"
                            onClick={autoLayout}
                            disabled={isEmpty}
                            className="inline-flex items-center gap-2 rounded-lg border border-brand-border bg-brand-bg px-3 py-2 text-xs font-semibold text-zinc-300 transition hover:border-brand-teal/25 hover:text-brand-teal disabled:cursor-not-allowed disabled:opacity-40"
                        >
                            <LayoutGrid className="h-3.5 w-3.5" aria-hidden />
                            Tidy grid
                        </button>
                    </div>
                    <div className="flex flex-wrap items-center gap-3 text-[11px] text-zinc-500">
                        <span className="inline-flex items-center gap-1.5 rounded-md border border-brand-border bg-brand-panel/80 px-2 py-1 tabular-nums text-zinc-400">
                            {nodes.length} step{nodes.length === 1 ? '' : 's'}
                        </span>
                        <span className="inline-flex items-center gap-1.5 rounded-md border border-brand-border bg-brand-panel/80 px-2 py-1 tabular-nums text-zinc-400">
                            <Link2 className="h-3 w-3 text-brand-purple/90" aria-hidden />
                            {edges.length} link{edges.length === 1 ? '' : 's'}
                        </span>
                    </div>
                </div>
            )}

            {!readOnly && (
                <p className="text-[11px] leading-relaxed text-zinc-500">
                    <span className="font-medium text-brand-teal/90">Link:</span> drag from a step&apos;s surface (not the grip or label) onto
                    another step. <span className="font-medium text-brand-purple/90">Bend:</span> drag the dot mid-line.
                </p>
            )}

            <div
                ref={wrapRef}
                className={`relative w-full cursor-default overflow-hidden rounded-xl border transition-colors duration-300 ${
                    connectFrom
                        ? 'border-brand-teal/45 bg-[#0a0d10]'
                        : 'border-brand-border bg-[#0c1014]'
                } ${connectFrom ? 'cursor-crosshair' : ''} ${canvasBoxClass}`}
                style={{
                    backgroundImage: `radial-gradient(ellipse 90% 55% at 50% 35%, rgba(45, 226, 211, 0.07), transparent 58%), radial-gradient(ellipse 60% 40% at 80% 80%, rgba(168, 85, 247, 0.05), transparent 50%), linear-gradient(rgba(42,48,54,0.55) 1px, transparent 1px), linear-gradient(90deg, rgba(42,48,54,0.55) 1px, transparent 1px)`,
                    backgroundSize: '100% 100%, 100% 100%, 32px 32px, 32px 32px',
                }}
            >
                <div
                    className="pointer-events-none absolute inset-0 z-[1] opacity-[0.14]"
                    style={{
                        backgroundImage: `radial-gradient(circle at 1px 1px, rgba(45,226,211,0.4) 1px, transparent 0)`,
                        backgroundSize: '22px 22px',
                    }}
                />
                {/* Edges behind nodes */}
                <svg className="pointer-events-none absolute inset-0 z-[2] h-full w-full">
                    <defs>
                        <linearGradient id={gradStrokeId} x1="0%" y1="0%" x2="100%" y2="100%">
                            <stop offset="0%" stopColor="#2de2d3" stopOpacity="1" />
                            <stop offset="55%" stopColor="#5eead4" stopOpacity="0.95" />
                            <stop offset="100%" stopColor="#a855f7" stopOpacity="1" />
                        </linearGradient>
                        <linearGradient id={markerFillId} x1="0" y1="0" x2="1" y2="1">
                            <stop offset="0%" stopColor="#2de2d3" />
                            <stop offset="100%" stopColor="#a855f7" />
                        </linearGradient>
                        <marker id={markerId} markerWidth="5" markerHeight="5" refX="4" refY="2.5" orient="auto" markerUnits="userSpaceOnUse">
                            <path d="M0,0 L5,2.5 L0,5 Z" fill={`url(#${markerFillId})`} />
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
                            <g key={`${e.from}-${e.to}-${i}`}>
                                <path
                                    d={d}
                                    fill="none"
                                    stroke="rgba(42,48,54,0.9)"
                                    strokeWidth="0.85"
                                    strokeLinecap="round"
                                    opacity={0.75}
                                />
                                <path
                                    d={d}
                                    fill="none"
                                    stroke={`url(#${gradStrokeId})`}
                                    strokeWidth="1.35"
                                    strokeLinecap="round"
                                    markerEnd={`url(#${markerId})`}
                                />
                            </g>
                        );
                    })}
                    {previewPath}
                </svg>

                {nodes.map((n, index) => {
                    const isDragging = dragId === n.id;
                    const isLinkSource = connectFrom === n.id;
                    const isLinkTarget = connectHoverTarget === n.id;
                    return (
                        <div
                            key={n.id}
                            data-flow-node={n.id}
                            onMouseDown={(e) => {
                                if (readOnly) return;
                                const t = e.target as HTMLElement;
                                if (t.closest('button') || t.closest('input') || t.closest('textarea')) return;
                                beginConnect(e, n.id);
                            }}
                            className={`group/node absolute z-[10] flex items-stretch overflow-hidden rounded-xl border bg-brand-card/95 shadow-lg shadow-black/30 backdrop-blur-sm transition-[box-shadow,transform,border-color] duration-200 will-change-transform ${
                                isDragging
                                    ? 'z-[30] scale-[1.02] border-brand-teal/50 shadow-xl shadow-black/40'
                                    : isLinkSource
                                      ? 'border-brand-teal/60'
                                      : isLinkTarget
                                        ? 'border-brand-purple/55'
                                        : 'border-brand-border hover:border-brand-teal/25'
                            }`}
                            style={{ left: n.x, top: n.y, width: NODE_W, minHeight: NODE_H }}
                        >
                            <span
                                className="pointer-events-none absolute left-0 top-0 h-full w-1 bg-gradient-to-b from-brand-teal/80 to-brand-purple/50"
                                aria-hidden
                            />
                            {!readOnly && (
                                <button
                                    type="button"
                                    aria-label="Drag to move step"
                                    title="Drag to move"
                                    className="flex w-8 shrink-0 cursor-grab items-center justify-center border-r border-brand-border bg-brand-bg/80 text-zinc-500 active:cursor-grabbing hover:text-brand-teal"
                                    onMouseDown={(e) => onMoveNodeStart(e, n.id)}
                                >
                                    <GripVertical className="h-4 w-4" aria-hidden />
                                </button>
                            )}
                            {readOnly && (
                                <div className="flex w-6 shrink-0 items-center justify-center border-r border-brand-border text-[10px] tabular-nums text-zinc-500">
                                    {index + 1}
                                </div>
                            )}

                            <div className="relative flex min-w-0 flex-1 items-center gap-2 px-2.5 py-2 pl-3">
                                <label className="sr-only">Step label</label>
                                {!readOnly && (
                                    <span className="shrink-0 rounded bg-brand-input px-1.5 py-0.5 text-[10px] font-semibold tabular-nums text-brand-teal/90">
                                        {index + 1}
                                    </span>
                                )}
                                <input
                                    value={n.label}
                                    readOnly={readOnly}
                                    onChange={(e) => updateLabel(n.id, e.target.value)}
                                    onMouseDown={(e) => e.stopPropagation()}
                                    className="min-w-0 flex-1 border-0 bg-transparent text-[13px] font-medium leading-tight text-zinc-100 placeholder:text-zinc-600 outline-none"
                                    placeholder="Step name"
                                />
                                {!readOnly && (
                                    <button
                                        type="button"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            removeNode(n.id);
                                        }}
                                        className="shrink-0 rounded p-1 text-zinc-600 opacity-0 transition hover:bg-brand-input hover:text-rose-400 group-hover/node:opacity-100"
                                        title="Remove step"
                                        aria-label="Remove step"
                                    >
                                        <Trash2 className="h-3.5 w-3.5" aria-hidden />
                                    </button>
                                )}
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
                        <div className="pointer-events-auto max-w-sm rounded-2xl border border-brand-border bg-brand-panel/95 px-6 py-8 text-center shadow-xl shadow-black/40 backdrop-blur-md">
                            <p className="text-sm font-semibold text-zinc-100">Start your strategy flow</p>
                            <p className="mt-2 text-xs leading-relaxed text-zinc-500">
                                Add steps for each milestone or decision, then link them in order. Use <span className="text-brand-teal">Tidy grid</span>{' '}
                                any time to neaten the canvas.
                            </p>
                            <button
                                type="button"
                                onClick={addNode}
                                className="mt-5 inline-flex items-center justify-center gap-2 rounded-lg border border-brand-teal/40 bg-brand-card px-4 py-2.5 text-xs font-semibold text-brand-teal transition hover:bg-brand-input"
                            >
                                <Plus className="h-4 w-4" aria-hidden />
                                Add first step
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
                                    className={`pointer-events-auto absolute h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-brand-teal bg-[#0c1014] shadow-md shadow-black/30 transition hover:scale-110 hover:border-brand-purple/80 focus:outline-none focus:ring-2 focus:ring-brand-purple/35 ${
                                        isActive ? 'scale-125 cursor-grabbing ring-2 ring-brand-purple/50' : 'cursor-grab'
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

            {edges.length > 0 && (
                <div
                    className={`flex flex-wrap gap-2 ${expanded && fillHeight ? 'max-h-24 shrink-0 overflow-y-auto' : ''}`}
                >
                    {edges.map((e, i) => (
                        <div
                            key={i}
                            className="inline-flex max-w-full items-center gap-2 rounded-full border border-brand-border bg-brand-panel/90 px-3 py-1 text-[11px] text-zinc-400"
                        >
                            <span className="min-w-0 truncate text-zinc-300">
                                {nodeById(e.from)?.label || e.from}
                                <span className="mx-1 text-brand-teal/80">→</span>
                                {nodeById(e.to)?.label || e.to}
                            </span>
                            {!readOnly && (
                                <button
                                    type="button"
                                    onClick={() => removeEdge(i)}
                                    className="shrink-0 rounded-full p-0.5 text-zinc-500 hover:bg-brand-input hover:text-rose-400"
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
