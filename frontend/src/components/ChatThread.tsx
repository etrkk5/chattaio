'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import MessageBubble from './MessageBubble';
import { useChatStore } from '@/lib/store';
import { ChevronDownIcon } from '@heroicons/react/24/outline';

export default function ChatThread() {
    const { activeConversation } = useChatStore();
    const bottomRef = useRef<HTMLDivElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const [showScrollBtn, setShowScrollBtn] = useState(false);
    const isPinnedRef = useRef(true);

    const scrollToBottom = useCallback((smooth = true) => {
        bottomRef.current?.scrollIntoView({ behavior: smooth ? 'smooth' : 'auto' });
    }, []);

    // Track whether user is near bottom
    const handleScroll = useCallback(() => {
        const el = containerRef.current;
        if (!el) return;
        const distFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
        isPinnedRef.current = distFromBottom < 120;
        setShowScrollBtn(distFromBottom > 120);
    }, []);

    // Auto-scroll when messages change (only if pinned)
    useEffect(() => {
        if (isPinnedRef.current) scrollToBottom(false);
    }, [activeConversation?.messages, scrollToBottom]);

    const messages = activeConversation?.messages ?? [];

    return (
        <div className="relative flex-1 overflow-hidden">
            <div
                ref={containerRef}
                onScroll={handleScroll}
                className="h-full overflow-y-auto px-4 py-6 space-y-4"
            >
                {messages.length === 0 && (
                    <div className="flex flex-col items-center justify-center h-full text-center text-gray-500">
                        <div className="w-16 h-16 rounded-2xl bg-indigo-900/30 flex items-center justify-center mb-4">
                            <span className="text-3xl">🤖</span>
                        </div>
                        <p className="text-lg font-medium text-gray-300">Ask anything</p>
                        <p className="text-sm mt-1">Upload documents and query them using AI</p>
                    </div>
                )}

                {messages.map(msg => (
                    <MessageBubble key={msg.id} message={msg} />
                ))}

                <div ref={bottomRef} />
            </div>

            {showScrollBtn && (
                <button
                    onClick={() => { isPinnedRef.current = true; scrollToBottom(); setShowScrollBtn(false); }}
                    className="absolute bottom-4 right-6 bg-gray-700 hover:bg-gray-600 text-white rounded-full p-2 shadow-lg transition-colors z-10"
                    aria-label="Scroll to bottom"
                >
                    <ChevronDownIcon className="h-5 w-5" />
                </button>
            )}
        </div>
    );
}
