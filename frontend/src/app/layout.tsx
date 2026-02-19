import type { Metadata } from 'next';
import { Geist } from 'next/font/google';
import { ChatProvider } from '@/lib/store';
import './globals.css';

const geist = Geist({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Chatta.io — RAG Chat',
  description: 'ChatGPT-like interface for your RAG backend',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full">
      <body className={`${geist.className} h-full bg-gray-950 antialiased`}>
        <ChatProvider>
          {children}
        </ChatProvider>
      </body>
    </html>
  );
}
