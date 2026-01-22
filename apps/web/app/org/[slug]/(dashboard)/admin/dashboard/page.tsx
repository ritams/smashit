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
        <div className="space-y-8">
            <div>
                <h1 className="font-display text-2xl font-medium tracking-tight">Dashboard</h1>
                <p className="text-muted-foreground mt-1">
                    Overview of your organization's activity and resources.
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {statItems.map((item, index) => (
                    <Card key={index} className="bg-card/50 border-border/60 shadow-sm hover:shadow-md transition-all">
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <CardTitle className="text-sm font-medium text-muted-foreground">
                                {item.title}
                            </CardTitle>
                            <item.icon className="h-4 w-4 text-primary/70" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{item.value}</div>
                            <p className="text-xs text-muted-foreground mt-1">
                                {item.description}
                            </p>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {/* Placeholder for future analytics charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 pt-4">
                <Card className="bg-card/30 border-dashed border-border/60 shadow-none">
                    <CardContent className="flex flex-col items-center justify-center p-12 text-center text-muted-foreground">
                        <TrendingUp className="h-8 w-8 mb-3 opacity-20" />
                        <p className="text-sm">Detailed analytics coming soon</p>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
