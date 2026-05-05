'use client';

import React, { useState, useCallback } from 'react';
import { Upload, File, X, CheckCircle } from 'lucide-react';
import { useOffice } from '@/lib/OfficeContext';

interface FileDropZoneProps {
    onFilesUploaded?: (files: File[]) => void;
}

export function FileDropZone({ onFilesUploaded }: FileDropZoneProps) {
    const { activeProject, addFile } = useOffice();
    const [isDragging, setIsDragging] = useState(false);
    const [uploadedFiles, setUploadedFiles] = useState<string[]>([]);
    const [isProcessing, setIsProcessing] = useState(false);

    const handleDragOver = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(true);
    }, []);

    const handleDragLeave = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);
    }, []);

    const processFiles = async (files: FileList) => {
        setIsProcessing(true);
        const fileArray = Array.from(files);
        const validFiles = fileArray.filter(file =>
            file.type === 'text/plain' ||
            file.name.endsWith('.md') ||
            file.name.endsWith('.csv') ||
            file.name.endsWith('.json')
        );

        for (const file of validFiles) {
            const reader = new FileReader();
            reader.onload = async (e) => {
                const content = e.target?.result as string;
                if (content && activeProject) {
                    await addFile(file.name, content, file.type);
                    setUploadedFiles(prev => [...prev, file.name]);
                }
            };
            reader.readAsText(file);
        }

        onFilesUploaded?.(validFiles);
        setIsProcessing(false);
    };

    const handleDrop = useCallback(async (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);

        const files = e.dataTransfer.files;
        if (files.length > 0) {
            await processFiles(files);
        }
    }, [activeProject]);

    const handleFileInput = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (files && files.length > 0) {
            await processFiles(files);
        }
    };

    if (!activeProject) {
        return null;
    }

    return (
        <div className="w-full">
            <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={`
                    relative border-2 border-dashed rounded-xl p-8 transition-all duration-300
                    ${isDragging
                        ? 'border-blue-500 bg-blue-500/10 scale-[1.02]'
                        : 'border-office-espresso/20 bg-office-espresso/5 hover:border-office-espresso/40'
                    }
                `}
            >
                <input
                    type="file"
                    id="file-drop-input"
                    className="hidden"
                    onChange={handleFileInput}
                    accept=".txt,.md,.csv,.json"
                    multiple
                />

                <div className="flex flex-col items-center justify-center gap-4 text-center">
                    <div className={`
                        w-16 h-16 rounded-full flex items-center justify-center transition-all
                        ${isDragging ? 'bg-blue-500 scale-110' : 'bg-office-espresso/10'}
                    `}>
                        <Upload className={`w-8 h-8 ${isDragging ? 'text-white' : 'text-office-espresso/60'}`} />
                    </div>

                    <div>
                        <h3 className="text-lg font-bold text-office-espresso mb-1">
                            {isDragging ? 'Drop files here' : 'Upload Context Files'}
                        </h3>
                        <p className="text-sm text-office-espresso/60 mb-2">
                            Drag and drop or{' '}
                            <label htmlFor="file-drop-input" className="text-blue-600 hover:text-blue-700 cursor-pointer font-medium underline">
                                browse
                            </label>
                        </p>
                        <p className="text-xs text-office-espresso/40">
                            Supports: .txt, .md, .csv, .json
                        </p>
                    </div>

                    {isProcessing && (
                        <div className="flex items-center gap-2 text-blue-600">
                            <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                            <span className="text-sm font-medium">Processing files...</span>
                        </div>
                    )}
                </div>
            </div>

            {/* Uploaded Files List */}
            {uploadedFiles.length > 0 && (
                <div className="mt-4 space-y-2">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-office-espresso/60">
                        Recently Uploaded
                    </h4>
                    {uploadedFiles.map((fileName, index) => (
                        <div
                            key={index}
                            className="flex animate-in slide-in-from-bottom-2 items-center gap-3 rounded-lg border border-white/10 bg-white/[0.05] p-3"
                        >
                            <CheckCircle className="h-4 w-4 flex-shrink-0 text-white/70" />
                            <File className="w-4 h-4 text-office-espresso/60 flex-shrink-0" />
                            <span className="text-sm text-office-espresso font-medium flex-1 truncate">
                                {fileName}
                            </span>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

