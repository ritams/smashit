'use client';

import Link from 'next/link';
import { usePathname, useParams } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
    LayoutDashboard,
    Map,
    Shield,
    Users,
    Settings
} from 'lucide-react';

export default function AdminLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const pathname = usePathname();
    const params = useParams();
    const orgSlug = params.slug as string;

    const navItems = [
        {
            label: 'Dashboard',
            href: `/org/${orgSlug}/admin/dashboard`,
            icon: LayoutDashboard,
            active: pathname?.includes('/dashboard'),
        },
        {
            label: 'Spaces',
            href: `/org/${orgSlug}/admin/spaces`,
            icon: Map,
            active: pathname?.includes('/spaces'),
        },
        {
            label: 'Access Control',
            href: `/org/${orgSlug}/admin/access-control`,
            icon: Shield,
            active: pathname?.includes('/access-control'),
        },
        {
            label: 'Members',
            href: `/org/${orgSlug}/admin/members`,
            icon: Users,
            active: pathname?.includes('/members'),
        },
    ];

    return (
        <div className="flex flex-col md:flex-row h-full min-h-[calc(100vh-4rem)]">
            {/* Sidebar Navigation */}
            <aside className="w-full md:w-64 border-b md:border-b-0 md:border-r border-border bg-card/30 md:min-h-full">
                <div className="p-6">
                    <h2 className="font-display text-lg font-medium tracking-tight">Admin</h2>
                    <p className="text-xs text-muted-foreground mt-1">Management Console</p>
                </div>
                <nav className="flex md:flex-col gap-1 px-3 pb-4 md:pb-0 overflow-x-auto md:overflow-visible">
                    {navItems.map((item) => (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={cn(
                                "flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-md transition-colors whitespace-nowrap",
                                item.active
                                    ? "bg-primary/10 text-primary"
                                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                            )}
                        >
                            <item.icon className="h-4 w-4" />
                            {item.label}
                        </Link>
                    ))}
                </nav>
            </aside>

            {/* Main Content Area */}
            <main className="flex-1 p-6 md:p-8 overflow-y-auto">
                <div className="max-w-5xl mx-auto animate-in fade-in slide-in-from-bottom-3 duration-500">
                    {children}
                </div>
            </main>
        </div>
    );
}
