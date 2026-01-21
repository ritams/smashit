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
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
        );
    }

    if (!session) {
        return null;
    }

    return (
        <div className="min-h-screen bg-background">
            {/* Header */}
            <header className="border-b border-border">
                <div className="container py-4">
                    <nav className="flex items-center justify-between">
                        <Link href="/dashboard" className="group">
                            <span className="text-xl font-medium tracking-tight">
                                avith
                            </span>
                        </Link>
                        <div className="flex items-center gap-4">
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <button className="flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-muted transition-colors cursor-pointer outline-none">
                                        <Avatar className="h-7 w-7">
                                            <AvatarImage src={session.user?.image || ''} />
                                            <AvatarFallback className="text-xs font-medium bg-primary text-primary-foreground">
                                                {getInitials(session.user?.name || 'U')}
                                            </AvatarFallback>
                                        </Avatar>
                                        <span className="text-sm font-medium hidden md:block">
                                            {session.user?.name}
                                        </span>
                                    </button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-48">
                                    <DropdownMenuLabel className="font-normal">
                                        <div className="flex flex-col space-y-1">
                                            <p className="text-sm font-medium">{session.user?.name}</p>
                                            <p className="text-xs text-muted-foreground">{session.user?.email}</p>
                                        </div>
                                    </DropdownMenuLabel>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem
                                        className="text-destructive focus:text-destructive cursor-pointer"
                                        onClick={() => signOut({ callbackUrl: '/' })}
                                    >
                                        <LogOut className="mr-2 h-4 w-4" />
                                        Sign out
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </div>
                    </nav>
                </div>
            </header>

            {/* Main Content */}
            <main className="container py-10">
                <div className="max-w-3xl mx-auto space-y-8">
                    {/* Welcome */}
                    <div className="space-y-1">
                        <h1 className="text-2xl font-medium">
                            Welcome, {session.user?.name?.split(' ')[0]}
                        </h1>
                        <p className="text-muted-foreground">
                            Manage your organizations and bookings
                        </p>
                    </div>

                    {/* Organizations */}
                    <Card className="border border-border">
                        <CardHeader className="pb-4">
                            <div className="flex items-center justify-between">
                                <CardTitle className="flex items-center gap-2 text-base font-medium">
                                    <Building2 className="h-4 w-4" />
                                    Your organizations
                                </CardTitle>
                                <Link href="/create-org">
                                    <Button size="sm" variant="outline">
                                        <PlusCircle className="h-4 w-4 mr-2" />
                                        Create
                                    </Button>
                                </Link>
                            </div>
                        </CardHeader>
                        <CardContent>
                            {loading ? (
                                <div className="space-y-3">
                                    <Skeleton className="h-14" />
                                    <Skeleton className="h-14" />
                                </div>
                            ) : orgs.length === 0 ? (
                                <div className="text-center py-8 text-muted-foreground">
                                    <Building2 className="h-10 w-10 mx-auto mb-3 opacity-40" />
                                    <p className="text-sm">You&apos;re not part of any organizations yet.</p>
                                    <p className="text-sm">Create one or join an existing one.</p>
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    {orgs.map((org) => (
                                        <div
                                            key={org.id}
                                            className="flex items-center justify-between p-4 rounded-lg border border-border hover:bg-muted/50 transition-colors"
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
                                                    <Building2 className="h-4 w-4 text-primary" />
                                                </div>
                                                <div>
                                                    <p className="font-medium text-sm">{org.name}</p>
                                                    <p className="text-xs text-muted-foreground">
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
                                                        <Button variant="ghost" size="sm">
                                                            <Settings className="h-4 w-4" />
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
