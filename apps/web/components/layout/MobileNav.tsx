'use client';

import Link from 'next/link';
import { usePathname, useParams } from 'next/navigation';
import { cn } from '@/lib/utils';
import { LayoutGrid, CalendarDays, User, Settings } from 'lucide-react';

export function MobileNav() {
    const pathname = usePathname();
    const params = useParams();
    const orgSlug = params.slug as string;

    const navItems = [
        {
            name: 'Book',
            href: `/org/${orgSlug}/book`,
            icon: LayoutGrid,
            activeMatch: '/book'
        },
        {
            name: 'My Bookings',
            href: `/org/${orgSlug}/my-bookings`,
            icon: CalendarDays,
            activeMatch: '/my-bookings'
        },
        {
            name: 'Account',
            href: `/org/${orgSlug}/account`,
            icon: User,
            activeMatch: '/account'
        }
    ];

    return (
        <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-lg border-t border-border/50 pb-[env(safe-area-inset-bottom)]">
            <nav className="flex items-center justify-around h-16">
                {navItems.map((item) => {
                    const isActive = pathname?.includes(item.activeMatch);
                    const Icon = item.icon;

                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={cn(
                                "flex flex-col items-center justify-center w-full h-full gap-1 transition-all duration-300",
                                isActive
                                    ? "text-primary"
                                    : "text-muted-foreground hover:text-foreground"
                            )}
                        >
                            <div className={cn(
                                "p-1.5 rounded-full transition-all duration-300",
                                isActive ? "bg-primary/10" : "bg-transparent"
                            )}>
                                <Icon className={cn(
                                    "h-5 w-5 transition-transform duration-300",
                                    isActive && "scale-110"
                                )} />
                            </div>
                            <span className="text-[10px] font-medium tracking-wide">
                                {item.name}
                            </span>
                        </Link>
                    );
                })}
            </nav>
        </div>
    );
}
