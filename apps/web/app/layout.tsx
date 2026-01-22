import type { Metadata } from 'next';
import { Inter, Cormorant_Garamond } from 'next/font/google';
import './globals.css';
import { Providers } from './providers';
import { Toaster } from 'sonner';

const inter = Inter({
    subsets: ['latin'],
    variable: '--font-inter',
});

const cormorant = Cormorant_Garamond({
    subsets: ['latin'],
    variable: '--font-display',
    weight: ['400', '500', '600', '700'],
});

export const metadata: Metadata = {
    title: 'Avith — Premium Sports Booking',
    description: 'Elegant booking solutions for private communities',
};

export default function RootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <html lang="en">
            <body className={`${inter.variable} ${cormorant.variable} font-sans`}>
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
