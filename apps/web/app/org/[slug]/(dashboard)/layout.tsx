'use client';

import { useSession, signOut } from 'next-auth/react';
import { useParams } from 'next/navigation';
import { Calendar, LogOut, Shield, User } from 'lucide-react';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
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
import { API_URL } from '@/lib/config';

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const { data: session } = useSession();
    const params = useParams();
    const orgSlug = params.slug as string;
    const [isAdmin, setIsAdmin] = useState(false);

    // Check if user is admin
    useEffect(() => {
        async function checkAdmin() {
            if (!session?.user?.email) return;
            try {
                const res = await fetch(`${API_URL}/api/orgs/${orgSlug}/admin/stats`, {
                    headers: {
                        'x-user-email': session.user.email,
                        'x-user-name': session.user.name || '',
                    },
                });
                // If we can access admin stats, user is admin
                setIsAdmin(res.ok);
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
        <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-primary/10">
            {/* Header */}
            <header className="sticky top-0 z-50 border-b bg-background/80 backdrop-blur-sm">
                <div className="container flex h-16 items-center justify-between">
                    <div className="flex items-center gap-6">
                        <Link href={`/org/${orgSlug}/book`} className="flex items-center gap-2">
                            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary text-primary-foreground">
                                <Calendar className="h-4 w-4" />
                            </div>
                            <span className="font-semibold">SmashIt</span>
                        </Link>
                        <nav className="hidden md:flex items-center gap-4">
                            <Link
                                href={`/org/${orgSlug}/book`}
                                className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                            >
                                Book
                            </Link>
                            <Link
                                href={`/org/${orgSlug}/my-bookings`}
                                className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                            >
                                My Bookings
                            </Link>
                        </nav>
                    </div>

                    {/* User Menu */}
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="flex items-center gap-2 px-2">
                                <Avatar className="h-8 w-8">
                                    <AvatarImage src={session?.user?.image || ''} />
                                    <AvatarFallback className="text-xs">
                                        {getInitials(session?.user?.name || 'U')}
                                    </AvatarFallback>
                                </Avatar>
                                <span className="hidden md:block text-sm font-medium">
                                    {session?.user?.name}
                                </span>
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-56">
                            <DropdownMenuLabel>
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
                                        Admin Dashboard
                                    </Link>
                                </DropdownMenuItem>
                            )}
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                                onClick={handleLogout}
                                className="text-destructive cursor-pointer"
                            >
                                <LogOut className="mr-2 h-4 w-4" />
                                Sign Out
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </header>

            {/* Main Content */}
            <main className="container py-6">{children}</main>
        </div>
    );
}
