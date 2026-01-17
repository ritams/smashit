'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession, signIn, signOut } from 'next-auth/react';
import Link from 'next/link';
import { Calendar, Check, X, Loader2, ArrowLeft, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

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
                const data = await res.json();
                setSlugAvailable(data.data?.available ?? false);
            } catch (err) {
                setSlugAvailable(null);
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
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-background via-background to-primary/5">
                <Loader2 className="h-8 w-8 text-primary animate-spin" />
            </div>
        );
    }

    // Show login prompt if not authenticated
    if (!session) {
        return (
            <div className="min-h-screen bg-gradient-to-b from-background via-background to-primary/5 flex items-center justify-center p-4">
                <div className="w-full max-w-md space-y-6">
                    <Link
                        href="/"
                        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
                    >
                        <ArrowLeft className="h-4 w-4" />
                        Back to home
                    </Link>

                    <div className="text-center space-y-2">
                        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-primary text-primary-foreground shadow-lg shadow-primary/30">
                            <Calendar className="h-7 w-7" />
                        </div>
                        <h1 className="text-2xl font-bold">Create Your Organization</h1>
                        <p className="text-muted-foreground">
                            Sign in first to create and manage your organization
                        </p>
                    </div>

                    <Card className="border-0 shadow-xl">
                        <CardContent className="pt-6 space-y-4">
                            <Button
                                onClick={() => signIn('google', { callbackUrl: '/create-org' })}
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
                                Sign in with Google
                            </Button>
                            <p className="text-center text-sm text-muted-foreground">
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
        <div className="min-h-screen bg-gradient-to-b from-background via-background to-primary/5 flex items-center justify-center p-4">
            <div className="w-full max-w-md space-y-6">
                {/* Back link */}
                <Link
                    href="/dashboard"
                    className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                    <ArrowLeft className="h-4 w-4" />
                    Back to dashboard
                </Link>

                {/* Logo */}
                <div className="text-center space-y-2">
                    <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-primary text-primary-foreground shadow-lg shadow-primary/30">
                        <Calendar className="h-7 w-7" />
                    </div>
                    <h1 className="text-2xl font-bold">Create Your Organization</h1>
                    <p className="text-muted-foreground">
                        Signed in as <strong>{session.user?.name}</strong>
                    </p>
                    <Button
                        variant="ghost"
                        size="sm"
                        className="text-muted-foreground"
                        onClick={() => signOut({ callbackUrl: '/create-org' })}
                    >
                        <LogOut className="h-4 w-4 mr-2" />
                        Switch Account
                    </Button>
                </div>

                {/* Form */}
                <Card className="border-0 shadow-xl">
                    <CardContent className="pt-6">
                        <form onSubmit={handleSubmit} className="space-y-6">
                            {/* Organization Name */}
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Organization Name</label>
                                <input
                                    type="text"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    placeholder="e.g., IISER Pune Sports Club"
                                    className="w-full px-4 py-3 rounded-lg border bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                                    required
                                />
                            </div>

                            {/* Slug / URL */}
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Your URL</label>
                                <div className="relative">
                                    <div className="flex items-center">
                                        <span className="px-3 py-3 rounded-l-lg border border-r-0 bg-muted text-muted-foreground text-xs">
                                            /org/
                                        </span>
                                        <input
                                            type="text"
                                            value={slug}
                                            onChange={(e) =>
                                                setSlug(
                                                    e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '')
                                                )
                                            }
                                            placeholder="your-org"
                                            className="w-full px-4 py-3 rounded-r-lg border bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                                            required
                                            minLength={2}
                                        />
                                    </div>

                                    {/* Availability indicator */}
                                    {slug.length >= 2 && (
                                        <div className="absolute right-3 top-1/2 -translate-y-1/2">
                                            {checkingSlug ? (
                                                <Loader2 className="h-5 w-5 text-muted-foreground animate-spin" />
                                            ) : slugAvailable ? (
                                                <Check className="h-5 w-5 text-green-500" />
                                            ) : slugAvailable === false ? (
                                                <X className="h-5 w-5 text-red-500" />
                                            ) : null}
                                        </div>
                                    )}
                                </div>

                                {slug.length >= 2 && !checkingSlug && (
                                    <p
                                        className={`text-sm ${slugAvailable
                                            ? 'text-green-600'
                                            : slugAvailable === false
                                                ? 'text-red-600'
                                                : 'text-muted-foreground'
                                            }`}
                                    >
                                        {slugAvailable
                                            ? 'This URL is available!'
                                            : slugAvailable === false
                                                ? 'This URL is already taken'
                                                : ''}
                                    </p>
                                )}
                            </div>

                            {error && (
                                <p className="text-sm text-red-600 bg-red-50 px-4 py-2 rounded-lg">
                                    {error}
                                </p>
                            )}

                            <Button
                                type="submit"
                                size="lg"
                                className="w-full h-12"
                                disabled={!slugAvailable || isCreating || !name}
                            >
                                {isCreating ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Creating...
                                    </>
                                ) : (
                                    'Create Organization'
                                )}
                            </Button>
                        </form>
                    </CardContent>
                </Card>

                <p className="text-center text-sm text-muted-foreground">
                    You&apos;ll be the admin of this organization
                </p>
            </div>
        </div>
    );
}
