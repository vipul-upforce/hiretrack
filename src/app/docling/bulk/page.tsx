'use client';

import React, { useState, useRef, useMemo, useEffect } from 'react';
import {
  Upload,
  Loader2,
  CheckCircle2,
  FileText,
  StopCircle,
  Clock,
  XCircle,
  Server,
} from 'lucide-react';
import {
  BULK_CV_PROVIDER_IDS,
  BULK_CV_PROVIDER_LABELS,
} from '@/lib/cv-processing/config';
import type { BulkCvProviderId } from '@/lib/types/bulk-cv-ai';

type Provider = BulkCvProviderId;

// Cooldown between files to reduce cross-provider rate-limit bursts.
const PER_FILE_COOLDOWN_MS = 3000;

type Attempt = {
  provider?: Provider;
  ok: boolean;
  error?: string;
};

interface ProcessResult {
  file: File;
  status: 'pending' | 'processing' | 'success' | 'error';
  data?: Record<string, unknown>;
  error?: string;
  provider?: Provider;
  attempts?: Attempt[];
}

function isProcessedRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isProviderId(value: string): value is Provider {
  return (BULK_CV_PROVIDER_IDS as readonly string[]).includes(value);
}

async function parseBulkFile(file: File): Promise<
  | { ok: true; data: Record<string, unknown>; usedProvider?: Provider }
  | { ok: false; error: string }
