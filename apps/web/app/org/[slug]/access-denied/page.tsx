
'use client';

import { useParams, useRouter } from 'next/navigation';
import { useSession, signOut } from 'next-auth/react';
import { ShieldAlert, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function AccessDeniedPage() {
    const params = useParams();
    const router = useRouter();
    const { data: session } = useSession();
    const orgSlug = params.slug as string;

    return (
        <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-background">
            <div className="max-w-md w-full text-center space-y-6">
                <div className="flex justify-center">
                    <div className="h-20 w-20 rounded-full bg-destructive/10 flex items-center justify-center">
                        <ShieldAlert className="h-10 w-10 text-destructive" />
                    </div>
                </div>

                <div className="space-y-2">
                    <h1 className="text-2xl font-semibold tracking-tight">Access Restricted</h1>
                    <p className="text-muted-foreground">
                        This organization uses an access allowlist.
                        {session?.user?.email ? (
                            <>
                                <br />
                                The account <span className="font-medium text-foreground">{session.user.email}</span> is not authorized.
                            </>
                        ) : (
                            " You need to sign in with an authorized account."
                        )}
                    </p>
                </div>

                <div className="flex flex-col gap-2 sm:flex-row sm:justify-center pt-4">
                    <Button
                        variant="outline"
                        onClick={() => router.push(`/org/${orgSlug}/login`)}
                    >
                        Switch Account
                    </Button>
                    <Button
                        variant="ghost"
                        onClick={() => signOut({ callbackUrl: `/org/${orgSlug}/login` })}
                        className="text-muted-foreground hover:text-foreground"
                    >
                        <LogOut className="mr-2 h-4 w-4" />
                        Sign Out
                    </Button>
                </div>
            </div>
        </div>
    );
}
