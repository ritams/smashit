'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import {
    Calendar,
    Users,
    LayoutGrid,
    PlusCircle,
    Trash2,
    Loader2,
    Pencil,
    Copy,
    Save
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

import { API_URL } from '@/lib/config';

interface BookingRules {
    id: string;
    slotDurationMin: number;
    openTime: string;
    closeTime: string;
    maxAdvanceDays: number;
    maxDurationMin: number;
    allowRecurring: boolean;
    bufferMinutes: number;
    maxBookingsPerUserPerDay?: number;
    maxTotalBookingsPerDay?: number;
    maxActiveBookingsPerUser?: number;
}

interface Slot {
    id: string;
    name: string;
    number: number;
    isActive: boolean;
}

interface Space {
    id: string;
    name: string;
    description: string | null;
    capacity: number;
    isActive: boolean;
    type: string;
    rules?: BookingRules;
    slots?: Slot[];
}

interface Stats {
    totalUsers: number;
    totalSpaces: number;
    bookingsToday: number;
    upcomingBookings: number;
}

export default function AdminDashboard() {
    const params = useParams();
    const { data: session } = useSession();
    const orgSlug = params.slug as string;

    const [spaces, setSpaces] = useState<Space[]>([]);
    const [stats, setStats] = useState<Stats | null>(null);
    const [loading, setLoading] = useState(true);

    // Create Dialog State
    const [showCreateDialog, setShowCreateDialog] = useState(false);
    const [newSpaceName, setNewSpaceName] = useState('');
    const [newSpaceCapacity, setNewSpaceCapacity] = useState('4');
    const [newSpaceDescription, setNewSpaceDescription] = useState('');
    const [newSpaceType, setNewSpaceType] = useState('GENERIC');
    const [isCreating, setIsCreating] = useState(false);

    // Edit Dialog State
    const [editingSpace, setEditingSpace] = useState<Space | null>(null);
    const [isUpdating, setIsUpdating] = useState(false);

    // Delete Dialog State
    const [deleteSpaceId, setDeleteSpaceId] = useState<string | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    // Fetch spaces and stats
    useEffect(() => {
        async function fetchData() {
            if (!session?.user?.email) return;

            setLoading(true);
            try {
                // Fetch spaces
                const spacesRes = await fetch(`${API_URL}/api/orgs/${orgSlug}/spaces`);
                const spacesData = await spacesRes.json();
                if (spacesData.success) {
                    setSpaces(spacesData.data || []);
                }

                // Fetch stats
                const statsRes = await fetch(`${API_URL}/api/orgs/${orgSlug}/admin/stats`, {
                    headers: {
                        'x-user-email': session.user.email,
                        'x-user-name': session.user.name || '',
                    },
                });
                const statsData = await statsRes.json();
                if (statsData.success) {
                    setStats(statsData.data);
                }
            } catch (err) {
                console.error('Failed to fetch data:', err);
                toast.error('Failed to load dashboard data');
            }
            setLoading(false);
        }
        fetchData();
    }, [orgSlug, session?.user?.email]);

    const handleCreateSpace = async () => {
        if (!newSpaceName || !session?.user?.email) return;

        setIsCreating(true);
        try {
            const res = await fetch(`${API_URL}/api/orgs/${orgSlug}/admin/spaces`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-user-email': session.user.email,
                    'x-user-name': session.user.name || '',
                },
                body: JSON.stringify({
                    name: newSpaceName,
                    description: newSpaceDescription || null,
                    capacity: parseInt(newSpaceCapacity) || 4,
                    type: newSpaceType,
                }),
            });

            const data = await res.json();
            if (data.success && data.data) {
                setSpaces((prev) => [...prev, data.data]);
                setShowCreateDialog(false);
                setNewSpaceName('');
                setNewSpaceDescription('');
                setNewSpaceCapacity('4');
                setNewSpaceType('GENERIC');
                toast.success('Space created!', { description: data.data.name });
            } else {
                toast.error('Failed to create space', { description: data.error?.message });
            }
        } catch (err) {
            toast.error('Failed to create space');
        }
        setIsCreating(false);
    };

    const handleUpdateSpace = async (updatedData: Partial<Space>) => {
        if (!editingSpace || !session?.user?.email) return;

        setIsUpdating(true);
        try {
            const res = await fetch(`${API_URL}/api/orgs/${orgSlug}/admin/spaces/${editingSpace.id}`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'x-user-email': session.user.email,
                    'x-user-name': session.user.name || '',
                },
                body: JSON.stringify(updatedData),
            });

            const data = await res.json();
            if (data.success && data.data) {
                setSpaces(prev => prev.map(s => s.id === editingSpace.id ? data.data : s));
                setEditingSpace(data.data); // Update local editing state
                toast.success('Space updated');
            } else {
                toast.error('Update failed', { description: data.error?.message });
            }
        } catch (error) {
            toast.error('Update failed');
        }
        setIsUpdating(false);
    };

    const handleUpdateRules = async (rules: Partial<BookingRules>, applyToAll: boolean = false) => {
        if (!editingSpace || !session?.user?.email) return;

        setIsUpdating(true);
        try {
            if (applyToAll) {
                // Bulk update
                const spaceIds = spaces.map(s => s.id);
                const res = await fetch(`${API_URL}/api/orgs/${orgSlug}/admin/spaces/rules/bulk`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'x-user-email': session.user.email,
                        'x-user-name': session.user.name || '',
                    },
                    body: JSON.stringify({ spaceIds, rules }),
                });
                const data = await res.json();
                if (data.success) {
                    toast.success('Rules applied to all spaces');
                    setEditingSpace(null);
                    // Reload to fetch fresh data
                    window.location.reload();
                } else {
                    toast.error('Bulk update failed', { description: data.error?.message });
                }
            } else {
                // Single update
                const res = await fetch(`${API_URL}/api/orgs/${orgSlug}/admin/spaces/${editingSpace.id}/rules`, {
                    method: 'PATCH',
                    headers: {
                        'Content-Type': 'application/json',
                        'x-user-email': session.user.email,
                        'x-user-name': session.user.name || '',
                    },
                    body: JSON.stringify(rules),
                });

                const data = await res.json();
                if (data.success && data.data) {
                    setSpaces(prev => prev.map(s => s.id === editingSpace.id ? { ...s, rules: data.data } : s));
                    setEditingSpace(prev => prev ? { ...prev, rules: data.data } : null);
                    toast.success('Rules updated');
                } else {
                    toast.error('Update failed', { description: data.error?.message });
                }
            }
        } catch (error) {
            toast.error('Update failed');
        }
        setIsUpdating(false);
    };

    const handleDeleteSpace = async () => {
        if (!session?.user?.email || !deleteSpaceId) return;

        setIsDeleting(true);
        try {
            const res = await fetch(`${API_URL}/api/orgs/${orgSlug}/admin/spaces/${deleteSpaceId}`, {
                method: 'DELETE',
                headers: {
                    'x-user-email': session.user.email,
                    'x-user-name': session.user.name || '',
                },
            });

            const data = await res.json();
            if (data.success) {
                setSpaces((prev) => prev.filter((s) => s.id !== deleteSpaceId));
                toast.success('Space deleted');
            } else {
                toast.error('Failed to delete space', { description: data.error?.message });
            }
        } catch (err) {
            toast.error('Failed to delete space');
            console.error('Failed to delete space:', err);
        }
        setIsDeleting(false);
        setDeleteSpaceId(null);
    };

    if (loading) {
        return (
            <div className="space-y-8">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Admin Dashboard</h1>
                    <p className="text-muted-foreground">Loading...</p>
                </div>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                    {[1, 2, 3, 4].map((i) => (
                        <Skeleton key={i} className="h-24" />
                    ))}
                </div>
            </div>
        );
    }

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
                        <div className="text-2xl font-bold">{stats?.totalUsers || 0}</div>
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
                        <div className="text-2xl font-bold">{stats?.totalSpaces || spaces.length}</div>
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
                        <div className="text-2xl font-bold">{stats?.bookingsToday || 0}</div>
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
                        <div className="text-2xl font-bold">{stats?.upcomingBookings || 0}</div>
                        <p className="text-xs text-muted-foreground">Future bookings</p>
                    </CardContent>
                </Card>
            </div>

            {/* Manage Spaces */}
            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <CardTitle className="flex items-center gap-2">
                            <LayoutGrid className="h-5 w-5" />
                            Spaces
                        </CardTitle>
                        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
                            <DialogTrigger asChild>
                                <Button size="sm">
                                    <PlusCircle className="h-4 w-4 mr-2" />
                                    Add Space
                                </Button>
                            </DialogTrigger>
                            <DialogContent className="sm:max-w-[500px]">
                                <DialogHeader>
                                    <DialogTitle>Create New Space</DialogTitle>
                                    <DialogDescription>
                                        Add a new bookable space.
                                    </DialogDescription>
                                </DialogHeader>
                                <div className="space-y-4 py-4">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label>Space Name *</Label>
                                            <Input
                                                value={newSpaceName}
                                                onChange={(e) => setNewSpaceName(e.target.value)}
                                                placeholder="e.g., Court A"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Type</Label>
                                            <Select value={newSpaceType} onValueChange={setNewSpaceType}>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Select type" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="GENERIC">Generic</SelectItem>
                                                    <SelectItem value="SPORTS_COURT">Sports Court</SelectItem>
                                                    <SelectItem value="MEETING_ROOM">Meeting Room</SelectItem>
                                                    <SelectItem value="DESK">Desk</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Description</Label>
                                        <Input
                                            value={newSpaceDescription}
                                            onChange={(e) => setNewSpaceDescription(e.target.value)}
                                            placeholder="Optional description"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Capacity (Check-in Spots)</Label>
                                        <Input
                                            type="number"
                                            value={newSpaceCapacity}
                                            onChange={(e) => setNewSpaceCapacity(e.target.value)}
                                            placeholder="4"
                                            min="1"
                                        />
                                        <p className="text-xs text-muted-foreground">Number of simultaneous bookings allowed (slots)</p>
                                    </div>
                                </div>
                                <DialogFooter>
                                    <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                                        Cancel
                                    </Button>
                                    <Button onClick={handleCreateSpace} disabled={!newSpaceName || isCreating}>
                                        {isCreating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                        Create Space
                                    </Button>
                                </DialogFooter>
                            </DialogContent>
                        </Dialog>
                    </div>
                </CardHeader>
                <CardContent>
                    {spaces.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">
                            <LayoutGrid className="h-12 w-12 mx-auto mb-4 opacity-50" />
                            <p>No spaces created yet.</p>
                            <p className="text-sm">Click &quot;Add Space&quot; to create your first space.</p>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {spaces.map((space) => (
                                <div
                                    key={space.id}
                                    className="flex items-center justify-between p-4 rounded-lg bg-muted/50 hover:bg-muted transition-colors border"
                                >
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <p className="font-medium">{space.name}</p>
                                            {space.type && space.type !== 'GENERIC' && (
                                                <span className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-full font-medium">
                                                    {space.type.replace('_', ' ')}
                                                </span>
                                            )}
                                        </div>
                                        <p className="text-sm text-muted-foreground mt-0.5">
                                            Capacity: {space.capacity} | {space.slots?.length || 0} Slots Configured
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => setEditingSpace(space)}
                                        >
                                            <Pencil className="h-4 w-4" />
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="text-destructive hover:text-destructive hover:bg-destructive/10"
                                            onClick={() => setDeleteSpaceId(space.id)}
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Edit Space Dialog */}
            <Dialog open={!!editingSpace} onOpenChange={(open) => !open && setEditingSpace(null)}>
                <DialogContent className="sm:max-w-[700px] h-[80vh] flex flex-col">
                    <DialogHeader>
                        <DialogTitle>Edit Space</DialogTitle>
                        <DialogDescription>
                            Configure settings, rules, and slots for {editingSpace?.name}.
                        </DialogDescription>
                    </DialogHeader>

                    {editingSpace && (
                        <Tabs defaultValue="general" className="flex-1 flex flex-col min-h-0">
                            <TabsList className="grid w-full grid-cols-3">
                                <TabsTrigger value="general">General</TabsTrigger>
                                <TabsTrigger value="rules">Booking Rules</TabsTrigger>
                                <TabsTrigger value="slots">Slots</TabsTrigger>
                            </TabsList>

                            <div className="flex-1 overflow-y-auto py-4">
                                <TabsContent value="general" className="mt-0 space-y-4">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label>Name</Label>
                                            <Input
                                                defaultValue={editingSpace.name}
                                                onChange={(e) => setEditingSpace({ ...editingSpace, name: e.target.value })}
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Type</Label>
                                            <Select
                                                defaultValue={editingSpace.type}
                                                onValueChange={(val) => setEditingSpace({ ...editingSpace, type: val })}
                                            >
                                                <SelectTrigger>
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="GENERIC">Generic</SelectItem>
                                                    <SelectItem value="SPORTS_COURT">Sports Court</SelectItem>
                                                    <SelectItem value="MEETING_ROOM">Meeting Room</SelectItem>
                                                    <SelectItem value="DESK">Desk</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Capacity (Increase Only)</Label>
                                        <Input
                                            type="number"
                                            defaultValue={editingSpace.capacity}
                                            onChange={(e) => setEditingSpace({ ...editingSpace, capacity: parseInt(e.target.value) || editingSpace.capacity })}
                                            min={editingSpace.capacity}
                                        />
                                        <p className="text-xs text-muted-foreground">
                                            Warning: Increasing capacity adds new slots. Decreasing is not currently supported through this UI.
                                        </p>
                                    </div>
                                    <div className="flex justify-end pt-4">
                                        <Button
                                            onClick={() => handleUpdateSpace({
                                                name: editingSpace.name,
                                                type: editingSpace.type,
                                                capacity: editingSpace.capacity
                                            })}
                                            disabled={isUpdating}
                                        >
                                            {isUpdating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                            Save Changes
                                        </Button>
                                    </div>
                                </TabsContent>

                                <TabsContent value="rules" className="mt-0 space-y-4">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label>Open Time</Label>
                                            <Input type="time" defaultValue={editingSpace.rules?.openTime} id="openTime" />
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Close Time</Label>
                                            <Input type="time" defaultValue={editingSpace.rules?.closeTime} id="closeTime" />
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Max Advance Days</Label>
                                            <Input type="number" defaultValue={editingSpace.rules?.maxAdvanceDays} id="maxAdvanceDays" />
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Max Duration (Min)</Label>
                                            <Input type="number" defaultValue={editingSpace.rules?.maxDurationMin} id="maxDurationMin" />
                                        </div>
                                    </div>

                                    <div className="space-y-4 border-t pt-4">
                                        <h4 className="font-medium text-sm">Usage Limits</h4>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-2">
                                                <Label>Max Bookings / User / Day</Label>
                                                <Input type="number" defaultValue={editingSpace.rules?.maxBookingsPerUserPerDay ?? ''} placeholder="Unlimited" id="maxBookingsPerUserPerDay" />
                                            </div>
                                            <div className="space-y-2">
                                                <Label>Max Total Bookings / Day</Label>
                                                <Input type="number" defaultValue={editingSpace.rules?.maxTotalBookingsPerDay ?? ''} placeholder="Unlimited" id="maxTotalBookingsPerDay" />
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex items-center justify-between pt-4 gap-4">
                                        <Button variant="secondary" className="w-full" onClick={() => {
                                            const rules = {
                                                openTime: (document.getElementById('openTime') as HTMLInputElement).value,
                                                closeTime: (document.getElementById('closeTime') as HTMLInputElement).value,
                                                maxAdvanceDays: parseInt((document.getElementById('maxAdvanceDays') as HTMLInputElement).value),
                                                maxDurationMin: parseInt((document.getElementById('maxDurationMin') as HTMLInputElement).value),
                                                maxBookingsPerUserPerDay: parseInt((document.getElementById('maxBookingsPerUserPerDay') as HTMLInputElement).value) || undefined,
                                                maxTotalBookingsPerDay: parseInt((document.getElementById('maxTotalBookingsPerDay') as HTMLInputElement).value) || undefined,
                                            };
                                            handleUpdateRules(rules, true);
                                        }}>
                                            <Copy className="mr-2 h-4 w-4" />
                                            Apply to ALL Spaces
                                        </Button>
                                        <Button className="w-full" onClick={() => {
                                            const rules = {
                                                openTime: (document.getElementById('openTime') as HTMLInputElement).value,
                                                closeTime: (document.getElementById('closeTime') as HTMLInputElement).value,
                                                maxAdvanceDays: parseInt((document.getElementById('maxAdvanceDays') as HTMLInputElement).value),
                                                maxDurationMin: parseInt((document.getElementById('maxDurationMin') as HTMLInputElement).value),
                                                maxBookingsPerUserPerDay: parseInt((document.getElementById('maxBookingsPerUserPerDay') as HTMLInputElement).value) || undefined,
                                                maxTotalBookingsPerDay: parseInt((document.getElementById('maxTotalBookingsPerDay') as HTMLInputElement).value) || undefined,
                                            };
                                            handleUpdateRules(rules, false);
                                        }}>
                                            {isUpdating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                            Save Rules
                                        </Button>
                                    </div>
                                </TabsContent>

                                <TabsContent value="slots" className="mt-0">
                                    <div className="space-y-2">
                                        <p className="text-sm text-muted-foreground mb-4">
                                            These slots represent detailed capacity. You can reference specific physical spots (e.g., "Table 1" or "Lane 3").
                                        </p>
                                        <div className="space-y-2">
                                            {editingSpace.slots?.map((slot) => (
                                                <div key={slot.id} className="flex items-center gap-2 p-2 rounded bg-muted/30 border">
                                                    <span className="w-8 text-center text-sm font-medium text-muted-foreground">
                                                        #{slot.number}
                                                    </span>
                                                    <span className="font-medium text-sm">{slot.name}</span>
                                                    <div className="ml-auto">
                                                        <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
                                                            {slot.isActive ? 'Active' : 'Inactive'}
                                                        </span>
                                                    </div>
                                                </div>
                                            ))}
                                            {(!editingSpace.slots || editingSpace.slots.length === 0) && (
                                                <div className="text-center p-4 text-muted-foreground text-sm">
                                                    No explicit slots configured. System uses capacity count.
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </TabsContent>
                            </div>
                        </Tabs>
                    )}
                </DialogContent>
            </Dialog>

            {/* Delete Space Confirmation */}
            <AlertDialog open={!!deleteSpaceId} onOpenChange={() => setDeleteSpaceId(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete Space?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This will permanently delete this space and all its bookings.
                            This action cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleDeleteSpace}
                            disabled={isDeleting}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                            {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Delete Space
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
