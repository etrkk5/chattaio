'use client';

import { useEffect, useRef } from 'react';
import { DocumentTextIcon, CheckCircleIcon, XCircleIcon, ClockIcon } from '@heroicons/react/24/outline';
import { UploadCardData } from '@/lib/types';
import { getJobStatus, IngestJobResponse } from '@/lib/api';
import { useChatStore } from '@/lib/store';
import clsx from 'clsx';

interface Props {
    data: UploadCardData;
    messageId: string;
}

function statusIcon(status: UploadCardData['status']) {
    switch (status) {
        case 'done': return <CheckCircleIcon className="h-5 w-5 text-green-400" />;
        case 'failed': return <XCircleIcon className="h-5 w-5 text-red-400" />;
        default: return <ClockIcon className="h-5 w-5 text-yellow-400 animate-spin" />;
    }
}

export default function UploadCard({ data, messageId }: Props) {
    const { dispatch } = useChatStore();
    const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

    useEffect(() => {
        if (!data.jobId || data.status === 'done' || data.status === 'failed') return;

        const poll = async () => {
            try {
                const res: IngestJobResponse = await getJobStatus(data.jobId!);
                const newStatus = res.status === 'completed' ? 'done'
                    : res.status === 'failed' ? 'failed'
                        : 'processing';

                dispatch({ type: 'UPDATE_MESSAGE', id: messageId, patch: { uploadCard: { ...data, status: newStatus } } });

                if (newStatus === 'done') {
                    clearInterval(pollingRef.current!);
                    // Append system message
                    dispatch({
                        type: 'APPEND_MESSAGE',
                        msg: {
                            id: crypto.randomUUID(),
                            role: 'system',
                            content: `✅ Indexed: ${data.filename}`,
                            createdAt: Date.now(),
                        },
                    });
                } else if (newStatus === 'failed') {
                    clearInterval(pollingRef.current!);
                }
            } catch {
                // silent
            }
        };

        pollingRef.current = setInterval(poll, 2000);
        return () => clearInterval(pollingRef.current!);
    }, [data.jobId, data.status]);

    return (
        <div className="flex justify-end">
            <div className={clsx(
                'flex items-center gap-3 rounded-xl px-4 py-3 text-sm max-w-xs',
                'bg-gray-800 border border-gray-700'
            )}>
                <DocumentTextIcon className="h-5 w-5 text-gray-400 shrink-0" />
                <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-200 truncate">{data.filename}</p>
                    <p className={clsx('text-xs mt-0.5 capitalize', {
                        'text-yellow-400': data.status === 'queued' || data.status === 'processing',
                        'text-green-400': data.status === 'done',
                        'text-red-400': data.status === 'failed',
                    })}>
                        {data.status}
                        {data.error && ` — ${data.error}`}
                    </p>
                </div>
                {statusIcon(data.status)}
            </div>
        </div>
    );
}
