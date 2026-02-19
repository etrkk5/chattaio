export type QueryMode = 'hybrid' | 'local' | 'global' | 'naive';

export interface Citation {
    id: number;
    source: string;
    snippet?: string;
}

export interface Message {
    id: string;
    role: 'user' | 'assistant' | 'system';
    content: string;
    citations?: Citation[];
    liked?: boolean | null; // true=like, false=dislike, null=neutral
    createdAt: number;
    isStreaming?: boolean;
    error?: boolean;
    uploadCard?: UploadCardData;
}

export interface UploadCardData {
    filename: string;
    status: 'queued' | 'processing' | 'done' | 'failed';
    jobId?: string;
    error?: string;
}

export interface Conversation {
    id: string;
    title: string;
    messages: Message[];
    updatedAt: number;
}

export interface ChatSettings {
    mode: QueryMode;
    topK: number;
    citations: boolean;
    systemPrompt: string;
}

export const DEFAULT_SETTINGS: ChatSettings = {
    mode: 'hybrid',
    topK: 10,
    citations: true,
    systemPrompt: '',
};
