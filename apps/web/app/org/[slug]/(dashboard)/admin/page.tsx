'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import {
    Users,
    LayoutGrid,
    PlusCircle,
    Trash2,
    Loader2,
    Pencil,
    Copy,
    ChevronRight
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
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
import { api } from '@/lib/api-client';

// Space type configuration
const SPACE_TYPES: Record<string, { label: string; slotPrefix: string }> = {
    BADMINTON: { label: 'Badminton', slotPrefix: 'Court' },
    TENNIS: { label: 'Tennis', slotPrefix: 'Court' },
    TABLE_TENNIS: { label: 'Table Tennis', slotPrefix: 'Table' },
    FOOTBALL: { label: 'Football', slotPrefix: 'Field' },
    BASKETBALL: { label: 'Basketball', slotPrefix: 'Court' },
    CRICKET: { label: 'Cricket', slotPrefix: 'Net' },
    SWIMMING: { label: 'Swimming', slotPrefix: 'Lane' },
    SQUASH: { label: 'Squash', slotPrefix: 'Court' },
    GENERIC: { label: 'Other', slotPrefix: 'Slot' },
};

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
    const [members, setMembers] = useState<any[]>([]);
    const [stats, setStats] = useState<Stats | null>(null);
    const [loading, setLoading] = useState(true);

    const [showCreateDialog, setShowCreateDialog] = useState(false);
    const [newSpaceName, setNewSpaceName] = useState('');
    const [newSpaceCapacity, setNewSpaceCapacity] = useState('4');
    const [newSpaceDescription, setNewSpaceDescription] = useState('');
    const [newSpaceType, setNewSpaceType] = useState('BADMINTON');
    const [isCreating, setIsCreating] = useState(false);

    const [editingSpace, setEditingSpace] = useState<Space | null>(null);
    const [isUpdating, setIsUpdating] = useState(false);
    const [deleteSpaceId, setDeleteSpaceId] = useState<string | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    useEffect(() => {
        async function fetchData() {
            if (!session?.user?.email) return;
            setLoading(true);
            try {
                const [spacesData, statsData, membersData] = await Promise.all([
                    api.getSpaces(orgSlug),
                    api.getStats(orgSlug),
                    api.getMembers(orgSlug)
                ]);
                setSpaces(spacesData || []);
                setStats(statsData);
                setMembers(membersData || []);
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
            const data = await api.createSpace(orgSlug, {
                name: newSpaceName,
                description: newSpaceDescription || undefined,
                capacity: parseInt(newSpaceCapacity) || 4,
                type: newSpaceType,
            });
            setSpaces((prev) => [...prev, data]);
            setShowCreateDialog(false);
            setNewSpaceName('');
            setNewSpaceDescription('');
            setNewSpaceCapacity('4');
            setNewSpaceType('BADMINTON');
            toast.success('Space created');
        } catch (err: any) {
            toast.error('Failed to create space');
        }
        setIsCreating(false);
    };

    const handleUpdateSpace = async (updatedData: Partial<Space>) => {
        if (!editingSpace || !session?.user?.email) return;
        setIsUpdating(true);
        try {
            const data = await api.updateSpace(orgSlug, editingSpace.id, updatedData);
            setSpaces(prev => prev.map(s => s.id === editingSpace.id ? data : s));
            setEditingSpace(data);
            toast.success('Space updated');
        } catch (error: any) {
            toast.error('Update failed');
        }
        setIsUpdating(false);
    };

    const handleUpdateRules = async (rules: Partial<BookingRules>, applyToAll: boolean = false) => {
        if (!editingSpace || !session?.user?.email) return;
        setIsUpdating(true);
        try {
            if (applyToAll) {
                const spaceIds = spaces.map(s => s.id);
                await api.bulkUpdateSpaceRules(orgSlug, { spaceIds, rules });
                toast.success('Rules applied to all spaces');
                setEditingSpace(null);
                window.location.reload();
            } else {
                const data = await api.updateSpaceRules(orgSlug, editingSpace.id, rules);
                setSpaces(prev => prev.map(s => s.id === editingSpace.id ? { ...s, rules: data } : s));
                setEditingSpace(prev => prev ? { ...prev, rules: data } : null);
                toast.success('Rules updated');
            }
        } catch (error: any) {
            toast.error('Update failed');
        }
        setIsUpdating(false);
    };

    const handleDeleteSpace = async () => {
        if (!session?.user?.email || !deleteSpaceId) return;
        setIsDeleting(true);
        try {
            await api.deleteSpace(orgSlug, deleteSpaceId);
            setSpaces((prev) => prev.filter((s) => s.id !== deleteSpaceId));
            toast.success('Space deleted');
        } catch (err: any) {
            toast.error('Failed to delete space');
        }
        setIsDeleting(false);
        setDeleteSpaceId(null);
    };

    if (loading) {
        return (
            <div className="max-w-4xl mx-auto py-8 space-y-8">
                <Skeleton className="h-8 w-48" />
                <div className="grid grid-cols-4 gap-6">
                    {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-20" />)}
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto py-8 px-4 sm:px-0">
            {/* Header */}
            <div className="mb-10">
                <h1 className="text-2xl font-medium tracking-tight">Admin</h1>
                <p className="text-muted-foreground mt-1">
                    Manage spaces, members, and settings
                </p>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-12">
                <div className="space-y-1">
                    <p className="text-3xl font-medium">{stats?.totalUsers || 0}</p>
                    <p className="text-sm text-muted-foreground">Members</p>
                </div>
                <div className="space-y-1">
                    <p className="text-3xl font-medium">{stats?.totalSpaces || spaces.length}</p>
                    <p className="text-sm text-muted-foreground">Spaces</p>
                </div>
                <div className="space-y-1">
                    <p className="text-3xl font-medium">{stats?.bookingsToday || 0}</p>
                    <p className="text-sm text-muted-foreground">Today</p>
                </div>
                <div className="space-y-1">
                    <p className="text-3xl font-medium">{stats?.upcomingBookings || 0}</p>
                    <p className="text-sm text-muted-foreground">Upcoming</p>
                </div>
            </div>

            {/* Spaces Section */}
            <section className="mb-12">
                <div className="flex items-center justify-between border-b border-border pb-4 mb-6">
                    <h2 className="text-lg font-medium">Spaces</h2>
                    <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
                        <DialogTrigger asChild>
                            <Button size="sm">
                                <PlusCircle className="h-4 w-4 mr-2" />
                                Add Space
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-[500px]">
                            <DialogHeader>
                                <DialogTitle>Create Space</DialogTitle>
                                <DialogDescription>
                                    Add a new bookable space.
                                </DialogDescription>
                            </DialogHeader>
                            <div className="space-y-4 py-4">
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label>Name</Label>
                                        <Input
                                            value={newSpaceName}
                                            onChange={(e) => setNewSpaceName(e.target.value)}
                                            placeholder="e.g., Court A"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Type</Label>
                                        <Select value={newSpaceType} onValueChange={setNewSpaceType}>
                                            <SelectTrigger><SelectValue /></SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="BADMINTON">Badminton</SelectItem>
                                                <SelectItem value="TENNIS">Tennis</SelectItem>
                                                <SelectItem value="TABLE_TENNIS">Table Tennis</SelectItem>
                                                <SelectItem value="FOOTBALL">Football</SelectItem>
                                                <SelectItem value="BASKETBALL">Basketball</SelectItem>
                                                <SelectItem value="CRICKET">Cricket</SelectItem>
                                                <SelectItem value="SWIMMING">Swimming</SelectItem>
                                                <SelectItem value="SQUASH">Squash</SelectItem>
                                                <SelectItem value="GENERIC">Other</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label>Capacity (slots)</Label>
                                    <Input
                                        type="number"
                                        value={newSpaceCapacity}
                                        onChange={(e) => setNewSpaceCapacity(e.target.value)}
                                        min="1"
                                    />
                                </div>
                            </div>
                            <DialogFooter>
                                <Button variant="outline" onClick={() => setShowCreateDialog(false)}>Cancel</Button>
                                <Button onClick={handleCreateSpace} disabled={!newSpaceName || isCreating}>
                                    {isCreating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                    Create
                                </Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>
                </div>

                {spaces.length === 0 ? (
                    <div className="text-center py-12 border border-dashed border-border rounded-lg">
                        <LayoutGrid className="h-8 w-8 mx-auto mb-3 text-muted-foreground/50" />
                        <p className="text-muted-foreground">No spaces created yet</p>
                    </div>
                ) : (
                    <div className="space-y-8">
                        {Object.entries(
                            spaces.reduce((acc, space) => {
                                const type = space.type || 'GENERIC';
                                if (!acc[type]) acc[type] = [];
                                acc[type].push(space);
                                return acc;
                            }, {} as Record<string, Space[]>)
                        ).map(([type, typeSpaces]) => (
                            <div key={type} className="space-y-3">
                                <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider pl-1">
                                    {SPACE_TYPES[type]?.label || type}
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                    {typeSpaces.map((space) => (
                                        <div
                                            key={space.id}
                                            className="group relative border border-border rounded-lg bg-card p-4 hover:border-primary/50 transition-colors"
                                        >
                                            <div className="flex justify-between items-start mb-2">
                                                <div>
                                                    <h4 className="font-medium truncate pr-6">{space.name}</h4>
                                                    <span className="text-xs text-muted-foreground">
                                                        {space.capacity} {space.capacity === 1 ? 'slot' : 'slots'}
                                                    </span>
                                                </div>
                                                <div className="flex items-center gap-1 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity absolute top-3 right-3 bg-card pl-2">
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-7 w-7"
                                                        onClick={() => setEditingSpace(space)}
                                                    >
                                                        <Pencil className="h-3.5 w-3.5" />
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-7 w-7 text-destructive hover:text-destructive"
                                                        onClick={() => setDeleteSpaceId(space.id)}
                                                    >
                                                        <Trash2 className="h-3.5 w-3.5" />
                                                    </Button>
                                                </div>
                                            </div>
                                            {space.description && (
                                                <p className="text-xs text-muted-foreground line-clamp-2 mt-2">
                                                    {space.description}
                                                </p>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </section>

            {/* Members Section */}
            <section>
                <div className="flex items-center justify-between border-b border-border pb-4 mb-6">
                    <h2 className="text-lg font-medium">Members</h2>
                    <span className="text-sm text-muted-foreground">{members.length} total</span>
                </div>

                {members.length === 0 ? (
                    <div className="text-center py-12 border border-dashed border-border rounded-lg">
                        <Users className="h-8 w-8 mx-auto mb-3 text-muted-foreground/50" />
                        <p className="text-muted-foreground">No members yet</p>
                    </div>
                ) : (
                    <div className="divide-y divide-border border-y border-border">
                        {members.map((member) => (
                            <div key={member.id} className="flex items-center justify-between py-4">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary text-sm font-medium">
                                        {member.name?.charAt(0) || member.email?.charAt(0) || '?'}
                                    </div>
                                    <div>
                                        <p className="font-medium text-sm">{member.name || 'Unnamed'}</p>
                                        <p className="text-xs text-muted-foreground truncate max-w-[150px] sm:max-w-none">{member.email}</p>
                                    </div>
                                </div>
                                <span className={`text-xs font-medium ${member.role === 'ADMIN' ? 'text-primary' : 'text-muted-foreground'}`}>
                                    {member.role}
                                </span>
                            </div>
                        ))}
                    </div>
                )}
            </section>

            {/* Edit Space Dialog */}
            <Dialog open={!!editingSpace} onOpenChange={(open) => !open && setEditingSpace(null)}>
                <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>Edit {editingSpace?.name}</DialogTitle>
                    </DialogHeader>

                    {editingSpace && (
                        <Tabs defaultValue="general" className="mt-4">
                            <TabsList className="grid w-full grid-cols-3">
                                <TabsTrigger value="general">General</TabsTrigger>
                                <TabsTrigger value="rules">Rules</TabsTrigger>
                                <TabsTrigger value="slots">Slots</TabsTrigger>
                            </TabsList>

                            <TabsContent value="general" className="space-y-4 pt-4">
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
                                            <SelectTrigger><SelectValue /></SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="BADMINTON">Badminton</SelectItem>
                                                <SelectItem value="TENNIS">Tennis</SelectItem>
                                                <SelectItem value="TABLE_TENNIS">Table Tennis</SelectItem>
                                                <SelectItem value="FOOTBALL">Football</SelectItem>
                                                <SelectItem value="BASKETBALL">Basketball</SelectItem>
                                                <SelectItem value="CRICKET">Cricket</SelectItem>
                                                <SelectItem value="SWIMMING">Swimming</SelectItem>
                                                <SelectItem value="SQUASH">Squash</SelectItem>
                                                <SelectItem value="GENERIC">Other</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label>Capacity</Label>
                                    <Input
                                        type="number"
                                        defaultValue={editingSpace.capacity}
                                        onChange={(e) => setEditingSpace({ ...editingSpace, capacity: parseInt(e.target.value) || editingSpace.capacity })}
                                        min={1}
                                    />
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
                                        Save
                                    </Button>
                                </div>
                            </TabsContent>

                            <TabsContent value="rules" className="space-y-4 pt-4">
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
                                        <Label>Max Duration (min)</Label>
                                        <Input type="number" defaultValue={editingSpace.rules?.maxDurationMin} id="maxDurationMin" />
                                    </div>
                                </div>
                                <div className="flex gap-2 pt-4">
                                    <Button variant="outline" className="flex-1" onClick={() => {
                                        const rules = {
                                            openTime: (document.getElementById('openTime') as HTMLInputElement).value,
                                            closeTime: (document.getElementById('closeTime') as HTMLInputElement).value,
                                            maxAdvanceDays: parseInt((document.getElementById('maxAdvanceDays') as HTMLInputElement).value),
                                            maxDurationMin: parseInt((document.getElementById('maxDurationMin') as HTMLInputElement).value),
                                        };
                                        handleUpdateRules(rules, true);
                                    }}>
                                        <Copy className="mr-2 h-4 w-4" />
                                        Apply to All
                                    </Button>
                                    <Button className="flex-1" onClick={() => {
                                        const rules = {
                                            openTime: (document.getElementById('openTime') as HTMLInputElement).value,
                                            closeTime: (document.getElementById('closeTime') as HTMLInputElement).value,
                                            maxAdvanceDays: parseInt((document.getElementById('maxAdvanceDays') as HTMLInputElement).value),
                                            maxDurationMin: parseInt((document.getElementById('maxDurationMin') as HTMLInputElement).value),
                                        };
                                        handleUpdateRules(rules, false);
                                    }}>
                                        {isUpdating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                        Save Rules
                                    </Button>
                                </div>
                            </TabsContent>

                            <TabsContent value="slots" className="pt-4">
                                <p className="text-sm text-muted-foreground mb-4">
                                    Slots represent individual booking positions within the space.
                                </p>
                                {editingSpace.slots?.length ? (
                                    <div className="divide-y divide-border border-y border-border">
                                        {editingSpace.slots.map((slot) => (
                                            <div key={slot.id} className="flex items-center justify-between py-3">
                                                <div className="flex items-center gap-3">
                                                    <span className="text-sm text-muted-foreground">#{slot.number}</span>
                                                    <span className="font-medium text-sm">{slot.name}</span>
                                                </div>
                                                <span className="text-xs text-muted-foreground">
                                                    {slot.isActive ? 'Active' : 'Inactive'}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <p className="text-sm text-muted-foreground text-center py-8">
                                        No slots configured. Using capacity count.
                                    </p>
                                )}
                            </TabsContent>
                        </Tabs>
                    )}
                </DialogContent>
            </Dialog>

            {/* Delete Confirmation */}
            <AlertDialog open={!!deleteSpaceId} onOpenChange={() => setDeleteSpaceId(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete space?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This will permanently delete this space and all its bookings.
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
                            Delete
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
