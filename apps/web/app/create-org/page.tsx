'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession, signIn, signOut } from 'next-auth/react';
import Link from 'next/link';
import { Check, X, Loader2, ArrowLeft, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

import { API_URL } from '@/lib/config';

export default function CreateOrgPage() {
    const { data: session, status } = useSession();
    const router = useRouter();
    const [name, setName] = useState('');
    const [slug, setSlug] = useState('');
    const [slugAvailable, setSlugAvailable] = useState<boolean | null>(null);
    const [checkingSlug, setCheckingSlug] = useState(false);
    const [isCreating, setIsCreating] = useState(false);
    const [error, setError] = useState('');

    // Auto-generate slug from name
    useEffect(() => {
        const generatedSlug = name
            .toLowerCase()
            .replace(/[^a-z0-9\s-]/g, '')
            .replace(/\s+/g, '-')
            .replace(/-+/g, '-')
            .trim();
        setSlug(generatedSlug);
    }, [name]);

    // Check slug availability with debounce
    useEffect(() => {
        if (!slug || slug.length < 2) {
            setSlugAvailable(null);
            return;
        }

        const timer = setTimeout(async () => {
            setCheckingSlug(true);
            try {
                const res = await fetch(`${API_URL}/api/orgs/check-slug/${slug}`);
                if (!res.ok) {
                    throw new Error(`Server error: ${res.status}`);
                }
                const data = await res.json();
                setSlugAvailable(data.data?.available ?? false);
                setError('');
            } catch (err: any) {
                console.error('Slug check failed:', err);
                setSlugAvailable(null);
                setError(`Failed to check availability: ${err.message || 'Network error'}`);
            }
            setCheckingSlug(false);
        }, 500);

        return () => clearTimeout(timer);
    }, [slug]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!slugAvailable || !name || !slug || !session?.user) return;

        setIsCreating(true);
        setError('');

        try {
            const res = await fetch(`${API_URL}/api/orgs`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-user-email': session.user.email || '',
                    'x-user-name': session.user.name || '',
                    'x-user-google-id': (session.user as any).googleId || '',
                    'x-user-avatar': session.user.image || '',
                },
                body: JSON.stringify({ name, slug }),
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error?.message || 'Failed to create organization');
            }

            // Redirect to the org's admin page
            router.push(`/org/${slug}/admin`);
        } catch (err: any) {
            setError(err.message);
            setIsCreating(false);
        }
    };

    // Show loading state
    if (status === 'loading') {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background">
                <Loader2 className="h-6 w-6 text-muted-foreground animate-spin" />
            </div>
        );
    }

    // Show login prompt if not authenticated
    if (!session) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center p-4">
                <div className="w-full max-w-sm space-y-6">
                    <Link
                        href="/"
                        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
                    >
                        <ArrowLeft className="h-4 w-4" />
                        Back to home
                    </Link>

                    <div className="text-center space-y-2">
                        <span className="text-lg font-medium tracking-tight text-muted-foreground">
                            avith
                        </span>
                        <h1 className="text-2xl font-medium">Create your community</h1>
                        <p className="text-muted-foreground text-sm">
                            Sign in to create and manage your organization
                        </p>
                    </div>

                    <Card className="border border-border">
                        <CardContent className="pt-6 space-y-4">
                            <Button
                                onClick={() => signIn('google', { callbackUrl: '/create-org' })}
                                variant="outline"
                                className="w-full h-11 text-sm gap-3 border-border hover:bg-muted"
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
                                Sign in with Google
                            </Button>
                            <p className="text-center text-xs text-muted-foreground">
                                You&apos;ll become the admin of your organization
                            </p>
                        </CardContent>
                    </Card>
                </div>
            </div>
        );
    }

    // Show org creation form for authenticated users
    return (
        <div className="min-h-screen bg-background flex items-center justify-center p-4">
            <div className="w-full max-w-sm space-y-6">
                {/* Back link */}
                <Link
                    href="/dashboard"
                    className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                    <ArrowLeft className="h-4 w-4" />
                    Back to dashboard
                </Link>

                {/* Header */}
                <div className="text-center space-y-2">
                    <span className="text-lg font-medium tracking-tight text-muted-foreground">
                        avith
                    </span>
                    <h1 className="text-2xl font-medium">Create your community</h1>
                    <p className="text-muted-foreground text-sm">
                        Signed in as {session.user?.name}
                    </p>
                    <Button
                        variant="ghost"
                        size="sm"
                        className="text-muted-foreground text-xs"
                        onClick={() => signOut({ callbackUrl: '/create-org' })}
                    >
                        <LogOut className="h-3 w-3 mr-1" />
                        Switch account
                    </Button>
                </div>

                {/* Form */}
                <Card className="border border-border">
                    <CardContent className="pt-6">
                        <form onSubmit={handleSubmit} className="space-y-5">
                            {/* Organization Name */}
                            <div className="space-y-2">
                                <Label htmlFor="name">Community name</Label>
                                <Input
                                    id="name"
                                    type="text"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    placeholder="e.g., Oakwood Country Club"
                                    className="h-11"
                                    required
                                />
                            </div>

                            {/* Slug / URL */}
                            <div className="space-y-2">
                                <Label htmlFor="slug">Your URL</Label>
                                <div className="relative">
                                    <div className="flex items-center">
                                        <span className="px-3 h-11 flex items-center rounded-l-md border border-r-0 border-input bg-muted text-muted-foreground text-xs">
                                            /org/
                                        </span>
                                        <Input
                                            id="slug"
                                            type="text"
                                            value={slug}
                                            onChange={(e) =>
                                                setSlug(
                                                    e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '')
                                                )
                                            }
                                            placeholder="your-community"
                                            className="rounded-l-none h-11"
                                            required
                                            minLength={2}
                                        />
                                    </div>

                                    {/* Availability indicator */}
                                    {slug.length >= 2 && (
                                        <div className="absolute right-3 top-1/2 -translate-y-1/2">
                                            {checkingSlug ? (
                                                <Loader2 className="h-4 w-4 text-muted-foreground animate-spin" />
                                            ) : slugAvailable ? (
                                                <Check className="h-4 w-4 text-success" />
                                            ) : slugAvailable === false ? (
                                                <X className="h-4 w-4 text-destructive" />
                                            ) : null}
                                        </div>
                                    )}
                                </div>

                                {slug.length >= 2 && !checkingSlug && (
                                    <p
                                        className={`text-xs ${slugAvailable
                                            ? 'text-success'
                                            : slugAvailable === false
                                                ? 'text-destructive'
                                                : 'text-muted-foreground'
                                            }`}
                                    >
                                        {slugAvailable
                                            ? 'This URL is available'
                                            : slugAvailable === false
                                                ? 'This URL is already taken'
                                                : ''}
                                    </p>
                                )}
                            </div>

                            {error && (
                                <p className="text-xs text-destructive bg-destructive/10 px-3 py-2 rounded-md">
                                    {error}
                                </p>
                            )}

                            <Button
                                type="submit"
                                className="w-full h-11"
                                disabled={!slugAvailable || isCreating || !name}
                            >
                                {isCreating ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Creating...
                                    </>
                                ) : (
                                    'Create community'
                                )}
                            </Button>
                        </form>
                    </CardContent>
                </Card>

                <p className="text-center text-xs text-muted-foreground">
                    You&apos;ll be the admin of this community
                </p>
            </div>
        </div>
    );
}
