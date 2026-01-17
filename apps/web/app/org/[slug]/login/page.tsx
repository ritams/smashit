'use client';

import { signIn, useSession } from 'next-auth/react';
import { useRouter, useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Calendar, Users, Clock, Loader2 } from 'lucide-react';
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
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 via-background to-primary/10">
                <Loader2 className="h-8 w-8 text-primary animate-spin" />
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 via-background to-primary/10 p-4">
                <Card className="w-full max-w-md border-0 shadow-xl">
                    <CardContent className="pt-6 text-center space-y-4">
                        <div className="w-16 h-16 mx-auto rounded-full bg-red-100 flex items-center justify-center">
                            <Calendar className="h-8 w-8 text-red-600" />
                        </div>
                        <h2 className="text-xl font-semibold">Organization Not Found</h2>
                        <p className="text-muted-foreground">
                            The organization &quot;{orgSlug}&quot; doesn&apos;t exist.
                        </p>
                        <Button variant="outline" onClick={() => router.push('/')}>
                            Go to Home
                        </Button>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 via-background to-primary/10 p-4">
            <div className="w-full max-w-md space-y-8">
                {/* Logo and Title */}
                <div className="text-center space-y-2">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary text-primary-foreground shadow-lg shadow-primary/30">
                        <Calendar className="h-8 w-8" />
                    </div>
                    <h1 className="text-3xl font-bold tracking-tight">
                        {orgName || 'Loading...'}
                    </h1>
                    <p className="text-muted-foreground">Sign in to book your space</p>
                </div>

                {/* Login Card */}
                <Card className="border-0 shadow-xl shadow-black/5">
                    <CardHeader className="text-center pb-2">
                        <CardTitle className="text-xl">Welcome</CardTitle>
                        <CardDescription>
                            Sign in with Google to access the booking system
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <Button
                            onClick={() => signIn('google', { callbackUrl: `/org/${orgSlug}/book` })}
                            className="w-full h-12 text-base gap-3"
                            size="lg"
                        >
                            <svg className="h-5 w-5" viewBox="0 0 24 24">
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

                        <p className="text-center text-sm text-muted-foreground">
                            Anyone can sign in. Your first login creates your account.
                        </p>
                    </CardContent>
                </Card>

                {/* Features */}
                <div className="grid grid-cols-3 gap-4 text-center text-sm">
                    <div className="space-y-2">
                        <div className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-primary/10 text-primary">
                            <Calendar className="h-5 w-5" />
                        </div>
                        <p className="text-muted-foreground">Easy Booking</p>
                    </div>
                    <div className="space-y-2">
                        <div className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-primary/10 text-primary">
                            <Users className="h-5 w-5" />
                        </div>
                        <p className="text-muted-foreground">See Others</p>
                    </div>
                    <div className="space-y-2">
                        <div className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-primary/10 text-primary">
                            <Clock className="h-5 w-5" />
                        </div>
                        <p className="text-muted-foreground">Real-time</p>
                    </div>
                </div>
            </div>
        </div>
    );
}
