import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Providers } from './providers';
import { Toaster } from 'sonner';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
    title: 'SmashIt - Book Your Space',
    description: 'Easy scheduling and booking for your organization',
};

export default function RootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <html lang="en">
            <body className={inter.className}>
                <Providers>{children}</Providers>
                <Toaster
                    position="bottom-right"
                    toastOptions={{
                        style: {
                            background: 'hsl(var(--background))',
                            border: '1px solid hsl(var(--border))',
                            color: 'hsl(var(--foreground))',
                        },
                    }}
                    closeButton
                    richColors
                />
            </body>
        </html>
    );
}
