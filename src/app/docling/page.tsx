"use client"
import React, { useState } from 'react';
import { FileText, Upload, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';

export default function BulkCvParserPoc() {
    const [file, setFile] = useState<File | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [resumeData, setResumeData] = useState<Record<string, unknown> | null>(
        null,
    );
    const [error, setError] = useState('');

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setFile(e.target.files[0]);
            setError('');
            setResumeData(null); // Reset previous results on new file selection
        }
    };

    const processResume = async () => {
        if (!file) {
            setError("Please select a resume PDF first.");
            return;
        }

        setIsLoading(true);
        setError('');
        setResumeData(null);

        const formData = new FormData();
        formData.append('file', file);

        try {
            // Hitting your secure Next.js Orchestrator API instead of the VM directly
            const response = await fetch('/api/process-cv/bulk-ai', {
                method: 'POST',
                body: formData,
                credentials: 'include',
            });

            if (!response.ok) {
                const errData = await response.json().catch(() => ({}));
                throw new Error(errData.message || `HTTP error! status: ${response.status}`);
            }

            const result = await response.json();

            if (result.status === "success") {
                setResumeData(result.data);
            } else {
                throw new Error(result.message || "Failed to parse document");
            }
        } catch (err: unknown) {
            console.error("Parsing failed:", err);
            setError(
                err instanceof Error ? err.message : "Could not connect to the server.",
            );
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="p-6 bg-zinc-950 border border-zinc-900 rounded-2xl max-w-3xl mx-auto text-zinc-200 shadow-2xl">
            <div className="mb-6 border-b border-zinc-800 pb-4">
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                    <FileText className="w-5 h-5 text-sky-500" />
                    AI Resume Extractor (End-to-End)
                </h2>
                <p className="text-sm text-zinc-500 mt-1">
                    Testing the full pipeline: Next.js API ➔ PDF to markdown ➔ Bulk CV AI
                    (round-robin across configured providers) ➔ structured JSON.
                </p>
            </div>

            <div className="space-y-6">
                {/* File Upload Section */}
                <div className="flex items-center gap-4 p-4 border border-dashed border-zinc-700 rounded-xl bg-zinc-900/50 hover:bg-zinc-900 transition-colors">
                    <div className="flex-1">
                        <input
                            type="file"
                            accept=".pdf"
                            onChange={handleFileChange}
                            className="block w-full text-sm text-zinc-400 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-bold file:bg-sky-500/10 file:text-sky-400 hover:file:bg-sky-500/20 transition-colors"
                        />
                    </div>
                    <button
                        onClick={processResume}
                        disabled={!file || isLoading}
                        className="flex items-center gap-2 px-6 py-2 bg-sky-600 hover:bg-sky-500 disabled:bg-zinc-800 disabled:text-zinc-600 text-white text-sm font-bold rounded-lg transition-all"
                    >
                        {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                        {isLoading ? 'Processing...' : 'Extract JSON'}
                    </button>
                </div>

                {/* Error State */}
                {error && (
                    <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-lg flex items-start gap-2 text-rose-400 text-sm">
                        <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                        <p>{error}</p>
                    </div>
                )}

                {/* Results Area */}
                <div className="flex flex-col h-[450px]">
                    <div className="flex items-center justify-between mb-2">
                        <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">
                            Extracted JSON Data
                        </label>
                        {resumeData && (
                            <span className="flex items-center gap-1 text-[10px] bg-emerald-500/10 text-emerald-400 px-2 py-1 rounded font-bold uppercase">
                                <CheckCircle2 className="w-3 h-3" />
                                Valid Schema
                            </span>
                        )}
                    </div>

                    {/* Replaced textarea with a pre block for formatted JSON */}
                    <div className="flex-1 w-full bg-black border border-zinc-800 rounded-xl overflow-hidden relative">
                        {isLoading ? (
                            <div className="absolute inset-0 flex flex-col items-center justify-center text-zinc-600 font-mono text-sm">
                                <Loader2 className="w-8 h-8 animate-spin mb-4 text-sky-500/50" />
                                <p className="animate-pulse">1. Sending PDF to Python VM...</p>
                                <p className="animate-pulse delay-75">2. Converting layout to Markdown...</p>
                                <p className="animate-pulse delay-150">3. Extracting entities via LLM...</p>
                            </div>
                        ) : (
                            <pre className="w-full h-full p-4 overflow-auto text-sm font-mono text-emerald-400 focus:outline-none scrollbar-thin scrollbar-thumb-zinc-700 scrollbar-track-transparent">
                                {resumeData
                                    ? JSON.stringify(resumeData, null, 2)
                                    : <span className="text-zinc-600">{"// Structured JSON output will appear here."}</span>}
                            </pre>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}