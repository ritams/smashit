'use client';

import { useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Loader2 } from 'lucide-react';

export default function AdminPage() {
    const router = useRouter();
    const params = useParams();
    const orgSlug = params.slug as string;

    useEffect(() => {
        router.replace(`/org/${orgSlug}/admin/dashboard`);
    }, [orgSlug, router]);

    return (
        <div className="flex items-center justify-center p-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
    );
}
