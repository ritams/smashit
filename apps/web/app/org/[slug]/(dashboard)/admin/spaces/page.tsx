'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import {
    LayoutGrid,
    PlusCircle,
    Trash2,
    Loader2,
    Pencil,
    Copy,
    Plus,
    Settings
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { ImageUpload } from "@/components/ui/image-upload";
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
import { API_URL } from '@/lib/config';

// Space type configuration


interface BookingRules {
    id: string;
    slotDurationMin: number;
    openTime: string;
    closeTime: string;
    maxAdvanceDays: number;
    maxDurationMin: number;
    allowRecurring: boolean;
    bufferMinutes: number;
    maxBookingsPerUserPerDay?: number | null;
    maxTotalBookingsPerDay?: number | null;
    maxActiveBookingsPerUser?: number | null;
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
    capacity: number;
    isActive: boolean;
    facilityId: string;
    slots?: Slot[];
}

interface Facility {
    id: string;
    name: string;
    description: string | null;
    type: string;
    imageUrls: string[];
    location: string | null;
    mapLink: string | null;
    guidelines: string[];
    rules?: BookingRules;
    spaces: Space[];
}

export default function FacilitiesAdminPage() {
    const params = useParams();
    const { data: session } = useSession();
    const orgSlug = params.slug as string;

    const [facilities, setFacilities] = useState<Facility[]>([]);
    const [loading, setLoading] = useState(true);

    // Facility state
    const [showCreateFacility, setShowCreateFacility] = useState(false);
    const [editingFacility, setEditingFacility] = useState<Facility | null>(null);
    const [isCreatingFac, setIsCreatingFac] = useState(false);
    const [deleteFacId, setDeleteFacId] = useState<string | null>(null);

    // Space state
    const [showAddSpaceId, setShowAddSpaceId] = useState<string | null>(null); // Facility ID where space is being added
    const [editingSpace, setEditingSpace] = useState<Space | null>(null);
    const [deleteSpaceId, setDeleteSpaceId] = useState<string | null>(null);
    const [isSubmittingSpace, setIsSubmittingSpace] = useState(false);

    useEffect(() => {
        async function fetchData() {
            if (!session?.user?.email) return;
            setLoading(true);
            try {
                const data = await api.getAdminFacilities(orgSlug);
                setFacilities(data || []);
            } catch (err) {
                console.error('Failed to fetch data:', err);
                toast.error('Failed to load facilities');
            }
            setLoading(false);
        }
        fetchData();
    }, [orgSlug, session?.user?.email]);

    // --- Facility Actions ---

    const handleCreateFacility = async (formData: any) => {
        setIsCreatingFac(true);
        try {
            const data = await api.createFacility(orgSlug, formData);
            setFacilities(prev => [...prev, { ...data, spaces: [] }]);
            setShowCreateFacility(false);
            toast.success('Facility created');
        } catch (err) {
            toast.error('Failed to create facility');
        }
        setIsCreatingFac(false);
    };

    const handleUpdateFacility = async (facId: string, updatedData: any) => {
        try {
            const data = await api.updateFacility(orgSlug, facId, updatedData);
            setFacilities(prev => prev.map(f => f.id === facId ? { ...f, ...data } : f));
            setEditingFacility(null);
            toast.success('Facility updated');
        } catch (err) {
            toast.error('Update failed');
        }
    };

    const handleUpdateFacilityRules = async (facId: string, rules: any) => {
        try {
            const data = await api.updateFacilityRules(orgSlug, facId, rules);
            setFacilities(prev => prev.map(f => f.id === facId ? { ...f, rules: data } : f));
            toast.success('Rules updated');
        } catch (err) {
            toast.error('Failed to update rules');
        }
    };

    const handleDeleteFacility = async () => {
        if (!deleteFacId) return;
        try {
            await api.deleteFacility(orgSlug, deleteFacId);
            setFacilities(prev => prev.filter(f => f.id !== deleteFacId));
            setDeleteFacId(null);
            toast.success('Facility deleted');
        } catch (err) {
            toast.error('Delete failed');
        }
    };

    // --- Space Actions ---

    const handleAddSpace = async (facId: string, name: string, capacity: string) => {
        setIsSubmittingSpace(true);
        try {
            const data = await api.createSpace(orgSlug, {
                name,
                facilityId: facId,
                capacity: parseInt(capacity) || 1,
            });
            setFacilities(prev => prev.map(f => f.id === facId ? { ...f, spaces: [...f.spaces, data] } : f));
            setShowAddSpaceId(null);
            toast.success('Space added');
        } catch (err) {
            toast.error('Failed to add space');
        }
        setIsSubmittingSpace(false);
    };

    const handleUpdateSpace = async (spaceId: string, updatedData: any) => {
        try {
            const data = await api.updateSpace(orgSlug, spaceId, updatedData);
            setFacilities(prev => prev.map(f => ({
                ...f,
                spaces: f.spaces.map(s => s.id === spaceId ? { ...s, ...data } : s)
            })));
            setEditingSpace(null);
            toast.success('Space updated');
        } catch (err) {
            toast.error('Update failed');
        }
    };

    const handleDeleteSpace = async () => {
        if (!deleteSpaceId) return;
        try {
            await api.deleteSpace(orgSlug, deleteSpaceId);
            setFacilities(prev => prev.map(f => ({
                ...f,
                spaces: f.spaces.filter(s => s.id !== deleteSpaceId)
            })));
            setDeleteSpaceId(null);
            toast.success('Space removed');
        } catch (err) {
            toast.error('Delete failed');
        }
    };

    if (loading) {
        return (
            <div className="space-y-6">
                <Skeleton className="h-8 w-48 mb-2" />
                {[1, 2, 3].map((i) => <Skeleton key={i} className="h-32 w-full rounded-xl" />)}
            </div>
        );
    }

    return (
        <div className="space-y-16 pb-20">
            <header className="flex flex-col sm:flex-row sm:items-end justify-between gap-8">
                <div className="space-y-4">
                    <div className="flex items-center gap-3 text-muted-foreground/40 uppercase tracking-[.2em] text-[11px] font-bold">
                        <LayoutGrid className="h-4 w-4" />
                        Infrastructure
                    </div>
                    <h1 className="font-display text-4xl font-medium tracking-tight text-foreground leading-tight">
                        Facility <span className="text-muted-foreground/30 font-light italic">Management</span>
                    </h1>
                    <p className="text-lg text-muted-foreground/60 max-w-2xl font-light">
                        Configure your physical centers, manage court availability, and establish global booking protocols.
                    </p>
                </div>
                <Button onClick={() => setShowCreateFacility(true)} className="rounded-2xl h-12 px-8 text-sm font-semibold shadow-xl shadow-primary/10 hover:shadow-primary/20 transition-all duration-300">
                    <PlusCircle className="h-4 w-4 mr-2.5 opacity-70" />
                    Create Facility
                </Button>
            </header>

            {facilities.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-32 border border-dashed border-border/40 rounded-[3rem] bg-muted/[0.02] text-center overflow-hidden relative">
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(var(--primary-rgb),0.02)_0%,transparent_70%)]" />
                    <div className="relative">
                        <div className="h-20 w-20 rounded-[2rem] bg-background border border-border/40 flex items-center justify-center mb-8 shadow-sm">
                            <LayoutGrid className="h-8 w-8 text-primary/20" />
                        </div>
                        <h3 className="text-2xl font-display font-medium text-foreground/80">Establish Your First Center</h3>
                        <p className="text-muted-foreground/60 max-w-sm mt-3 mb-10 font-light">
                            Begin by creating a facility group (e.g., "The Tennis Hub") to organize your playable spaces.
                        </p>
                        <Button onClick={() => setShowCreateFacility(true)} variant="outline" className="rounded-2xl h-12 px-10 text-sm font-semibold hover:bg-primary/5 hover:text-primary transition-all duration-500">
                            Get Started
                        </Button>
                    </div>
                </div>
            ) : (
                <div className="space-y-24">
                    {facilities.map((fac) => (
                        <section key={fac.id} className="animate-in fade-in slide-in-from-bottom-4 duration-700">
                            <div className="flex flex-col lg:flex-row gap-12">
                                {/* Facility Header Info */}
                                <div className="lg:w-1/3 space-y-6">
                                    <div className="space-y-4">
                                        <div className="flex items-center gap-3">
                                            <span className="px-3 py-1 rounded-full bg-primary/10 text-primary text-[10px] font-bold uppercase tracking-widest leading-none">
                                                {fac.type}
                                            </span>
                                            <span className="text-[10px] font-semibold text-muted-foreground/40 uppercase tracking-widest leading-none">
                                                {fac.spaces.length} {fac.spaces.length === 1 ? 'Space' : 'Spaces'}
                                            </span>
                                        </div>
                                        <h2 className="text-3xl font-display font-medium text-foreground tracking-tight">{fac.name}</h2>
                                        {fac.location && (
                                            <p className="text-sm text-muted-foreground/60 font-medium leading-relaxed">
                                                {fac.location}
                                            </p>
                                        )}
                                    </div>

                                    <div className="flex gap-2 pt-2">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            className="h-10 px-5 rounded-xl text-xs font-semibold hover:bg-primary/5 hover:text-primary transition-all"
                                            onClick={() => setEditingFacility(fac)}
                                        >
                                            <Settings className="h-3.5 w-3.5 mr-2 opacity-60" />
                                            Settings
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-10 w-10 rounded-xl text-muted-foreground/40 hover:text-destructive hover:bg-destructive/5 transition-all"
                                            onClick={() => setDeleteFacId(fac.id)}
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </div>

                                {/* Spaces Grid */}
                                <div className="lg:w-2/3 border-t lg:border-t-0 lg:border-l border-border/40 pt-8 lg:pt-0 lg:pl-12">
                                    <div className="flex items-center gap-3 mb-8 text-muted-foreground/40 uppercase tracking-[.2em] text-[10px] font-bold">
                                        <LayoutGrid className="h-3.5 w-3.5" />
                                        Configured Spaces
                                    </div>

                                    <div className="grid sm:grid-cols-2 gap-4">
                                        {fac.spaces.map((space) => (
                                            <div
                                                key={space.id}
                                                className="group relative flex items-center justify-between p-5 bg-background border border-border/40 hover:border-primary/20 rounded-[1.5rem] transition-all duration-300"
                                            >
                                                <div className="min-w-0">
                                                    <p className="font-semibold text-[15px] text-foreground/80 truncate">{space.name}</p>
                                                    <p className="text-[10px] text-muted-foreground/40 font-bold uppercase tracking-widest mt-0.5">
                                                        {space.capacity} {space.capacity === 1 ? 'Player' : 'Players'}
                                                    </p>
                                                </div>
                                                <div className="flex gap-1.5 opacity-0 group-hover:opacity-100 transition-all duration-300 translate-x-2 group-hover:translate-x-0">
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-9 w-9 rounded-xl hover:bg-primary/5 hover:text-primary transition-all"
                                                        onClick={() => setEditingSpace(space)}
                                                    >
                                                        <Pencil className="h-3.5 w-3.5" />
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-9 w-9 rounded-xl text-muted-foreground/30 hover:text-destructive hover:bg-destructive/5 transition-all"
                                                        onClick={() => setDeleteSpaceId(space.id)}
                                                    >
                                                        <Trash2 className="h-3.5 w-3.5" />
                                                    </Button>
                                                </div>
                                            </div>
                                        ))}
                                        <button
                                            onClick={() => setShowAddSpaceId(fac.id)}
                                            className="flex items-center justify-center gap-3 p-5 border border-dashed border-border/40 hover:border-primary/20 hover:bg-primary/[0.01] rounded-[1.5rem] transition-all duration-500 group"
                                        >
                                            <Plus className="h-4 w-4 text-muted-foreground/30 group-hover:text-primary transition-colors" />
                                            <span className="text-[11px] font-bold text-muted-foreground/40 group-hover:text-primary transition-colors uppercase tracking-[.15em]">
                                                Add Space
                                            </span>
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </section>
                    ))}
                </div>
            )}

            {/* Facility Creation/Editing Dialog */}
            <Dialog open={showCreateFacility || !!editingFacility} onOpenChange={(open) => {
                if (!open) {
                    setShowCreateFacility(false);
                    setEditingFacility(null);
                }
            }}>
                <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto rounded-[2rem]">
                    <DialogTitle className="sr-only">
                        {editingFacility ? 'Edit Facility' : 'Create Facility'}
                    </DialogTitle>
                    <FacilityDialogContents
                        editingFacility={editingFacility}
                        isSubmitting={isCreatingFac}
                        onSubmit={editingFacility ? (data: any) => handleUpdateFacility(editingFacility.id, data) : handleCreateFacility}
                        onCancel={() => { setShowCreateFacility(false); setEditingFacility(null); }}
                        onUpdateRules={handleUpdateFacilityRules}
                    />
                </DialogContent>
            </Dialog>

            {/* Simple Add Space Dialog */}
            <Dialog open={!!showAddSpaceId} onOpenChange={(open) => !open && setShowAddSpaceId(null)}>
                <DialogContent className="sm:max-w-md rounded-[2rem]">
                    <DialogHeader>
                        <DialogTitle>Add Space</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label>Name</Label>
                            <Input placeholder="e.g. Court 1" id="newSpaceName" className="rounded-xl" />
                        </div>
                        <div className="space-y-2">
                            <Label>Capacity (Players)</Label>
                            <Input type="number" defaultValue="4" id="newSpaceCap" className="rounded-xl" />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button onClick={() => {
                            const name = (document.getElementById('newSpaceName') as HTMLInputElement).value;
                            const cap = (document.getElementById('newSpaceCap') as HTMLInputElement).value;
                            if (showAddSpaceId) handleAddSpace(showAddSpaceId, name, cap);
                        }} className="rounded-xl px-8" disabled={isSubmittingSpace}>
                            {isSubmittingSpace && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Add Space
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Simple Edit Space Dialog */}
            <Dialog open={!!editingSpace} onOpenChange={(open) => !open && setEditingSpace(null)}>
                <DialogContent className="sm:max-w-md rounded-[2rem]">
                    <DialogHeader>
                        <DialogTitle>Edit Space</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label>Name</Label>
                            <Input defaultValue={editingSpace?.name} id="editSpaceName" className="rounded-xl" />
                        </div>
                        <div className="space-y-2">
                            <Label>Capacity (Players)</Label>
                            <Input type="number" defaultValue={editingSpace?.capacity.toString()} id="editSpaceCap" className="rounded-xl" />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button onClick={() => {
                            const name = (document.getElementById('editSpaceName') as HTMLInputElement).value;
                            const cap = (document.getElementById('editSpaceCap') as HTMLInputElement).value;
                            if (editingSpace) handleUpdateSpace(editingSpace.id, { name, capacity: parseInt(cap) });
                        }} className="rounded-xl px-8">Update Space</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Delete Confirmation for Facility */}
            <AlertDialog open={!!deleteFacId} onOpenChange={() => setDeleteFacId(null)}>
                <AlertDialogContent className="rounded-[2.5rem] p-10">
                    <AlertDialogHeader>
                        <AlertDialogTitle className="text-2xl font-display">Delete Facility?</AlertDialogTitle>
                        <AlertDialogDescription className="text-base text-muted-foreground/80 leading-relaxed pt-2">
                            This will permanently delete this facility, all its subordinate spaces, and all associated bookings. This action cannot be reversed.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter className="pt-8">
                        <AlertDialogCancel className="rounded-2xl h-12 px-6">Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDeleteFacility} className="bg-destructive hover:bg-destructive/90 text-destructive-foreground rounded-2xl h-12 px-8 font-semibold">
                            Delete Everything
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {/* Delete Confirmation for Space */}
            <AlertDialog open={!!deleteSpaceId} onOpenChange={() => setDeleteSpaceId(null)}>
                <AlertDialogContent className="rounded-[2rem]">
                    <AlertDialogHeader>
                        <AlertDialogTitle>Remove Space?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This will remove this specific space and its bookings.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDeleteSpace} className="bg-destructive text-destructive-foreground rounded-xl">
                            Delete Space
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}

