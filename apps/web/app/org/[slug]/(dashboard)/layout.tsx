'use client';

import { useSession, signOut } from 'next-auth/react';
import { useParams, usePathname } from 'next/navigation';
import { LogOut, Shield, User, LayoutGrid, Calendar } from 'lucide-react';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { getInitials } from '@/lib/utils';
import { api } from '@/lib/api-client';
import { MobileNav } from '@/components/layout/MobileNav';

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
                            <span className="font-display text-lg font-medium tracking-tight">
                                Avith
                            </span>
                        </Link>
                        <nav className="hidden md:flex items-center gap-1">
                            <Link
                                href={`/org/${orgSlug}/book`}
                                className={cn(
                                    "text-sm font-medium transition-colors px-3 py-2 rounded-md",
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
                                    "text-sm font-medium transition-colors px-3 py-2 rounded-md",
                                    pathname?.includes('/my-bookings')
                                        ? "text-primary"
                                        : "text-muted-foreground hover:text-foreground"
                                )}
                            >
                                My Bookings
                            </Link>
                        </nav>
                    </div>

                    {/* User Menu */}
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <button className="flex items-center gap-2 px-2 py-1 rounded-lg hover:bg-muted transition-colors cursor-pointer outline-none">
                                <Avatar className="h-7 w-7">
                                    <AvatarImage src={session?.user?.image || ''} />
                                    <AvatarFallback className="text-xs bg-primary text-primary-foreground">
                                        {getInitials(session?.user?.name || 'U')}
                                    </AvatarFallback>
                                </Avatar>
                                <span className="hidden md:block text-sm font-medium">
                                    {session?.user?.name}
                                </span>
                            </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48">
                            <DropdownMenuLabel className="font-normal">
                                <div className="flex flex-col space-y-1">
                                    <p className="text-sm font-medium">{session?.user?.name}</p>
                                    <p className="text-xs text-muted-foreground">
                                        {session?.user?.email}
                                    </p>
                                </div>
                            </DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem asChild>
                                <Link href={`/org/${orgSlug}/profile`} className="cursor-pointer">
                                    <User className="mr-2 h-4 w-4" />
                                    Profile
                                </Link>
                            </DropdownMenuItem>
                            {isAdmin && (
                                <DropdownMenuItem asChild>
                                    <Link href={`/org/${orgSlug}/admin`} className="cursor-pointer">
                                        <Shield className="mr-2 h-4 w-4" />
                                        Admin
                                    </Link>
                                </DropdownMenuItem>
                            )}
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                                onClick={handleLogout}
                                className="text-destructive cursor-pointer"
                            >
                                <LogOut className="mr-2 h-4 w-4" />
                                Sign out
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </header>

            {/* Main Content */}
            <main className="container py-6 pb-24 md:pb-6">{children}</main>

            <MobileNav />
        </div>
    );
}
