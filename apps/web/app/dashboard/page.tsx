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
                        <Link href="/" className="group">
                            <span className="font-display text-2xl font-medium tracking-tight text-foreground transition-colors">
                                Avith
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
                    <div className="space-y-4 pt-4">
                        <h1 className="font-display text-4xl font-medium tracking-tight">
                            Welcome, {session.user?.name?.split(' ')[0]}
                        </h1>
                        <p className="text-lg text-muted-foreground font-light">
                            Manage your organizations and bespoke booking systems
                        </p>
                    </div>

                    {/* Organizations */}
                    <Card className="border border-border/60 shadow-sm bg-card/30 backdrop-blur-[2px] rounded-xl overflow-hidden">
                        <CardHeader className="pb-6 pt-8 px-8 border-b border-border/40">
                            <div className="flex items-center justify-between">
                                <CardTitle className="flex items-center gap-3 text-lg font-medium tracking-tight">
                                    <Building2 className="h-5 w-5 text-muted-foreground/70" />
                                    Your organizations
                                </CardTitle>
                                <Link href="/create-org">
                                    <Button size="sm" variant="outline" className="h-10 px-6 font-medium transition-all hover:bg-primary hover:text-primary-foreground hover:border-primary">
                                        <PlusCircle className="h-4 w-4 mr-2" />
                                        Create New
                                    </Button>
                                </Link>
                            </div>
                        </CardHeader>
                        <CardContent className="p-8">
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
                                            className="flex items-center justify-between p-6 rounded-xl border border-border/40 hover:border-border hover:bg-muted/30 transition-all group"
                                        >
                                            <div className="flex items-center gap-4">
                                                <div className="w-12 h-12 rounded-xl bg-primary/5 flex items-center justify-center border border-primary/10 transition-colors group-hover:bg-primary/10">
                                                    <Building2 className="h-5 w-5 text-primary" />
                                                </div>
                                                <div className="space-y-1">
                                                    <p className="font-medium text-base tracking-tight">{org.name}</p>
                                                    <p className="text-xs text-muted-foreground/80 font-medium tracking-wide">
                                                        /org/{org.slug} •{' '}
                                                        <span
                                                            className={
                                                                org.role === 'ADMIN'
                                                                    ? 'text-primary/80 uppercase'
                                                                    : 'uppercase'
                                                            }
                                                        >
                                                            {org.role}
                                                        </span>
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-3">
                                                {org.role === 'ADMIN' && (
                                                    <Link href={`/org/${org.slug}/admin`}>
                                                        <Button variant="ghost" size="sm" className="h-10 w-10 p-0 rounded-lg hover:bg-muted transition-colors">
                                                            <Settings className="h-4 w-4 text-muted-foreground" />
                                                        </Button>
                                                    </Link>
                                                )}
                                                <Link href={`/org/${org.slug}/book`}>
                                                    <Button size="sm" className="h-10 px-6 font-medium bg-primary hover:scale-[1.02] active:scale-[0.98] transition-all">
                                                        <Calendar className="h-4 w-4 mr-2" />
                                                        Book Space
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