function FacilityRulesTabContent({ initialRules, onUpdate }: { initialRules?: BookingRules; onUpdate: (rules: any) => void }) {
    const [rules, setRules] = useState<Partial<BookingRules>>(initialRules || {
        slotDurationMin: 60,
        openTime: '09:00',
        closeTime: '21:00',
        maxAdvanceDays: 7,
        maxDurationMin: 120,
        allowRecurring: false,
        bufferMinutes: 0
    });

    const [isSaving, setIsSaving] = useState(false);

    const handleSave = async () => {
        setIsSaving(true);
        try {
            await onUpdate(rules);
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="space-y-10">
            <div className="grid sm:grid-cols-2 gap-8">
                <div className="space-y-3">
                    <Label className="text-[10px] font-bold text-muted-foreground/40 uppercase tracking-[.2em] ml-1">Open Time</Label>
                    <Input value={rules.openTime} onChange={e => setRules({ ...rules, openTime: e.target.value })} placeholder="09:00" className="rounded-2xl h-12 bg-background/50 border-border/40 focus:ring-primary/10" />
                </div>
                <div className="space-y-3">
                    <Label className="text-[10px] font-bold text-muted-foreground/40 uppercase tracking-[.2em] ml-1">Close Time</Label>
                    <Input value={rules.closeTime} onChange={e => setRules({ ...rules, closeTime: e.target.value })} placeholder="21:00" className="rounded-2xl h-12 bg-background/50 border-border/40 focus:ring-primary/10" />
                </div>
            </div>

            <div className="grid sm:grid-cols-2 gap-8">
                <div className="space-y-3">
                    <Label className="text-[10px] font-bold text-muted-foreground/40 uppercase tracking-[.2em] ml-1">Slot Duration (Min)</Label>
                    <Input type="number" value={rules.slotDurationMin} onChange={e => setRules({ ...rules, slotDurationMin: parseInt(e.target.value) })} className="rounded-2xl h-12 bg-background/50 border-border/40 focus:ring-primary/10" />
                </div>
                <div className="space-y-3">
                    <Label className="text-[10px] font-bold text-muted-foreground/40 uppercase tracking-[.2em] ml-1">Buffer Between Slots (Min)</Label>
                    <Input type="number" value={rules.bufferMinutes} onChange={e => setRules({ ...rules, bufferMinutes: parseInt(e.target.value) })} className="rounded-2xl h-12 bg-background/50 border-border/40 focus:ring-primary/10" />
                </div>
            </div>

            <div className="grid sm:grid-cols-2 gap-8">
                <div className="space-y-3">
                    <Label className="text-[10px] font-bold text-muted-foreground/40 uppercase tracking-[.2em] ml-1">Max Advance Booking (Days)</Label>
                    <Input type="number" value={rules.maxAdvanceDays} onChange={e => setRules({ ...rules, maxAdvanceDays: parseInt(e.target.value) })} className="rounded-2xl h-12 bg-background/50 border-border/40 focus:ring-primary/10" />
                </div>
                <div className="space-y-3">
                    <Label className="text-[10px] font-bold text-muted-foreground/40 uppercase tracking-[.2em] ml-1">Max Booking Duration (Min)</Label>
                    <Input type="number" value={rules.maxDurationMin} onChange={e => setRules({ ...rules, maxDurationMin: parseInt(e.target.value) })} className="rounded-2xl h-12 bg-background/50 border-border/40 focus:ring-primary/10" />
                </div>
            </div>

            <div className="flex items-center justify-between p-6 bg-muted/[0.03] rounded-[1.5rem] border border-border/40 transition-colors hover:bg-muted/[0.05]">
                <div className="space-y-1">
                    <Label className="text-sm font-semibold text-foreground/80">Allow Recurring Bookings</Label>
                    <p className="text-[11px] text-muted-foreground/60 font-medium leading-relaxed">Permit users to schedule sessions across multiple dates simultaneously.</p>
                </div>
                <input
                    type="checkbox"
                    checked={rules.allowRecurring}
                    onChange={e => setRules({ ...rules, allowRecurring: e.target.checked })}
                    className="h-5 w-5 rounded-md border-border/60 text-primary focus:ring-primary/20 transition-all cursor-pointer"
                />
            </div>

            <div className="pt-8 border-t border-border/40">
                <Button onClick={handleSave} disabled={isSaving} className="w-full rounded-[1.5rem] h-14 text-sm font-semibold tracking-wide shadow-xl shadow-primary/10 hover:shadow-primary/20 transition-all">
                    {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Update Global Facility Rules
                </Button>
            </div>
        </div>
    );
}

// Sub-component for Facility Dialog to manage controlled state easily
function FacilityDialogContents({ editingFacility, isSubmitting, onSubmit, onCancel, onUpdateRules }: any) {
    const [name, setName] = useState(editingFacility?.name || '');
    const [type, setType] = useState(editingFacility?.type || 'BADMINTON');
    const [description, setDescription] = useState(editingFacility?.description || '');
    const [location, setLocation] = useState(editingFacility?.location || '');
    const [imageUrl, setImageUrl] = useState(editingFacility?.imageUrls?.[0] || '');
    const [mapLink, setMapLink] = useState(editingFacility?.mapLink || '');
    const [guidelines, setGuidelines] = useState(editingFacility?.guidelines?.join('\n') || '');

    return (
        <div className="space-y-10 py-4">
            <Tabs defaultValue="general" className="w-full">
                <TabsList className="grid w-full grid-cols-2 mb-10 bg-muted/[0.03] p-1.5 h-auto rounded-2xl border border-border/40">
                    <TabsTrigger value="general" className="rounded-xl py-3 text-xs font-bold uppercase tracking-widest transition-all data-[state=active]:bg-background data-[state=active]:shadow-sm">General</TabsTrigger>
                    <TabsTrigger value="rules" className="rounded-xl py-3 text-xs font-bold uppercase tracking-widest transition-all data-[state=active]:bg-background data-[state=active]:shadow-sm">Booking Rules</TabsTrigger>
                </TabsList>

                <TabsContent value="general" className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-500">
                    <div className="grid sm:grid-cols-2 gap-8">
                        <div className="space-y-3">
                            <Label className="text-[10px] font-bold text-muted-foreground/40 uppercase tracking-[.2em] ml-1">Name</Label>
                            <Input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Badminton Wing" className="rounded-2xl h-12 bg-background/50 border-border/40 focus:ring-primary/10" />
                        </div>
                        <div className="space-y-3">
                            <Label className="text-[10px] font-bold text-muted-foreground/40 uppercase tracking-[.2em] ml-1">Type</Label>
                            <Select value={type} onValueChange={setType}>
                                <SelectTrigger className="rounded-2xl h-12 bg-background/50 border-border/40 focus:ring-primary/10"><SelectValue /></SelectTrigger>
                                <SelectContent className="rounded-2xl border-border/40 shadow-2xl">
                                    {Object.keys(SPACE_TYPES).map(t => <SelectItem key={t} value={t} className="rounded-xl my-1">{SPACE_TYPES[t].label}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <div className="space-y-3">
                        <Label className="text-[10px] font-bold text-muted-foreground/40 uppercase tracking-[.2em] ml-1">Hero Image</Label>
                        <div className="flex justify-center p-4 border-2 border-dashed border-border/40 hover:border-border/60 rounded-2xl transition-all">
                            <ImageUpload
                                name="Facility"
                                currentImageUrl={imageUrl}
                                uploadMode="generic"
                                onUploadComplete={(url) => setImageUrl(url)}
                            />
                        </div>
                    </div>

                    <div className="space-y-3">
                        <Label className="text-[10px] font-bold text-muted-foreground/40 uppercase tracking-[.2em] ml-1">About</Label>
                        <textarea
                            value={description} onChange={e => setDescription(e.target.value)}
                            className="flex min-h-[120px] w-full rounded-2xl border border-border/40 bg-background/50 px-5 py-4 text-sm font-medium leading-relaxed focus:outline-none focus:ring-2 focus:ring-primary/10 transition-all text-foreground placeholder:text-muted-foreground"
                            placeholder="Tell users about this facility..."
                        />
                    </div>
                    <div className="grid sm:grid-cols-2 gap-8">
                        <div className="space-y-3">
                            <Label className="text-[10px] font-bold text-muted-foreground/40 uppercase tracking-[.2em] ml-1">Location</Label>
                            <Input value={location} onChange={e => setLocation(e.target.value)} placeholder="e.g. Main Block" className="rounded-2xl h-12 bg-background/50 border-border/40 focus:ring-primary/10" />
                        </div>
                        {/* Removed manual image URL input in favor of uploader */}
                    </div>
                    <div className="space-y-3">
                        <Label className="text-[10px] font-bold text-muted-foreground/40 uppercase tracking-[.2em] ml-1">Map Navigation Link</Label>
                        <Input value={mapLink} onChange={e => setMapLink(e.target.value)} placeholder="Google Maps URL..." className="rounded-2xl h-12 bg-background/50 border-border/40 focus:ring-primary/10" />
                    </div>
                    <div className="space-y-3">
                        <Label className="text-[10px] font-bold text-muted-foreground/40 uppercase tracking-[.2em] ml-1">Guidelines (One per line)</Label>
                        <textarea
                            value={guidelines} onChange={e => setGuidelines(e.target.value)}
                            className="flex min-h-[120px] w-full rounded-2xl border border-border/40 bg-background/50 px-5 py-4 text-sm font-medium leading-relaxed focus:outline-none focus:ring-2 focus:ring-primary/10 transition-all no-scrollbar"
                            placeholder="e.g. Non-marking shoes mandatory"
                        />
                    </div>

                    <div className="pt-8 flex gap-3">
                        <Button variant="outline" onClick={onCancel} className="flex-1 rounded-[1.5rem] h-14 text-sm font-bold uppercase tracking-widest hover:bg-muted/10 transition-all">Cancel</Button>
                        <Button onClick={() => {
                            const payload = {
                                name,
                                type,
                                description: description || null,
                                location: location || null,
                                imageUrls: [imageUrl].filter(Boolean),
                                mapLink: mapLink || null,
                                guidelines: guidelines.split('\n').filter(Boolean)
                            };
                            onSubmit(payload);
                        }} disabled={isSubmitting} className="flex-[2] rounded-[1.5rem] h-14 text-sm font-bold uppercase tracking-widest shadow-xl shadow-primary/10 hover:shadow-primary/20 transition-all">
                            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            {editingFacility ? 'Save Changes' : 'Initialize Facility'}
                        </Button>
                    </div>
                </TabsContent>

                <TabsContent value="rules" className="animate-in fade-in slide-in-from-bottom-2 duration-500">
                    {editingFacility ? (
                        <FacilityRulesTabContent initialRules={editingFacility.rules} onUpdate={(rules) => onUpdateRules(editingFacility.id, rules)} />
                    ) : (
                        <div className="py-20 text-center border border-dashed border-border/40 rounded-[2rem] bg-muted/[0.02]">
                            <p className="text-sm text-muted-foreground/60 font-medium">Please create the facility first to configure its rules.</p>
                        </div>
                    )}
                </TabsContent>
            </Tabs>
        </div>
    );
}

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

