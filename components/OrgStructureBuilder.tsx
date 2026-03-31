'use client';

import React, { useState, useEffect } from 'react';
import { useOffice } from '@/lib/OfficeContext';
import { Network, Plus, Trash2, User, ChevronDown, ChevronRight, Wand2, Save, Users, AlertCircle } from 'lucide-react';
import { OrgNode } from '@/lib/db';

export function OrgStructureBuilder() {
    const { activeProject, updateProjectField } = useOffice();
    const [nodes, setNodes] = useState<OrgNode[]>([]);
    const [viewMode, setViewMode] = useState<'tree' | 'list'>('tree');
    const [showAiModal, setShowAiModal] = useState(false);
    const [aiPrompt, setAiPrompt] = useState('');
    const [isGenerating, setIsGenerating] = useState(false);

    // Form State
    const [editingNode, setEditingNode] = useState<OrgNode | null>(null);
    const [newNodeParent, setNewNodeParent] = useState<string>('');

    useEffect(() => {
        if (activeProject?.orgStructure) {
            setNodes(activeProject.orgStructure);
        }
    }, [activeProject]);

    const saveNodes = (newNodes: OrgNode[]) => {
        setNodes(newNodes);
        if (activeProject) {
            updateProjectField('orgStructure', newNodes);
        }
    };

    const handleAddNode = (parentID: string = '') => {
        const id = Date.now().toString();
        const newNode: OrgNode = {
            id,
            role: 'New Role',
            name: 'Vacant',
            department: 'General',
            reportsTo: parentID,
            description: 'Role description...'
        };
        saveNodes([...nodes, newNode]);
        setEditingNode(newNode);
    };

    const handleDeleteNode = (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        if (confirm('Delete this role and all its reports?')) {
            // Recursive delete
            const idsToDelete = new Set<string>();
            const findChildren = (nodeId: string) => {
                idsToDelete.add(nodeId);
                nodes.filter(n => n.reportsTo === nodeId).forEach(n => findChildren(n.id));
            };
            findChildren(id);
            saveNodes(nodes.filter(n => !idsToDelete.has(n.id)));
            setEditingNode(null);
        }
    };

    const handleUpdateNode = (field: keyof OrgNode, value: any) => {
        if (!editingNode) return;
        const updated = { ...editingNode, [field]: value };
        setEditingNode(updated);
        saveNodes(nodes.map(n => n.id === updated.id ? updated : n));
    };

    // AI Generation (Mocked for UI logic, connect to LLM later if needed)
    const handleAiGenerate = async () => {
        if (!aiPrompt.trim()) return;
        setIsGenerating(true);

        // Simulating Agent Delay
        setTimeout(() => {
            const mockStructure: OrgNode[] = [
                { id: '1', role: 'CEO', name: 'Founder', department: 'Executive', reportsTo: '' },
                { id: '2', role: 'CTO', name: 'TBD', department: 'Technology', reportsTo: '1' },
                { id: '3', role: 'CMO', name: 'TBD', department: 'Marketing', reportsTo: '1' },
                { id: '4', role: 'Lead Developer', name: 'TBD', department: 'Technology', reportsTo: '2' },
                { id: '5', role: 'Product Manager', name: 'TBD', department: 'Product', reportsTo: '2' },
            ];
            saveNodes(mockStructure);
            setIsGenerating(false);
            setShowAiModal(false);
        }, 2000);
    };

    // Render Tree Recursively
    const renderTree = (parentId: string = '', level = 0) => {
        const children = nodes.filter(n => (n.reportsTo || '') === parentId);

        return (
            <div className={`pl-${level === 0 ? '0' : '8'} border-l ${level === 0 ? 'border-none' : 'border-zinc-800'} ml-${level === 0 ? '0' : '4'}`}>
                {children.map(node => (
                    <div key={node.id} className="relative">
                        {level > 0 && (
                            <div className="absolute top-6 -left-4 w-4 h-px bg-zinc-800"></div>
                        )}
                        <div
                            onClick={() => setEditingNode(node)}
                            className={`group flex items-start gap-4 p-4 mb-2 rounded-xl border transition-all cursor-pointer ${editingNode?.id === node.id
                                    ? 'bg-indigo-900/20 border-indigo-500/50 shadow-lg shadow-indigo-500/10'
                                    : 'bg-zinc-900/30 border-zinc-800 hover:border-zinc-600'
                                }`}
                        >
                            <div className="w-10 h-10 rounded-lg bg-zinc-800 flex items-center justify-center shrink-0 border border-zinc-700">
                                <User className="w-5 h-5 text-zinc-400" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between">
                                    <h4 className="text-sm font-bold text-zinc-200">{node.role}</h4>
                                    <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 bg-zinc-950 px-2 py-0.5 rounded border border-zinc-800">
                                        {node.department}
                                    </span>
                                </div>
                                <div className="text-xs text-zinc-500 mt-1 flex items-center gap-2">
                                    <span className={node.name === 'Vacant' || node.name === 'TBD' ? 'text-amber-500' : 'text-zinc-400'}>
                                        {node.name}
                                    </span>
                                </div>
                            </div>

                            <div className="flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button
                                    onClick={(e) => { e.stopPropagation(); handleAddNode(node.id); }}
                                    className="p-1.5 hover:bg-zinc-700/50 rounded-lg text-zinc-400 hover:text-indigo-400"
                                    title="Add Report"
                                >
                                    <Plus className="w-3.5 h-3.5" />
                                </button>
                                <button
                                    onClick={(e) => handleDeleteNode(node.id, e)}
                                    className="p-1.5 hover:bg-zinc-700/50 rounded-lg text-zinc-400 hover:text-rose-400"
                                >
                                    <Trash2 className="w-3.5 h-3.5" />
                                </button>
                            </div>
                        </div>
                        {renderTree(node.id, level + 1)}
                    </div>
                ))}
            </div>
        );
    };

    if (!activeProject) return null;

    return (
        <div className="flex h-full bg-brand-bg text-brand-text">
            {/* Main Canvas */}
            <div className="flex-1 flex flex-col min-w-0 border-r border-zinc-900">
                <div className="p-6 border-b border-brand-border flex items-center justify-between bg-brand-panel/80 backdrop-blur-xl">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-indigo-500/10 flex items-center justify-center border border-indigo-500/20 text-indigo-500">
                            <Network className="w-5 h-5" />
                        </div>
                        <div>
                            <h1 className="text-lg font-bold tracking-tight">Org Structure</h1>
                            <div className="flex items-center gap-2">
                                <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full"></span>
                                <span className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold">
                                    {nodes.length} Active Roles
                                </span>
                            </div>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => setShowAiModal(true)}
                            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all shadow-lg shadow-indigo-500/20"
                        >
                            <Wand2 className="w-3.5 h-3.5" />
                            AI Generate
                        </button>
                        <button
                            onClick={() => handleAddNode()}
                            className="p-2 border border-zinc-800 bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-100 rounded-lg transition-all"
                            title="Add Root Node"
                        >
                            <Plus className="w-4 h-4" />
                        </button>
                    </div>
                </div>

                <div className="flex-1 overflow-auto p-8 custom-scrollbar relative">
                    {/* Background Grid */}
                    <div className="absolute inset-0 opacity-[0.03] pointer-events-none"
                        style={{ backgroundImage: 'radial-gradient(#6366f1 1px, transparent 1px)', backgroundSize: '30px 30px' }}>
                    </div>

                    {nodes.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full text-zinc-600 opacity-50">
                            <Users className="w-16 h-16 mb-4" />
                            <p className="text-xs uppercase tracking-widest font-bold">Organization Chart Empty</p>
                            <button onClick={() => handleAddNode()} className="mt-4 px-4 py-2 border border-zinc-800 rounded text-xs font-bold hover:bg-zinc-800 hover:text-white transition-colors">Create First Role</button>
                        </div>
                    ) : (
                        <div className="max-w-3xl mx-auto pb-20">
                            {renderTree()}
                        </div>
                    )}
                </div>
            </div>

            {/* Editor Sidebar */}
            {editingNode ? (
                <div className="w-80 bg-brand-bg border-l border-brand-border p-6 flex flex-col h-full animate-in slide-in-from-right-10 duration-300">
                    <h3 className="text-xs font-bold uppercase tracking-widest text-zinc-500 mb-6 flex items-center gap-2">
                        <User className="w-4 h-4" />
                        Role Details
                    </h3>

                    <div className="space-y-5">
                        <div>
                            <label className="block text-[10px] font-bold uppercase tracking-widest text-zinc-600 mb-1.5">Role Title</label>
                            <input
                                type="text"
                                value={editingNode.role}
                                onChange={(e) => handleUpdateNode('role', e.target.value)}
                                className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-100 focus:border-indigo-500 outline-none transition-colors"
                            />
                        </div>

                        <div>
                            <label className="block text-[10px] font-bold uppercase tracking-widest text-zinc-600 mb-1.5">Assigned Person</label>
                            <input
                                type="text"
                                value={editingNode.name}
                                onChange={(e) => handleUpdateNode('name', e.target.value)}
                                className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-100 focus:border-indigo-500 outline-none transition-colors"
                            />
                        </div>

                        <div>
                            <label className="block text-[10px] font-bold uppercase tracking-widest text-zinc-600 mb-1.5">Department</label>
                            <select
                                value={editingNode.department}
                                onChange={(e) => handleUpdateNode('department', e.target.value)}
                                className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-100 focus:border-indigo-500 outline-none transition-colors"
                            >
                                <option>Executive</option>
                                <option>Technology</option>
                                <option>Product</option>
                                <option>Marketing</option>
                                <option>Sales</option>
                                <option>Operations</option>
                                <option>Finance</option>
                                <option>HR</option>
                                <option>General</option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-[10px] font-bold uppercase tracking-widest text-zinc-600 mb-1.5">Responsibilities</label>
                            <textarea
                                value={editingNode.description}
                                onChange={(e) => handleUpdateNode('description', e.target.value)}
                                className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-100 focus:border-indigo-500 outline-none transition-colors h-32 resize-none"
                            />
                        </div>

                        <div className="pt-4 border-t border-zinc-900">
                            <div className="p-3 bg-indigo-900/10 border border-indigo-900/30 rounded-lg">
                                <h4 className="text-[10px] font-bold uppercase tracking-widest text-indigo-400 mb-1">AI Recommendation</h4>
                                <p className="text-[10px] text-zinc-400 leading-relaxed">
                                    Consider adding 2 junior reports to handle operational overhead for this {editingNode.role} role.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            ) : (
                <div className="w-80 bg-brand-bg border-l border-brand-border flex items-center justify-center p-6 text-center text-brand-muted">
                    <div>
                        <Network className="w-12 h-12 mx-auto mb-4 opacity-20" />
                        <p className="text-xs font-bold uppercase tracking-widest">Select a role to edit</p>
                    </div>
                </div>
            )}

            {/* AI Modal */}
            {showAiModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
                    <div className="w-[400px] bg-zinc-900 border border-zinc-800 rounded-2xl p-6 shadow-2xl">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="w-10 h-10 rounded-full bg-indigo-500/20 flex items-center justify-center text-indigo-400">
                                <Bot className="w-5 h-5" />
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-white">AI Architect</h3>
                                <p className="text-xs text-zinc-500">Generate organization structure</p>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <textarea
                                value={aiPrompt}
                                onChange={(e) => setAiPrompt(e.target.value)}
                                placeholder="Describe your company (e.g. Early stage SaaS startup with 10 employees, heavy on engineering...)"
                                className="w-full h-32 bg-black border border-zinc-800 rounded-xl p-4 text-sm text-zinc-200 focus:border-indigo-500 outline-none resize-none"
                                autoFocus
                            />

                            <div className="flex gap-3 pt-2">
                                <button
                                    onClick={() => setShowAiModal(false)}
                                    className="flex-1 py-3 rounded-xl bg-zinc-800 text-zinc-400 font-bold text-xs uppercase tracking-widest hover:text-white transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleAiGenerate}
                                    disabled={!aiPrompt.trim() || isGenerating}
                                    className="flex-1 py-3 rounded-xl bg-indigo-600 text-white font-bold text-xs uppercase tracking-widest hover:bg-indigo-500 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                                >
                                    {isGenerating ? 'Architecting...' : 'Generate Chart'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

// Helper icon
function Bot({ className }: { className?: string }) {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
            <path d="M12 8V4H8" /><rect width="16" height="12" x="4" y="8" rx="2" /><path d="M2 14h2" /><path d="M20 14h2" /><path d="M15 13v2" /><path d="M9 13v2" />
        </svg>
    );
}
