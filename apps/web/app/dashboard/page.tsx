'use client';

import { useEffect, useState } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
    Calendar,
    PlusCircle,
    LogOut,
    Building2,
    Settings,
    Users,
    Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Skeleton } from '@/components/ui/skeleton';
import { getInitials } from '@/lib/utils';

import { api } from '@/lib/api-client';

interface OrgMembership {
    id: string;
    name: string;
    slug: string;
    role: 'ADMIN' | 'MEMBER';
}

export default function DashboardPage() {
    const { data: session, status } = useSession();
    const router = useRouter();
    const [orgs, setOrgs] = useState<OrgMembership[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (status === 'unauthenticated') {
            router.push('/');
        }
    }, [status, router]);

    useEffect(() => {
        async function fetchOrgs() {
            if (!session?.user?.email) return;

            try {
                const data = await api.getMyOrgs();
                setOrgs(data || []);
            } catch (err) {
                console.error('Failed to fetch orgs:', err);
            }
            setLoading(false);
        }
        fetchOrgs();
    }, [session?.user?.email]);

    if (status === 'loading') {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    if (!session) {
        return null;
    }

    return (
        <div className="min-h-screen bg-gradient-to-b from-background via-background to-primary/5">
            {/* Header */}
            <header className="container py-6">
                <nav className="flex items-center justify-between">
                    <Link href="/dashboard" className="flex items-center gap-2">
                        <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-primary text-primary-foreground">
                            <Calendar className="h-5 w-5" />
                        </div>
                        <span className="text-xl font-bold">SmashIt</span>
                    </Link>
                    <div className="flex items-center gap-4">
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <button className="flex items-center gap-3 px-3 py-1.5 rounded-full hover:bg-muted transition-all duration-300 cursor-pointer outline-none">
                                    <Avatar className="h-8 w-8 ring-2 ring-background shadow-sm">
                                        <AvatarImage src={session.user?.image || ''} />
                                        <AvatarFallback className="text-xs font-medium bg-gradient-to-br from-primary to-cyan-500 text-white">
                                            {getInitials(session.user?.name || 'U')}
                                        </AvatarFallback>
                                    </Avatar>
                                    <span className="text-sm font-medium hidden md:block">
                                        {session.user?.name}
                                    </span>
                                </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-56 mt-2">
                                <DropdownMenuLabel className="font-normal">
                                    <div className="flex flex-col space-y-1">
                                        <p className="text-sm font-medium">{session.user?.name}</p>
                                        <p className="text-xs text-muted-foreground">{session.user?.email}</p>
                                    </div>
                                </DropdownMenuLabel>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                    className="text-red-600 focus:text-red-600 focus:bg-red-50 cursor-pointer"
                                    onClick={() => signOut({ callbackUrl: '/' })}
                                >
                                    <LogOut className="mr-2 h-4 w-4" />
                                    Sign out
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                </nav>
            </header>

            {/* Main Content */}
            <main className="container py-8">
                <div className="max-w-4xl mx-auto space-y-8">
                    {/* Welcome */}
                    <div className="space-y-2">
                        <h1 className="text-3xl font-bold">
                            Welcome, {session.user?.name?.split(' ')[0]}!
                        </h1>
                        <p className="text-muted-foreground">
                            Manage your organizations and bookings
                        </p>
                    </div>

                    {/* Organizations */}
                    <Card>
                        <CardHeader>
                            <div className="flex items-center justify-between">
                                <CardTitle className="flex items-center gap-2">
                                    <Building2 className="h-5 w-5" />
                                    Your Organizations
                                </CardTitle>
                                <Link href="/create-org">
                                    <Button size="sm">
                                        <PlusCircle className="h-4 w-4 mr-2" />
                                        Create Organization
                                    </Button>
                                </Link>
                            </div>
                        </CardHeader>
                        <CardContent>
                            {loading ? (
                                <div className="space-y-3">
                                    <Skeleton className="h-16" />
                                    <Skeleton className="h-16" />
                                </div>
                            ) : orgs.length === 0 ? (
                                <div className="text-center py-8 text-muted-foreground">
                                    <Building2 className="h-12 w-12 mx-auto mb-4 opacity-50" />
                                    <p>You&apos;re not part of any organizations yet.</p>
                                    <p className="text-sm">Create one or join an existing one.</p>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {orgs.map((org) => (
                                        <div
                                            key={org.id}
                                            className="flex items-center justify-between p-4 rounded-lg border hover:bg-muted/50 transition-colors"
                                        >
                                            <div className="flex items-center gap-4">
                                                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                                                    <Building2 className="h-5 w-5 text-primary" />
                                                </div>
                                                <div>
                                                    <p className="font-medium">{org.name}</p>
                                                    <p className="text-sm text-muted-foreground">
                                                        /org/{org.slug} •{' '}
                                                        <span
                                                            className={
                                                                org.role === 'ADMIN'
                                                                    ? 'text-primary font-medium'
                                                                    : ''
                                                            }
                                                        >
                                                            {org.role}
                                                        </span>
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                {org.role === 'ADMIN' && (
                                                    <Link href={`/org/${org.slug}/admin`}>
                                                        <Button variant="outline" size="sm">
                                                            <Settings className="h-4 w-4 mr-2" />
                                                            Manage
                                                        </Button>
                                                    </Link>
                                                )}
                                                <Link href={`/org/${org.slug}/book`}>
                                                    <Button size="sm">
                                                        <Calendar className="h-4 w-4 mr-2" />
                                                        Book
                                                    </Button>
                                                </Link>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </main>
        </div>
    );
}
