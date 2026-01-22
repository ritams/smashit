'use client';

import { useSession, signOut } from 'next-auth/react';
import { useParams, usePathname } from 'next/navigation';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { api } from '@/lib/api-client';
import { MobileNav } from '@/components/layout/MobileNav';
import { UserNav } from '@/components/layout/UserNav';

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const { data: session } = useSession();
    const params = useParams();
    const pathname = usePathname();
    const orgSlug = params.slug as string;
    const [isAdmin, setIsAdmin] = useState(false);

    // Check if user is admin
    useEffect(() => {
        async function checkAdmin() {
            if (!session?.user?.email) return;
            try {
                // If we can access admin stats, user is admin
                await api.getStats(orgSlug);
                setIsAdmin(true);
            } catch {
                setIsAdmin(false);
            }
        }
        checkAdmin();
    }, [session, orgSlug]);

    const handleLogout = async () => {
        await signOut({ redirect: true, callbackUrl: `/org/${orgSlug}/login` });
    };

    return (
        <div className="min-h-screen bg-background">
            {/* Header */}
            <header className="hidden md:flex sticky top-0 z-50 border-b border-border bg-background">
                <div className="container flex h-14 items-center justify-between">
                    <div className="flex items-center gap-8">
                        <Link href={`/org/${orgSlug}/book`} className="group">
                            <span className="font-display text-xl font-medium tracking-tight text-foreground/90 transition-colors group-hover:text-primary">
                                Avith
                            </span>
                        </Link>
                        <nav className="hidden md:flex items-center gap-3">
                            <Link
                                href={`/org/${orgSlug}/facilities`}
                                className={cn(
                                    "text-[13px] font-medium transition-colors px-2 py-1",
                                    pathname?.includes('/facilities')
                                        ? "text-primary"
                                        : "text-muted-foreground hover:text-foreground"
                                )}
                            >
                                Facilities
                            </Link>
                            <Link
                                href={`/org/${orgSlug}/book`}
                                className={cn(
                                    "text-[13px] font-medium transition-colors px-2 py-1",
                                    pathname?.includes('/book')
                                        ? "text-primary"
                                        : "text-muted-foreground hover:text-foreground"
                                )}
                            >
                                Book
                            </Link>
                            <Link
                                href={`/org/${orgSlug}/my-bookings`}
                                className={cn(
                                    "text-[13px] font-medium transition-colors px-2 py-1",
                                    pathname?.includes('/my-bookings')
                                        ? "text-primary"
                                        : "text-muted-foreground hover:text-foreground"
                                )}
                            >
                                My Bookings
                            </Link>
                            {isAdmin && (
                                <Link
                                    href={`/org/${orgSlug}/admin`}
                                    className={cn(
                                        "text-[13px] font-medium transition-colors px-1 py-1",
                                        pathname?.includes('/admin')
                                            ? "text-primary"
                                            : "text-muted-foreground hover:text-foreground"
                                    )}
                                >
                                    Admin
                                </Link>
                            )}
                        </nav>
                    </div>

                    {/* User Menu */}
                    <UserNav orgSlug={orgSlug} isAdmin={isAdmin} />
                </div>
            </header>

            {/* Main Content */}
            <main className="container py-6 pb-24 md:pb-6">{children}</main>

            <MobileNav isAdmin={isAdmin} />
        </div>
    );
}
