'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import {
    Users,
    LayoutGrid,
    Calendar,
    TrendingUp,
    Activity
} from 'lucide-react';
import { api } from '@/lib/api-client';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface Stats {
    totalUsers: number;
    totalSpaces: number;
    bookingsToday: number;
    upcomingBookings: number;
}

export default function DashboardPage() {
    const params = useParams();
    const { data: session } = useSession();
    const orgSlug = params.slug as string;
    const [stats, setStats] = useState<Stats | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetchStats() {
            if (!session?.user?.email) return;
            try {
                const data = await api.getStats(orgSlug);
                setStats(data);
            } catch (err) {
                console.error('Failed to fetch stats:', err);
            } finally {
                setLoading(false);
            }
        }
        fetchStats();
    }, [orgSlug, session?.user?.email]);

    if (loading) {
        return (
            <div className="space-y-6">
                <div>
                    <Skeleton className="h-8 w-48 mb-2" />
                    <Skeleton className="h-4 w-96" />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {[1, 2, 3, 4].map((i) => (
                        <Skeleton key={i} className="h-32 rounded-xl" />
                    ))}
                </div>
            </div>
        );
    }

    const statItems = [
        {
            title: "Total Members",
            value: stats?.totalUsers || 0,
            icon: Users,
            description: "Active platform users"
        },
        {
            title: "Total Spaces",
            value: stats?.totalSpaces || 0,
            icon: LayoutGrid,
            description: "Available for booking"
        },
        {
            title: "Bookings Today",
            value: stats?.bookingsToday || 0,
            icon: Activity,
            description: "Scheduled for today"
        },
        {
            title: "Upcoming",
            value: stats?.upcomingBookings || 0,
            icon: Calendar,
            description: "Future reservations"
        }
    ];

    return (
        <div className="space-y-16">
            <header>
                <div className="flex items-center gap-3 mb-4 text-muted-foreground/40 uppercase tracking-[.2em] text-[11px] font-bold">
                    <Activity className="h-4 w-4" />
                    Overview
                </div>
                <h1 className="font-display text-4xl font-medium tracking-tight text-foreground leading-tight">
                    Organization <span className="text-muted-foreground/30 font-light italic">Insights</span>
                </h1>
                <p className="text-lg text-muted-foreground/60 mt-4 max-w-2xl font-light">
                    Monitor your organization's resource utilization, member engagement, and scheduling trends at a glance.
                </p>
            </header>

            {/* Premium Stat Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-x-12 gap-y-10 border-t border-border/40 pt-12">
                {statItems.map((item, index) => (
                    <div key={index} className="group space-y-4">
                        <div className="flex items-center justify-between">
                            <h3 className="text-[10px] font-bold text-muted-foreground/40 uppercase tracking-[.25em]">
                                {item.title}
                            </h3>
                            <item.icon className="h-3.5 w-3.5 text-primary/30 group-hover:text-primary transition-colors duration-500" />
                        </div>
                        <div className="flex items-baseline gap-2">
                            <span className="text-5xl font-display font-medium tracking-tighter text-foreground tabular-nums">
                                {item.value}
                            </span>
                        </div>
                        <p className="text-xs text-muted-foreground/50 font-medium tracking-wide">
                            {item.description}
                        </p>
                    </div>
                ))}
            </div>

            {/* Activity & Trends Section */}
            <div className="pt-16 border-t border-border/40">
                <div className="flex items-center gap-3 mb-8 text-muted-foreground/40 uppercase tracking-[.2em] text-[11px] font-bold">
                    <TrendingUp className="h-4 w-4" />
                    Activity Analytics
                </div>

                <div className="relative group">
                    <div className="absolute inset-0 bg-gradient-to-tr from-primary/[0.02] to-transparent rounded-[2rem] -m-4 opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
                    <div className="relative border border-dashed border-border/60 rounded-[2.5rem] p-16 text-center flex flex-col items-center justify-center min-h-[300px] overflow-hidden">
                        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(var(--primary-rgb),0.03)_0%,transparent_70%)]" />
                        <Activity className="h-10 w-10 mb-6 text-primary/10 animate-pulse" />
                        <h4 className="text-xl font-medium text-foreground/80 mb-2">Generating Advanced Analytics</h4>
                        <p className="text-sm text-muted-foreground/60 max-w-sm mx-auto leading-relaxed">
                            We're aggregating historical data to provide deeper insights into your booking patterns and space popularity.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
