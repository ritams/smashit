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
            label: 'Facilities',
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
        <div className="flex flex-col lg:flex-row h-full min-h-[calc(100vh-4rem)]">
            {/* Sidebar Navigation */}
            <aside className="hidden lg:block w-72 border-r border-border/40 pr-10 py-10 flex-shrink-0 sticky top-[3.5rem] h-[calc(100vh-3.5rem)] self-start overflow-y-auto no-scrollbar">
                <div className="px-5 mb-12">
                    <p className="text-[10px] font-bold text-muted-foreground/30 uppercase tracking-[.25em] mb-2">
                        Admin Console
                    </p>
                    <h2 className="font-display text-2xl font-medium tracking-tight text-foreground">
                        Management
                    </h2>
                </div>
                <nav className="space-y-1">
                    {navItems.map((item) => (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={cn(
                                "group w-full text-left px-5 py-3.5 rounded-2xl transition-all duration-500 relative flex items-center justify-between gap-3 border",
                                item.active
                                    ? "bg-primary/[0.04] border-primary/20 text-primary"
                                    : "text-muted-foreground hover:bg-muted/30 hover:text-foreground border-transparent"
                            )}
                        >
                            <span className={cn(
                                "text-sm font-medium tracking-wide transition-all duration-300",
                                item.active
                                    ? "translate-x-1"
                                    : "group-hover:translate-x-0.5"
                            )}>
                                {item.label}
                            </span>
                        </Link>
                    ))}
                </nav>
            </aside>

            {/* Mobile Navigation (Kept simpler but themed) */}
            <div className="lg:hidden p-4 border-b border-border/40 bg-background/50 backdrop-blur-md sticky top-0 z-10 overflow-x-auto no-scrollbar">
                <div className="flex items-center gap-2">
                    {navItems.map((item) => (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={cn(
                                "flex-shrink-0 px-4 py-2 text-xs font-semibold rounded-full border transition-all whitespace-nowrap",
                                item.active
                                    ? "bg-primary/10 text-primary border-primary/20"
                                    : "text-muted-foreground bg-muted/30 border-transparent hover:bg-muted/50"
                            )}
                        >
                            {item.label}
                        </Link>
                    ))}
                </div>
            </div>

            {/* Main Content Area */}
            <main className="flex-1 lg:pl-16 py-10 overflow-y-auto overflow-x-hidden">
                <div className="max-w-6xl mx-auto px-4 md:px-0 animate-in fade-in slide-in-from-bottom-3 duration-500">
                    {children}
                </div>
            </main>
        </div>
    );
}
