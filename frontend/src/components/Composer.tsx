'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { PaperAirplaneIcon, PaperClipIcon, StopIcon } from '@heroicons/react/24/outline';
import { v4 as uuid } from 'uuid';
import { useChatStore } from '@/lib/store';
import { Message } from '@/lib/types';
import { streamQuery, uploadFile, RateLimitError } from '@/lib/api';
import clsx from 'clsx';

const ACCEPTED = '.pdf,.docx,.xlsx,.pptx,.txt,.md';

interface Props {
    onError: (msg: string) => void;
}

export default function Composer({ onError }: Props) {
    const { dispatch, settings, activeId, activeConversation } = useChatStore();
    const [text, setText] = useState('');
    const [streaming, setStreaming] = useState(false);
    const abortRef = useRef<AbortController | null>(null);
    const fileRef = useRef<HTMLInputElement>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    // Auto-resize textarea
    useEffect(() => {
        const ta = textareaRef.current;
        if (!ta) return;
        ta.style.height = 'auto';
        ta.style.height = `${Math.min(ta.scrollHeight, 200)}px`;
    }, [text]);

    const ensureConversation = useCallback(() => {
        if (!activeId) dispatch({ type: 'NEW_CONVERSATION' });
    }, [activeId, dispatch]);

    const send = useCallback(async (question: string) => {
        if (!question.trim() || streaming) return;
        ensureConversation();

        const userMsg: Message = { id: uuid(), role: 'user', content: question, createdAt: Date.now() };
        dispatch({ type: 'APPEND_MESSAGE', msg: userMsg });
        setText('');

        const assistantId = uuid();
        const placeholder: Message = { id: assistantId, role: 'assistant', content: '', createdAt: Date.now(), isStreaming: true };
        dispatch({ type: 'APPEND_MESSAGE', msg: placeholder });
        setStreaming(true);

        const ctrl = new AbortController();
        abortRef.current = ctrl;

        let combined = '';
        try {
            for await (const token of streamQuery(question, settings, ctrl.signal)) {
                combined += token;
                dispatch({ type: 'UPDATE_MESSAGE', id: assistantId, patch: { content: combined } });
            }
            dispatch({ type: 'UPDATE_MESSAGE', id: assistantId, patch: { isStreaming: false } });
        } catch (err) {
            if ((err as Error).name === 'AbortError') {
                dispatch({ type: 'UPDATE_MESSAGE', id: assistantId, patch: { isStreaming: false } });
                return;
            }
            const msg = err instanceof RateLimitError
                ? '⏱ Rate limit hit. Please wait and try again.'
                : `❌ ${(err as Error).message}`;
            dispatch({ type: 'UPDATE_MESSAGE', id: assistantId, patch: { content: msg, isStreaming: false, error: true } });
            onError(msg);
        } finally {
            setStreaming(false);
            abortRef.current = null;
        }
    }, [streaming, settings, dispatch, ensureConversation, onError]);

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            send(text);
        }
    };

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        e.target.value = '';
        ensureConversation();

        const cardMsgId = uuid();
        dispatch({
            type: 'APPEND_MESSAGE',
            msg: {
                id: cardMsgId,
                role: 'user',
                content: '',
                createdAt: Date.now(),
                uploadCard: { filename: file.name, status: 'queued' },
            },
        });

        try {
            const res = await uploadFile(file);
            dispatch({
                type: 'UPDATE_MESSAGE',
                id: cardMsgId,
                patch: { uploadCard: { filename: file.name, status: 'processing', jobId: res.job_id } },
            });
        } catch (err) {
            dispatch({
                type: 'UPDATE_MESSAGE',
                id: cardMsgId,
                patch: { uploadCard: { filename: file.name, status: 'failed', error: (err as Error).message } },
            });
            onError((err as Error).message);
        }
    };

    return (
        <div className="border-t border-gray-700 bg-gray-900 px-4 py-3">
            <div className="flex items-end gap-2 bg-gray-800 rounded-2xl border border-gray-600 px-3 py-2 focus-within:border-indigo-500 transition-colors">
                {/* Attach */}
                <button
                    onClick={() => fileRef.current?.click()}
                    className="shrink-0 mb-1 p-1 text-gray-400 hover:text-gray-200 transition-colors"
                    title="Attach file"
                    disabled={streaming}
                >
                    <PaperClipIcon className="h-5 w-5" />
                </button>
                <input ref={fileRef} type="file" accept={ACCEPTED} className="hidden" onChange={handleFileChange} />

                {/* Textarea */}
                <textarea
                    ref={textareaRef}
                    value={text}
                    onChange={e => setText(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Send a message… (Shift+Enter for newline)"
                    rows={1}
                    disabled={streaming}
                    className="flex-1 resize-none bg-transparent text-sm text-gray-100 placeholder-gray-500 focus:outline-none py-1 leading-relaxed max-h-48"
                />

                {/* Send / Stop */}
                {streaming ? (
                    <button
                        onClick={() => abortRef.current?.abort()}
                        className="shrink-0 mb-1 p-1.5 text-red-400 hover:text-red-300 transition-colors"
                        title="Stop generating"
                    >
                        <StopIcon className="h-5 w-5" />
                    </button>
                ) : (
                    <button
                        onClick={() => send(text)}
                        disabled={!text.trim()}
                        className={clsx(
                            'shrink-0 mb-1 p-1.5 rounded-lg transition-colors',
                            text.trim() ? 'text-indigo-400 hover:text-indigo-300' : 'text-gray-600 cursor-not-allowed'
                        )}
                        title="Send"
                    >
                        <PaperAirplaneIcon className="h-5 w-5" />
                    </button>
                )}
            </div>
            <p className="text-center text-xs text-gray-600 mt-1.5">Mode: {settings.mode} · Top K: {settings.topK}</p>
        </div>
    );
}
