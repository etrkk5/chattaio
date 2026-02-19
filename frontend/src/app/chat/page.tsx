'use client';

import { useCallback, useEffect, useState } from 'react';
import { TrashIcon, XMarkIcon } from '@heroicons/react/24/outline';
import Sidebar from '@/components/Sidebar';
import ChatThread from '@/components/ChatThread';
import Composer from '@/components/Composer';
import { checkHealth } from '@/lib/api';
import { useChatStore } from '@/lib/store';
import clsx from 'clsx';

function Toast({ message, onClose }: { message: string; onClose: () => void }) {
    useEffect(() => {
        const t = setTimeout(onClose, 5000);
        return () => clearTimeout(t);
    }, [onClose]);
    return (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 bg-red-900 border border-red-700 text-red-100 text-sm px-4 py-2 rounded-xl shadow-xl animate-in fade-in slide-in-from-bottom-2">
            <span>{message}</span>
            <button onClick={onClose}><XMarkIcon className="h-4 w-4" /></button>
        </div>
    );
}

export default function ChatPage() {
    const { activeConversation, dispatch } = useChatStore();
    const [online, setOnline] = useState(true);
    const [toast, setToast] = useState<string | null>(null);

    // Health check every 30s
    useEffect(() => {
        const check = async () => setOnline(await checkHealth());
        check();
        const id = setInterval(check, 30_000);
        return () => clearInterval(id);
    }, []);

    const closeToast = useCallback(() => setToast(null), []);

    return (
        <div className="flex h-screen overflow-hidden bg-gray-950 text-gray-100">
            <Sidebar online={online} />

            {/* Main */}
            <main className="flex flex-col flex-1 min-w-0 h-screen overflow-hidden">
                {/* Header */}
                <header className="flex items-center justify-between px-5 py-3 border-b border-gray-800 bg-gray-900 shrink-0">
                    <div className="flex items-center gap-3">
                        <span className="text-lg font-semibold text-white">Chatta.io</span>
                        {activeConversation && (
                            <span className="text-sm text-gray-400 truncate max-w-xs">{activeConversation.title}</span>
                        )}
                    </div>
                    <div className="flex items-center gap-3">
                        {!online && (
                            <span className="text-xs font-medium text-red-400 bg-red-900/30 border border-red-700 rounded-full px-2.5 py-0.5">
                                Backend Offline
                            </span>
                        )}
                        {activeConversation && (
                            <button
                                onClick={() => dispatch({ type: 'CLEAR_ACTIVE' })}
                                className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-white transition-colors px-2 py-1 rounded hover:bg-gray-800"
                            >
                                <TrashIcon className="h-3.5 w-3.5" />
                                Clear chat
                            </button>
                        )}
                    </div>
                </header>

                {/* Thread */}
                <ChatThread />

                {/* Composer */}
                <Composer onError={setToast} />
            </main>

            {toast && <Toast message={toast} onClose={closeToast} />}
        </div>
    );
}
