'use client';

import { signIn, useSession } from 'next-auth/react';
import { useRouter, useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';
import { API_URL } from '@/lib/config';

export default function OrgLoginPage() {
    const { data: session, status } = useSession();
    const router = useRouter();
    const params = useParams();
    const orgSlug = params.slug as string;
    const [orgName, setOrgName] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    // Fetch org details
    useEffect(() => {
        async function fetchOrg() {
            try {
                const res = await fetch(`${API_URL}/api/orgs/${orgSlug}`);
                if (!res.ok) {
                    setError('Organization not found');
                    return;
                }
                const data = await res.json();
                setOrgName(data.data?.name || orgSlug);
            } catch (err) {
                setError('Failed to load organization');
            }
        }
        fetchOrg();
    }, [orgSlug]);

    useEffect(() => {
        if (status === 'authenticated') {
            router.push(`/org/${orgSlug}/book`);
        }
    }, [status, router, orgSlug]);

    if (status === 'loading') {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background">
                <Loader2 className="h-6 w-6 text-muted-foreground animate-spin" />
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background p-4">
                <Card className="w-full max-w-sm border border-border">
                    <CardContent className="pt-8 text-center space-y-4">
                        <h2 className="text-lg font-medium">Organization not found</h2>
                        <p className="text-sm text-muted-foreground">
                            The organization &quot;{orgSlug}&quot; doesn&apos;t exist.
                        </p>
                        <Button variant="outline" onClick={() => router.push('/')}>
                            Go to home
                        </Button>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-background p-4 relative overflow-hidden">
            {/* Ambient Background */}
            <div className="absolute inset-0 w-full h-full">
                <div className="absolute top-[-20%] right-[-10%] w-[800px] h-[800px] rounded-full bg-primary/5 blur-[120px] pointer-events-none" />
                <div className="absolute bottom-[-20%] left-[-10%] w-[600px] h-[600px] rounded-full bg-blue-500/5 blur-[120px] pointer-events-none" />
            </div>

            <div className="w-full max-w-sm space-y-8 relative z-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
                {/* Logo and Title */}
                <div className="text-center space-y-4">
                    <div className="flex justify-center mb-6">
                        <span className="text-2xl font-medium tracking-tight bg-gradient-to-br from-foreground to-foreground/60 bg-clip-text text-transparent">
                            avith
                        </span>
                    </div>
                    <div className="space-y-2">
                        <h1 className="text-3xl font-semibold tracking-tight">
                            {orgName || 'Loading...'}
                        </h1>
                        <p className="text-muted-foreground text-sm">
                            Sign in to reserve your space
                        </p>
                    </div>
                </div>

                {/* Login Card */}
                <Card className="border-border/50 bg-background/60 backdrop-blur-xl shadow-xl shadow-primary/5">
                    <CardHeader className="text-center pb-2">
                        <CardTitle className="text-lg font-medium">Welcome</CardTitle>
                        <CardDescription className="text-sm">
                            Continue with your account
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4 pt-6">
                        <Button
                            onClick={() => signIn('google', { callbackUrl: `/org/${orgSlug}/book` })}
                            variant="outline"
                            className="w-full h-11 text-sm gap-3 border-border hover:bg-background hover:text-foreground transition-all duration-300 hover:shadow-md hover:border-primary/20"
                            size="lg"
                        >
                            <svg className="h-4 w-4" viewBox="0 0 24 24">
                                <path
                                    fill="currentColor"
                                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                                />
                                <path
                                    fill="currentColor"
                                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                                />
                                <path
                                    fill="currentColor"
                                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                                />
                                <path
                                    fill="currentColor"
                                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                                />
                            </svg>
                            Continue with Google
                        </Button>

                        <p className="text-center text-[10px] text-muted-foreground/60 uppercase tracking-widest pt-2">
                            Secure Access
                        </p>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
