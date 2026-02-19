'use client';

import React, { createContext, useContext, useEffect, useReducer } from 'react';
import { v4 as uuid } from 'uuid';
import { Conversation, Message, ChatSettings, DEFAULT_SETTINGS } from '@/lib/types';

interface State {
    conversations: Conversation[];
    activeId: string | null;
    settings: ChatSettings;
}

type Action =
    | { type: 'NEW_CONVERSATION' }
    | { type: 'SELECT_CONVERSATION'; id: string }
    | { type: 'DELETE_CONVERSATION'; id: string }
    | { type: 'APPEND_MESSAGE'; msg: Message }
    | { type: 'UPDATE_MESSAGE'; id: string; patch: Partial<Message> }
    | { type: 'CLEAR_ACTIVE' }
    | { type: 'UPDATE_SETTINGS'; patch: Partial<ChatSettings> };

function reducer(state: State, action: Action): State {
    switch (action.type) {
        case 'NEW_CONVERSATION': {
            const conv: Conversation = { id: uuid(), title: 'New Chat', messages: [], updatedAt: Date.now() };
            return { ...state, conversations: [conv, ...state.conversations], activeId: conv.id };
        }
        case 'SELECT_CONVERSATION':
            return { ...state, activeId: action.id };
        case 'DELETE_CONVERSATION': {
            const convs = state.conversations.filter(c => c.id !== action.id);
            const activeId = state.activeId === action.id ? (convs[0]?.id ?? null) : state.activeId;
            return { ...state, conversations: convs, activeId };
        }
        case 'APPEND_MESSAGE': {
            return {
                ...state,
                conversations: state.conversations.map(c =>
                    c.id === state.activeId
                        ? {
                            ...c,
                            messages: [...c.messages, action.msg],
                            title: c.messages.length === 0
                                ? action.msg.content.slice(0, 40)
                                : c.title,
                            updatedAt: Date.now(),
                        }
                        : c
                ),
            };
        }
        case 'UPDATE_MESSAGE': {
            return {
                ...state,
                conversations: state.conversations.map(c =>
                    c.id === state.activeId
                        ? {
                            ...c,
                            messages: c.messages.map(m =>
                                m.id === action.id ? { ...m, ...action.patch } : m
                            ),
                            updatedAt: Date.now(),
                        }
                        : c
                ),
            };
        }
        case 'CLEAR_ACTIVE': {
            return {
                ...state,
                conversations: state.conversations.map(c =>
                    c.id === state.activeId ? { ...c, messages: [], updatedAt: Date.now() } : c
                ),
            };
        }
        case 'UPDATE_SETTINGS':
            return { ...state, settings: { ...state.settings, ...action.patch } };
        default:
            return state;
    }
}

const STORAGE_KEY = 'chattaio_state';

function loadState(): State {
    if (typeof window === 'undefined') return { conversations: [], activeId: null, settings: DEFAULT_SETTINGS };
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) return JSON.parse(raw);
    } catch { /* ignore */ }
    return { conversations: [], activeId: null, settings: DEFAULT_SETTINGS };
}

interface ChatContextValue extends State {
    dispatch: React.Dispatch<Action>;
    activeConversation: Conversation | null;
}

const ChatContext = createContext<ChatContextValue | null>(null);

export function ChatProvider({ children }: { children: React.ReactNode }) {
    const [state, dispatch] = useReducer(reducer, undefined, loadState);

    // Persist
    useEffect(() => {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    }, [state]);

    const activeConversation = state.conversations.find(c => c.id === state.activeId) ?? null;

    return (
        <ChatContext.Provider value={{ ...state, dispatch, activeConversation }}>
            {children}
        </ChatContext.Provider>
    );
}

export function useChatStore() {
    const ctx = useContext(ChatContext);
    if (!ctx) throw new Error('useChatStore must be inside ChatProvider');
    return ctx;
}
