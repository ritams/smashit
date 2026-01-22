'use client';

import { usePathname, useParams } from 'next/navigation';
import Link from 'next/link';
import { Grid, Ticket, User, Shield } from 'lucide-react';
import { cn } from '@/lib/utils';

export function MobileNav({ isAdmin = false }: { isAdmin?: boolean }) {
    const pathname = usePathname();
    const params = useParams();
    const orgSlug = params.slug as string;

    const navItems = [
        {
            href: `/org/${orgSlug}/book`,
            label: 'Book',
            icon: Grid,
            isActive: (path: string) => path.includes('/book')
        },
        {
            href: `/org/${orgSlug}/my-bookings`,
            label: 'My Bookings',
            icon: Ticket,
            isActive: (path: string) => path.includes('/my-bookings')
        },
        {
            href: `/org/${orgSlug}/profile`,
            label: 'Account',
            icon: User,
            isActive: (path: string) => path.includes('/profile')
        }
    ];

    if (isAdmin) {
        navItems.splice(2, 0, {
            href: `/org/${orgSlug}/admin`,
            label: 'Admin',
            icon: Shield,
            isActive: (path: string) => path.includes('/admin')
        });
    }

    return (
        <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-xl border-t border-border pb-[env(safe-area-inset-bottom)]">
            <nav className="flex items-center justify-around h-16 px-2">
                {navItems.map((item) => {
                    const active = item.isActive(pathname || '');
                    const Icon = item.icon;
                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={cn(
                                "flex flex-col items-center justify-center w-full h-full space-y-1 active:scale-95 transition-all duration-200",
                                active ? "text-primary" : "text-muted-foreground hover:text-foreground"
                            )}
                        >
                            <Icon className="h-6 w-6" strokeWidth={1.5} />
                            {active && <span className="text-[10px] font-medium animate-in fade-in slide-in-from-bottom-1 duration-200">{item.label}</span>}
                        </Link>
                    );
                })}
            </nav>
        </div>
    );
}
