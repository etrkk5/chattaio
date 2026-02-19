import { ChatSettings } from './types';

const BASE = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000';

// ── Health ──────────────────────────────────────────────────────────────────
export async function checkHealth(): Promise<boolean> {
    try {
        const res = await fetch(`${BASE}/api/v1/health`, { signal: AbortSignal.timeout(4000) });
        return res.ok;
    } catch {
        return false;
    }
}

// ── Query (streaming via fetch ReadableStream) ───────────────────────────────
export async function* streamQuery(
    question: string,
    settings: ChatSettings,
    signal?: AbortSignal
): AsyncGenerator<string> {
    const res = await fetch(`${BASE}/api/v1/query`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            question,
            mode: settings.mode,
            top_k: settings.topK,
        }),
        signal,
    });

    if (!res.ok) {
        const detail = await res.json().catch(() => ({}));
        if (res.status === 429) throw new RateLimitError();
        throw new Error(detail.detail || `HTTP ${res.status}`);
    }

    // Backend may return plain JSON with {answer}
    const contentType = res.headers.get('content-type') || '';
    if (!contentType.includes('text/event-stream')) {
        const data = await res.json();
        yield data.answer ?? data.result ?? JSON.stringify(data);
        return;
    }

    // SSE streaming path
    const reader = res.body!.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop()!;
        for (const line of lines) {
            if (line.startsWith('data:')) {
                const payload = line.slice(5).trim();
                if (payload === '[DONE]') return;
                try {
                    const parsed = JSON.parse(payload);
                    yield parsed.token ?? parsed.answer ?? payload;
                } catch {
                    yield payload;
                }
            }
        }
    }
}

// ── File Upload ──────────────────────────────────────────────────────────────
export interface IngestJobResponse {
    job_id: string;
    status: string;
    filename: string;
}

export async function uploadFile(file: File): Promise<IngestJobResponse> {
    const fd = new FormData();
    fd.append('file', file);
    const res = await fetch(`${BASE}/api/v1/ingest/file`, {
        method: 'POST',
        body: fd,
    });
    if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || `Upload failed: HTTP ${res.status}`);
    }
    return res.json();
}

export async function getJobStatus(jobId: string): Promise<IngestJobResponse> {
    const res = await fetch(`${BASE}/api/v1/ingest/jobs/${jobId}`);
    if (!res.ok) throw new Error(`Job fetch failed: HTTP ${res.status}`);
    return res.json();
}

// ── Custom Errors ────────────────────────────────────────────────────────────
export class RateLimitError extends Error {
    constructor() {
        super('Rate limit exceeded. Please wait a moment and try again.');
        this.name = 'RateLimitError';
    }
}