> {
  const formData = new FormData();
  formData.append('file', file);

  try {
    const response = await fetch('/api/process-cv/bulk-ai', {
      method: 'POST',
      body: formData,
      credentials: 'include',
    });

    if (!response.ok) {
      const fallbackPayload: unknown = await response
        .json()
        .catch(() => ({}));
      const message =
        isProcessedRecord(fallbackPayload) &&
        typeof fallbackPayload.message === 'string'
          ? fallbackPayload.message
          : `HTTP ${response.status}`;
      return { ok: false, error: message };
    }

    const payload: unknown = await response.json();
    if (
      isProcessedRecord(payload) &&
      payload.status === 'success' &&
      isProcessedRecord(payload.data)
    ) {
      const rawUsed = payload.usedBulkCvProvider;
      const usedProvider =
        typeof rawUsed === 'string' && isProviderId(rawUsed)
          ? rawUsed
          : undefined;
      return { ok: true, data: payload.data, usedProvider };
    }

    const message =
      isProcessedRecord(payload) && typeof payload.message === 'string'
        ? payload.message
        : 'Failed to parse';
    return { ok: false, error: message };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : 'Network error',
    };
  }
}

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export default function BulkResumeProcessor() {
  const [files, setFiles] = useState<File[]>([]);
  const [results, setResults] = useState<ProcessResult[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [readiness, setReadiness] = useState<Record<Provider, boolean> | null>(
    null,
  );

  const cancelRef = useRef(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const res = await fetch('/api/process-cv/bulk-ai', {
        credentials: 'include',
      });
      if (!res.ok || cancelled) return;
      const body: unknown = await res.json().catch(() => null);
      if (!isProcessedRecord(body) || body.status !== 'ok') return;
      const raw = body.bulkCvProviderReadiness;
      if (typeof raw !== 'object' || raw === null) return;
      const next = {} as Record<Provider, boolean>;
      for (const id of BULK_CV_PROVIDER_IDS) {
        next[id] = Boolean((raw as Record<string, unknown>)[id]);
      }
      if (!cancelled) setReadiness(next);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const selectedFiles = Array.from(e.target.files);
      setFiles(selectedFiles);
      setResults(
        selectedFiles.map((file) => ({
          file,
          status: 'pending',
        })),
      );
      setProgress(0);
      cancelRef.current = false;
    }
  };

  const startBatchProcess = async () => {
    if (files.length === 0) return;

    setIsProcessing(true);
    cancelRef.current = false;
    setProgress(0);

    const queue: ProcessResult[] = files.map((file) => ({
      file,
      status: 'pending',
    }));
    setResults([...queue]);

    for (let i = 0; i < files.length; i += 1) {
      if (cancelRef.current) {
        console.info('[bulk-cv] cancelled by user', { fileIndex: i });
        break;
      }

      const currentFile = files[i];

      queue[i] = { ...queue[i], status: 'processing' };
      setResults([...queue]);

      console.info('[bulk-cv] file:start', {
        fileIndex: i,
        filename: currentFile.name,
        mode: 'server_auto_fallback',
      });

      const result = await parseBulkFile(currentFile);

      if (cancelRef.current) {
        queue[i] = {
          ...queue[i],
          status: 'error',
          error: 'Cancelled',
          attempts: [{ ok: false, error: 'Cancelled' }],
        };
        setResults([...queue]);
        break;
      }

      if (result.ok) {
        const used = result.usedProvider;
        queue[i] = {
          ...queue[i],
          status: 'success',
          data: result.data,
          provider: used,
          attempts: used
            ? [{ provider: used, ok: true }]
            : [{ ok: true }],
        };
        console.info('[bulk-cv] file:success', {
          fileIndex: i,
          filename: currentFile.name,
          provider: used,
        });
      } else {
        console.error('[bulk-cv] file:failed', {
          fileIndex: i,
          filename: currentFile.name,
          error: result.error,
        });
        queue[i] = {
          ...queue[i],
          status: 'error',
          error: result.error,
          attempts: [{ ok: false, error: result.error }],
        };
      }

      setResults([...queue]);
      setProgress(i + 1);

      if (i < files.length - 1 && !cancelRef.current) {
        await delay(PER_FILE_COOLDOWN_MS);
      }
    }

    setIsProcessing(false);
  };

  const cancelBatch = () => {
    cancelRef.current = true;
    setIsProcessing(false);
  };

  const counters = useMemo(() => {
    const byProvider: Record<Provider, number> = {
      groq: 0,
      gemini: 0,
      deepseek: 0,
      openrouter: 0,
      cerebras: 0,
      mistral: 0,
    };
    let success = 0;
    let error = 0;
    for (const r of results) {
      if (r.status === 'success') {
        success += 1;
        if (r.provider) byProvider[r.provider] += 1;
      } else if (r.status === 'error') {
        error += 1;
      }
    }
    return { successCount: success, errorCount: error, byProvider };
  }, [results]);

  const readinessSummary = useMemo(() => {
    if (!readiness) return null;
    const configured = BULK_CV_PROVIDER_IDS.filter((id) => readiness[id]);
    if (configured.length === 0) return 'No providers configured';
    return configured.map((id) => BULK_CV_PROVIDER_LABELS[id]).join(' · ');
  }, [readiness]);

  return (
    <div className="p-6 bg-zinc-950 border border-zinc-900 rounded-2xl max-w-5xl mx-auto text-zinc-200 shadow-2xl">
      <div className="mb-6 border-b border-zinc-800 pb-4 flex justify-between items-end">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <FileText className="w-5 h-5 text-sky-500" />
            Bulk Resume Extractor
          </h2>
          <p className="text-sm text-zinc-500 mt-1 flex items-center gap-2">
            <Server className="w-3.5 h-3.5 text-sky-400" />
            One PDF parse per file; the server tries each configured provider
            (round-robin primary, then the rest) until extraction succeeds.
          </p>
          {readinessSummary && (
            <p className="text-xs text-zinc-600 mt-1 font-mono">
              Ready: {readinessSummary}
            </p>
          )}
        </div>
        {files.length > 0 && (
          <div className="text-right text-xs font-mono text-zinc-400">
            <p>
              Total: {files.length} | Completed: {progress}
            </p>
            <p className="text-emerald-400">
              Success: {counters.successCount}{' '}
              <span className="text-rose-400">
                | Errors: {counters.errorCount}
              </span>
            </p>
            <p className="text-zinc-500">
              {BULK_CV_PROVIDER_IDS.map(
                (p) => `${BULK_CV_PROVIDER_LABELS[p]}: ${counters.byProvider[p]}`,
              ).join(' · ')}
            </p>
          </div>
        )}
      </div>

      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <div className="flex-1">
            <input
              type="file"
              accept=".pdf"
              multiple
              onChange={handleFileChange}
              disabled={isProcessing}
              className="block w-full text-sm text-zinc-400 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-bold file:bg-sky-500/10 file:text-sky-400 hover:file:bg-sky-500/20 disabled:opacity-50 transition-colors"
            />
          </div>

          {isProcessing ? (
            <button
              onClick={cancelBatch}
              className="flex items-center gap-2 px-6 py-2 bg-rose-600/20 text-rose-500 border border-rose-500/50 hover:bg-rose-600/30 font-bold rounded-lg transition-all"
            >
              <StopCircle className="w-4 h-4" />
              Stop Batch
            </button>
          ) : (
            <button
              onClick={startBatchProcess}
              disabled={files.length === 0}
              className="flex items-center gap-2 px-6 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:bg-zinc-800 disabled:text-zinc-600 text-white text-sm font-bold rounded-lg transition-all"
            >
              <Upload className="w-4 h-4" />
              Start Processing ({files.length})
            </button>
          )}
        </div>

        {files.length > 0 && (
          <div className="w-full bg-zinc-900 rounded-full h-2.5 border border-zinc-800 overflow-hidden">
            <div
              className="bg-sky-500 h-2.5 rounded-full transition-all duration-500 ease-out"
              style={{ width: `${(progress / files.length) * 100}%` }}
            />
          </div>
        )}

        {files.length > 0 && (
          <div className="border border-zinc-800 rounded-xl overflow-hidden bg-black max-h-[500px] overflow-y-auto scrollbar-thin scrollbar-thumb-zinc-700 scrollbar-track-transparent">
            <table className="w-full text-sm text-left text-zinc-400">
              <thead className="text-xs uppercase bg-zinc-900/50 text-zinc-500 sticky top-0 backdrop-blur-md">
                <tr>
                  <th className="px-6 py-3 font-medium">Filename</th>
                  <th className="px-6 py-3 font-medium w-40">Status</th>
                  <th className="px-6 py-3 font-medium w-56">Provider</th>
                  <th className="px-6 py-3 font-medium w-48 text-right">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800">
                {results.map((result, index) => {
                  return (
                    <tr
                      key={`${result.file.name}-${index}`}
                      className="hover:bg-zinc-900/30 transition-colors"
                    >
                      <td className="px-6 py-4 font-mono truncate max-w-[300px]">
                        {result.file.name}
                      </td>
                      <td className="px-6 py-4">
                        {result.status === 'pending' && (
                          <span className="flex items-center gap-2 text-zinc-500">
                            <Clock className="w-4 h-4" /> Pending
                          </span>
                        )}
                        {result.status === 'processing' && (
                          <span className="flex items-center gap-2 text-sky-400">
                            <Loader2 className="w-4 h-4 animate-spin" />{' '}
                            Parsing…
                          </span>
                        )}
                        {result.status === 'success' && (
                          <span className="flex items-center gap-2 text-emerald-400">
                            <CheckCircle2 className="w-4 h-4" /> Success
                          </span>
                        )}
                        {result.status === 'error' && (
                          <span className="flex items-center gap-2 text-rose-400">
                            <XCircle className="w-4 h-4" /> Failed
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-xs">
                        {result.status === 'success' && result.provider && (
                          <span
                            className="inline-flex items-center gap-1 rounded-full bg-zinc-900 px-2 py-0.5 text-zinc-300 ring-1 ring-zinc-800"
                            title={`Succeeded with ${BULK_CV_PROVIDER_LABELS[result.provider]}`}
                          >
                            {BULK_CV_PROVIDER_LABELS[result.provider]}
                          </span>
                        )}
                        {result.status === 'success' && !result.provider && (
                          <span className="text-zinc-500">(unknown)</span>
                        )}
                        {result.status === 'error' && result.attempts && (
                          <span
                            className="text-rose-400/80"
                            title={result.attempts
                              .map(
                                (a) =>
                                  `${a.provider ? BULK_CV_PROVIDER_LABELS[a.provider] : 'Server'}: ${a.ok ? 'ok' : a.error}`,
                              )
                              .join(' | ')}
                          >
                            {result.attempts
                              .map((a) =>
                                a.provider
                                  ? BULK_CV_PROVIDER_LABELS[a.provider]
                                  : 'Server',
                              )
                              .join(' → ')}
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right">
                        {result.status === 'error' && (
                          <span
                            className="text-xs text-rose-500"
                            title={result.error}
                          >
                            {result.error?.substring(0, 24)}
                            {result.error && result.error.length > 24
                              ? '…'
                              : ''}
                          </span>
                        )}
                        {result.status === 'success' && (
                          <button
                            onClick={() => console.log(result.data)}
                            className="text-xs px-3 py-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded transition-colors"
                          >
                            View JSON (Console)
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
