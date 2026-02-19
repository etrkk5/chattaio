'use client';

import { useState, useRef, useEffect } from 'react';
import {
    PlusIcon, MagnifyingGlassIcon, Cog6ToothIcon, XMarkIcon,
    ChevronDownIcon, WifiIcon, NoSymbolIcon,
} from '@heroicons/react/24/outline';
import { useChatStore } from '@/lib/store';
import { QueryMode } from '@/lib/types';
import clsx from 'clsx';

interface SidebarProps {
    online: boolean;
}

export default function Sidebar({ online }: SidebarProps) {
    const { conversations, activeId, settings, dispatch } = useChatStore();
    const [search, setSearch] = useState('');
    const [settingsOpen, setSettingsOpen] = useState(false);

    const filtered = conversations.filter(c =>
        c.title.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <aside className="flex flex-col w-64 h-screen bg-gray-900 border-r border-gray-700 shrink-0">
            {/* Header */}
            <div className="p-3">
                <button
                    onClick={() => dispatch({ type: 'NEW_CONVERSATION' })}
                    className="flex items-center gap-2 w-full rounded-lg px-3 py-2 text-sm font-medium text-white hover:bg-gray-700 transition-colors border border-gray-600"
                >
                    <PlusIcon className="h-4 w-4" />
                    New Chat
                </button>
            </div>

            {/* Search */}
            <div className="px-3 pb-2">
                <div className="relative">
                    <MagnifyingGlassIcon className="absolute left-2.5 top-2 h-4 w-4 text-gray-400" />
                    <input
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        placeholder="Search chats..."
                        className="w-full rounded-md bg-gray-800 pl-8 pr-3 py-1.5 text-sm text-gray-200 placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                </div>
            </div>

            {/* Conversation list */}
            <nav className="flex-1 overflow-y-auto px-2 space-y-0.5">
                {filtered.length === 0 && (
                    <p className="px-3 py-4 text-xs text-gray-500 text-center">No conversations yet</p>
                )}
                {filtered.map(conv => (
                    <button
                        key={conv.id}
                        onClick={() => dispatch({ type: 'SELECT_CONVERSATION', id: conv.id })}
                        className={clsx(
                            'w-full text-left px-3 py-2 rounded-lg text-sm transition-colors group relative',
                            activeId === conv.id
                                ? 'bg-gray-700 text-white'
                                : 'text-gray-300 hover:bg-gray-800'
                        )}
                    >
                        <span className="block truncate">{conv.title}</span>
                        <span className="block text-xs text-gray-500 mt-0.5">
                            {new Date(conv.updatedAt).toLocaleDateString()}
                        </span>
                        <button
                            onClick={e => { e.stopPropagation(); dispatch({ type: 'DELETE_CONVERSATION', id: conv.id }); }}
                            className="absolute right-2 top-1/2 -translate-y-1/2 hidden group-hover:flex items-center justify-center h-5 w-5 text-gray-400 hover:text-red-400"
                        >
                            <XMarkIcon className="h-3 w-3" />
                        </button>
                    </button>
                ))}
            </nav>

            {/* Settings panel */}
            <div className="border-t border-gray-700">
                <button
                    onClick={() => setSettingsOpen(o => !o)}
                    className="flex items-center gap-2 w-full px-4 py-3 text-sm text-gray-300 hover:text-white"
                >
                    <Cog6ToothIcon className="h-4 w-4" />
                    <span className="flex-1 text-left">Settings</span>
                    <ChevronDownIcon className={clsx('h-3 w-3 transition-transform', settingsOpen && 'rotate-180')} />
                </button>

                {settingsOpen && (
                    <div className="px-4 pb-4 space-y-3 text-sm text-gray-300">
                        {/* Mode */}
                        <div>
                            <label className="block text-xs text-gray-400 mb-1">Query Mode</label>
                            <select
                                value={settings.mode}
                                onChange={e => dispatch({ type: 'UPDATE_SETTINGS', patch: { mode: e.target.value as QueryMode } })}
                                className="w-full rounded bg-gray-800 border border-gray-600 px-2 py-1.5 text-sm text-white"
                            >
                                {(['hybrid', 'local', 'global', 'naive'] as QueryMode[]).map(m => (
                                    <option key={m} value={m}>{m}</option>
                                ))}
                            </select>
                        </div>
                        {/* Top K */}
                        <div>
                            <label className="block text-xs text-gray-400 mb-1">Top K ({settings.topK})</label>
                            <input
                                type="range" min={1} max={50} value={settings.topK}
                                onChange={e => dispatch({ type: 'UPDATE_SETTINGS', patch: { topK: Number(e.target.value) } })}
                                className="w-full accent-indigo-500"
                            />
                        </div>
                        {/* Citations */}
                        <label className="flex items-center gap-2 cursor-pointer select-none">
                            <input
                                type="checkbox"
                                checked={settings.citations}
                                onChange={e => dispatch({ type: 'UPDATE_SETTINGS', patch: { citations: e.target.checked } })}
                                className="rounded accent-indigo-500"
                            />
                            Show citations
                        </label>
                        {/* System Prompt */}
                        <div>
                            <label className="block text-xs text-gray-400 mb-1">System Prompt</label>
                            <textarea
                                value={settings.systemPrompt}
                                onChange={e => dispatch({ type: 'UPDATE_SETTINGS', patch: { systemPrompt: e.target.value } })}
                                rows={3}
                                placeholder="Optional system prompt..."
                                className="w-full rounded bg-gray-800 border border-gray-600 px-2 py-1.5 text-xs text-white resize-none"
                            />
                        </div>
                    </div>
                )}
            </div>

            {/* Footer */}
            <div className="flex items-center gap-2 px-4 py-3 border-t border-gray-700 text-xs text-gray-500">
                {online ? (
                    <><WifiIcon className="h-3 w-3 text-green-400" /><span className="text-green-400">Connected</span></>
                ) : (
                    <><NoSymbolIcon className="h-3 w-3 text-red-400" /><span className="text-red-400">Offline</span></>
                )}
                <span className="ml-auto">v0.1.0</span>
            </div>
        </aside>
    );
}
