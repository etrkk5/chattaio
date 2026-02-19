'use client';

import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import {
    ClipboardDocumentIcon, ArrowPathIcon, HandThumbUpIcon,
    HandThumbDownIcon, ChevronDownIcon, ChevronUpIcon, ExclamationCircleIcon,
} from '@heroicons/react/24/outline';
import { HandThumbUpIcon as ThumbUpSolid, HandThumbDownIcon as ThumbDownSolid } from '@heroicons/react/24/solid';
import { Message } from '@/lib/types';
import { useChatStore } from '@/lib/store';
import UploadCard from '@/components/UploadCard';
import clsx from 'clsx';

interface Props {
    message: Message;
    onRegenerate?: () => void;
}

function CopyButton({ text }: { text: string }) {
    const [copied, setCopied] = useState(false);
    const copy = () => {
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };
    return (
        <button onClick={copy} className="px-2 py-0.5 rounded text-xs text-gray-400 hover:text-white transition-colors">
            {copied ? 'Copied!' : <ClipboardDocumentIcon className="h-3.5 w-3.5" />}
        </button>
    );
}

function MarkdownContent({ content }: { content: string }) {
    return (
        <div className="prose prose-invert prose-sm max-w-none">
            <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                    code({ className, children, ...props }) {
                        const match = /language-(\w+)/.exec(className || '');
                        const code = String(children).replace(/\n$/, '');
                        if (match) {
                            return (
                                <div className="relative group my-2">
                                    <div className="absolute right-2 top-2 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                                        <CopyButton text={code} />
                                    </div>
                                    <SyntaxHighlighter
                                        style={oneDark as Record<string, React.CSSProperties>}
                                        language={match[1]}
                                        PreTag="div"
                                        className="!rounded-lg !text-sm"
                                    >
                                        {code}
                                    </SyntaxHighlighter>
                                </div>
                            );
                        }
                        return <code className="bg-gray-800 rounded px-1 py-0.5 text-sm font-mono" {...props}>{children}</code>;
                    },
                    table({ children }) {
                        return (
                            <div className="overflow-x-auto my-2">
                                <table className="min-w-full text-sm border-collapse">{children}</table>
                            </div>
                        );
                    },
                    th({ children }) {
                        return <th className="border border-gray-600 px-3 py-1 bg-gray-800 text-left font-semibold">{children}</th>;
                    },
                    td({ children }) {
                        return <td className="border border-gray-600 px-3 py-1">{children}</td>;
                    },
                    a({ href, children }) {
                        return <a href={href} target="_blank" rel="noopener noreferrer" className="text-indigo-400 underline">{children}</a>;
                    },
                }}
            >
                {content}
            </ReactMarkdown>
        </div>
    );
}

function Citations({ citations }: { citations: NonNullable<Message['citations']> }) {
    const [expanded, setExpanded] = useState<Record<number, boolean>>({});
    return (
        <div className="mt-3 border-t border-gray-600 pt-2 space-y-1.5">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Sources</p>
            {citations.map(c => (
                <div key={c.id} className="text-xs">
                    <button
                        onClick={() => setExpanded(e => ({ ...e, [c.id]: !e[c.id] }))}
                        className="flex items-center gap-1 text-indigo-400 hover:text-indigo-300"
                    >
                        [{c.id}] {c.source}
                        {c.snippet && (expanded[c.id] ? <ChevronUpIcon className="h-3 w-3" /> : <ChevronDownIcon className="h-3 w-3" />)}
                    </button>
                    {expanded[c.id] && c.snippet && (
                        <p className="mt-1 pl-4 text-gray-300 italic border-l-2 border-gray-600">{c.snippet}</p>
                    )}
                </div>
            ))}
        </div>
    );
}

export default function MessageBubble({ message, onRegenerate }: Props) {
    const { dispatch } = useChatStore();

    const setLike = (v: boolean | null) =>
        dispatch({ type: 'UPDATE_MESSAGE', id: message.id, patch: { liked: v } });

    if (message.uploadCard) {
        return <UploadCard data={message.uploadCard} messageId={message.id} />;
    }

    if (message.role === 'system') {
        return (
            <div className="flex justify-center">
                <span className="text-xs text-gray-500 bg-gray-800 rounded-full px-3 py-1">{message.content}</span>
            </div>
        );
    }

    const isUser = message.role === 'user';

    return (
        <div className={clsx('flex gap-3', isUser ? 'justify-end' : 'justify-start')}>
            {!isUser && (
                <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center shrink-0 mt-1">
                    <span className="text-xs font-bold text-white">AI</span>
                </div>
            )}

            <div className={clsx('max-w-[75%] space-y-1', isUser ? 'items-end' : 'items-start')}>
                <div
                    className={clsx(
                        'rounded-2xl px-4 py-3 text-sm leading-relaxed',
                        isUser
                            ? 'bg-indigo-600 text-white rounded-tr-sm'
                            : message.error
                                ? 'bg-red-900/30 border border-red-700 text-red-200 rounded-tl-sm'
                                : 'bg-gray-800 text-gray-100 rounded-tl-sm'
                    )}
                >
                    {message.error && (
                        <div className="flex items-center gap-1.5 mb-1 text-red-400 text-xs">
                            <ExclamationCircleIcon className="h-3.5 w-3.5" />
                            Error
                        </div>
                    )}
                    {isUser ? (
                        <p className="whitespace-pre-wrap">{message.content}</p>
                    ) : message.isStreaming && !message.content ? (
                        <div className="flex gap-1 py-1">
                            <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:0ms]" />
                            <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:150ms]" />
                            <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:300ms]" />
                        </div>
                    ) : (
                        <MarkdownContent content={message.content} />
                    )}
                    {!isUser && message.citations && message.citations.length > 0 && (
                        <Citations citations={message.citations} />
                    )}
                </div>

                {/* Action row for assistant */}
                {!isUser && !message.isStreaming && (
                    <div className="flex items-center gap-1 px-1">
                        <button
                            onClick={() => navigator.clipboard.writeText(message.content)}
                            className="p-1 text-gray-500 hover:text-gray-300 transition-colors"
                            title="Copy"
                        >
                            <ClipboardDocumentIcon className="h-3.5 w-3.5" />
                        </button>
                        {onRegenerate && (
                            <button
                                onClick={onRegenerate}
                                className="p-1 text-gray-500 hover:text-gray-300 transition-colors"
                                title="Regenerate"
                            >
                                <ArrowPathIcon className="h-3.5 w-3.5" />
                            </button>
                        )}
                        <button
                            onClick={() => setLike(message.liked === true ? null : true)}
                            className={clsx('p-1 transition-colors', message.liked === true ? 'text-green-400' : 'text-gray-500 hover:text-gray-300')}
                            title="Like"
                        >
                            {message.liked === true ? <ThumbUpSolid className="h-3.5 w-3.5" /> : <HandThumbUpIcon className="h-3.5 w-3.5" />}
                        </button>
                        <button
                            onClick={() => setLike(message.liked === false ? null : false)}
                            className={clsx('p-1 transition-colors', message.liked === false ? 'text-red-400' : 'text-gray-500 hover:text-gray-300')}
                            title="Dislike"
                        >
                            {message.liked === false ? <ThumbDownSolid className="h-3.5 w-3.5" /> : <HandThumbDownIcon className="h-3.5 w-3.5" />}
                        </button>
                    </div>
                )}
            </div>

            {isUser && (
                <div className="w-8 h-8 rounded-full bg-gray-600 flex items-center justify-center shrink-0 mt-1">
                    <span className="text-xs font-bold text-white">U</span>
                </div>
            )}
        </div>
    );
}
