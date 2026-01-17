'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import {
    Calendar,
    Users,
    Settings,
    LayoutGrid,
    PlusCircle,
    MoreHorizontal,
    ChevronRight,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';

// Mock stats
const mockStats = {
    totalUsers: 24,
    totalSpaces: 3,
    bookingsToday: 8,
    upcomingBookings: 42,
};

const mockSpaces = [
    { id: 'space-1', name: 'Badminton Court A', isActive: true, capacity: 4 },
    { id: 'space-2', name: 'Badminton Court B', isActive: true, capacity: 4 },
    { id: 'space-3', name: 'Meeting Room 1', isActive: true, capacity: 10 },
];

export default function AdminDashboard() {
    const params = useParams();
    const orgSlug = params.slug as string;
    const [spaces] = useState(mockSpaces);

    return (
        <div className="space-y-8">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold tracking-tight">Admin Dashboard</h1>
                <p className="text-muted-foreground">
                    Manage your organization&apos;s spaces and settings
                </p>
            </div>

            {/* Stats Grid */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">
                            Total Users
                        </CardTitle>
                        <Users className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{mockStats.totalUsers}</div>
                        <p className="text-xs text-muted-foreground">Active members</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">
                            Active Spaces
                        </CardTitle>
                        <LayoutGrid className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{mockStats.totalSpaces}</div>
                        <p className="text-xs text-muted-foreground">Bookable spaces</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">
                            Bookings Today
                        </CardTitle>
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{mockStats.bookingsToday}</div>
                        <p className="text-xs text-muted-foreground">Active slots</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">
                            Upcoming
                        </CardTitle>
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{mockStats.upcomingBookings}</div>
                        <p className="text-xs text-muted-foreground">Future bookings</p>
                    </CardContent>
                </Card>
            </div>

            {/* Quick Actions */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {/* Manage Spaces */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <LayoutGrid className="h-5 w-5" />
                            Spaces
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            {spaces.map((space) => (
                                <div
                                    key={space.id}
                                    className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                                >
                                    <div>
                                        <p className="font-medium">{space.name}</p>
                                        <p className="text-xs text-muted-foreground">
                                            Capacity: {space.capacity}
                                        </p>
                                    </div>
                                    <Button variant="ghost" size="icon">
                                        <MoreHorizontal className="h-4 w-4" />
                                    </Button>
                                </div>
                            ))}
                        </div>

                        <Dialog>
                            <DialogTrigger asChild>
                                <Button variant="outline" className="w-full">
                                    <PlusCircle className="h-4 w-4 mr-2" />
                                    Add Space
                                </Button>
                            </DialogTrigger>
                            <DialogContent>
                                <DialogHeader>
                                    <DialogTitle>Create New Space</DialogTitle>
                                    <DialogDescription>
                                        Add a new bookable space to your organization.
                                    </DialogDescription>
                                </DialogHeader>
                                <div className="space-y-4 py-4">
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium">Space Name</label>
                                        <input
                                            type="text"
                                            placeholder="e.g., Badminton Court C"
                                            className="w-full px-3 py-2 rounded-md border bg-background"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium">Capacity</label>
                                        <input
                                            type="number"
                                            placeholder="4"
                                            className="w-full px-3 py-2 rounded-md border bg-background"
                                        />
                                    </div>
                                </div>
                                <DialogFooter>
                                    <Button>Create Space</Button>
                                </DialogFooter>
                            </DialogContent>
                        </Dialog>
                    </CardContent>
                </Card>

                {/* Manage Users */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Users className="h-5 w-5" />
                            Users
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <p className="text-sm text-muted-foreground">
                            View and manage organization members, roles, and permissions.
                        </p>
                        <Link href={`/org/${orgSlug}/admin/users`}>
                            <Button variant="outline" className="w-full">
                                Manage Users
                                <ChevronRight className="h-4 w-4 ml-2" />
                            </Button>
                        </Link>
                    </CardContent>
                </Card>

                {/* Settings */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Settings className="h-5 w-5" />
                            Settings
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <p className="text-sm text-muted-foreground">
                            Configure booking rules, timezone, and organization settings.
                        </p>
                        <Link href={`/org/${orgSlug}/admin/settings`}>
                            <Button variant="outline" className="w-full">
                                Open Settings
                                <ChevronRight className="h-4 w-4 ml-2" />
                            </Button>
                        </Link>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
