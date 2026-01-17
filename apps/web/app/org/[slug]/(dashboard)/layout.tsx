'use client';

import { useSession, signOut } from 'next-auth/react';
import { useParams } from 'next/navigation';
import { Calendar, LogOut, Settings, User } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { getInitials } from '@/lib/utils';

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const { data: session } = useSession();
    const params = useParams();
    const orgSlug = params.slug as string;

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

                    <div className="flex items-center gap-4">
                        <Link href={`/org/${orgSlug}/admin`}>
                            <Button variant="ghost" size="icon">
                                <Settings className="h-4 w-4" />
                            </Button>
                        </Link>
                        <div className="flex items-center gap-3">
                            <Avatar className="h-8 w-8">
                                <AvatarImage src={session?.user?.image || ''} />
                                <AvatarFallback className="text-xs">
                                    {getInitials(session?.user?.name || 'U')}
                                </AvatarFallback>
                            </Avatar>
                            <span className="hidden md:block text-sm font-medium">
                                {session?.user?.name}
                            </span>
                        </div>
                        <Button variant="ghost" size="icon" onClick={() => signOut()}>
                            <LogOut className="h-4 w-4" />
                        </Button>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="container py-6">{children}</main>
        </div>
    );
}
