'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { User, Phone, IdCard, Loader2, Shield, Calendar, Building2, Pencil, X, Check, ArrowRight } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn, getInitials } from '@/lib/utils';
import { API_URL } from '@/lib/config';

export default function ProfilePage() {
    const { data: session } = useSession();
    const params = useParams();
    const orgSlug = params.slug as string;

    const [profile, setProfile] = useState<any>(null);
    const [isEditing, setIsEditing] = useState(false);
    const [formData, setFormData] = useState({
        name: '',
        phoneNumber: '',
        registrationId: '',
    });
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);

    // Fetch profile data
    const fetchProfile = async () => {
        try {
            const res = await fetch(`${API_URL}/api/users/me`, {
                headers: {
                    'x-user-email': session?.user?.email || '',
                    'x-user-name': session?.user?.name || '',
                },
            });
            const result = await res.json();
            if (result.success) {
                setProfile(result.data);
                setFormData({
                    name: result.data.name || '',
                    phoneNumber: result.data.phoneNumber || '',
                    registrationId: result.data.registrationId || '',
                });
            }
        } catch (error) {
            console.error('Failed to fetch profile:', error);
            toast.error('Could not load profile');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        if (session?.user?.email) {
            fetchProfile();
        }
    }, [session]);

    const handleSave = async () => {
        setIsSaving(true);
        try {
            const res = await fetch(`${API_URL}/api/users/me`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'x-user-email': session?.user?.email || '',
                    'x-user-name': session?.user?.name || '',
                },
                body: JSON.stringify(formData),
            });
            const result = await res.json();
            if (result.success) {
                setProfile({ ...profile, ...result.data });
                setIsEditing(false);
                toast.success('Profile updated successfully');
            } else {
                toast.error(result.error?.message || 'Failed to update profile');
            }
        } catch (error) {
            toast.error('An error occurred while saving');
        } finally {
            setIsSaving(false);
        }
    };

    const handleCancel = () => {
        setFormData({
            name: profile?.name || '',
            phoneNumber: profile?.phoneNumber || '',
            registrationId: profile?.registrationId || '',
        });
        setIsEditing(false);
    };

    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
                <div className="relative">
                    <div className="absolute inset-0 rounded-full bg-primary/20 animate-ping" />
                    <div className="relative bg-gradient-to-br from-primary to-primary/80 rounded-full p-4">
                        <Loader2 className="h-8 w-8 animate-spin text-white" />
                    </div>
                </div>
                <p className="text-muted-foreground font-medium animate-pulse">Loading your profile...</p>
            </div>
        );
    }

    return (
        <div className="max-w-5xl mx-auto pb-8">
            {/* Animated Background */}
            <div className="fixed inset-0 overflow-hidden pointer-events-none -z-10">
                <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-gradient-to-bl from-primary/15 via-primary/5 to-transparent rounded-full blur-3xl animate-pulse" style={{ animationDuration: '4s' }} />
                <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-gradient-to-tr from-primary/10 via-primary/5 to-transparent rounded-full blur-3xl animate-pulse" style={{ animationDuration: '5s' }} />
            </div>

            {/* Header Section with Gradient */}
            <div className="relative overflow-hidden rounded-3xl mb-8 bg-gradient-to-br from-primary/10 via-primary/5 to-background border border-border/50">
                <div className="absolute inset-0 bg-[linear-gradient(to_right,transparent_0%,rgba(255,255,255,0.1)_50%,transparent_100%)] opacity-50" />
                <div className="relative px-8 py-10 flex flex-col md:flex-row items-center gap-8">
                    {/* Avatar with Ring Animation */}
                    <div className="relative group">
                        <div className="absolute -inset-1 bg-gradient-to-br from-primary via-primary/50 to-primary/30 rounded-full opacity-75 group-hover:opacity-100 blur transition-all duration-500 group-hover:blur-md" />
                        <Avatar className="relative h-28 w-28 md:h-32 md:w-32 border-4 border-background shadow-2xl ring-2 ring-white/20">
                            <AvatarImage src={session?.user?.image || ''} className="object-cover" />
                            <AvatarFallback className="text-3xl md:text-4xl font-bold bg-gradient-to-br from-primary/20 to-primary/10 text-primary">
                                {getInitials(profile?.name || 'U')}
                            </AvatarFallback>
                        </Avatar>
                    </div>

                    {/* Profile Info */}
                    <div className="flex-1 text-center md:text-left space-y-2">
                        <h1 className="text-3xl md:text-4xl font-bold tracking-tight">{profile?.name}</h1>
                        <p className="text-muted-foreground font-medium text-lg">{profile?.email}</p>
                        <div className="flex items-center justify-center md:justify-start gap-4 pt-2 text-sm text-muted-foreground">
                            <span className="flex items-center gap-1.5">
                                <Calendar className="h-4 w-4" />
                                Joined {new Date(profile?.createdAt).toLocaleDateString(undefined, { month: 'short', year: 'numeric' })}
                            </span>
                            <span className="flex items-center gap-1.5">
                                <Building2 className="h-4 w-4" />
                                {profile?.organizations?.length || 0} organization{(profile?.organizations?.length || 0) !== 1 ? 's' : ''}
                            </span>
                        </div>
                    </div>

                    {/* Edit Button */}
                    <div className="flex-shrink-0">
                        {!isEditing ? (
                            <Button
                                onClick={() => setIsEditing(true)}
                                variant="outline"
                                size="lg"
                                className="rounded-xl gap-2 bg-background/80 backdrop-blur-sm hover:bg-background hover:scale-105 transition-all duration-300 shadow-lg"
                            >
                                <Pencil className="h-4 w-4" />
                                Edit Profile
                            </Button>
                        ) : (
                            <div className="flex gap-2">
                                <Button
                                    onClick={handleCancel}
                                    variant="ghost"
                                    size="lg"
                                    className="rounded-xl gap-2 hover:bg-destructive/10 hover:text-destructive transition-all duration-300"
                                >
                                    <X className="h-4 w-4" />
                                    Cancel
                                </Button>
                                <Button
                                    onClick={handleSave}
                                    disabled={isSaving}
                                    size="lg"
                                    className="rounded-xl gap-2 bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary shadow-lg hover:shadow-primary/25 hover:scale-105 transition-all duration-300"
                                >
                                    {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                                    Save Changes
                                </Button>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Personal Details Section */}
                <div className="lg:col-span-2 space-y-6">
                    <div className={cn(
                        "bg-background/80 backdrop-blur-xl border rounded-2xl shadow-lg overflow-hidden transition-all duration-500",
                        isEditing ? "border-primary/50 ring-2 ring-primary/20" : "border-border/50"
                    )}>
                        <div className="px-6 py-4 border-b border-border/50 bg-gradient-to-r from-muted/50 to-transparent">
                            <h3 className="font-bold text-lg flex items-center gap-2">
                                <User className="h-5 w-5 text-primary" />
                                Personal Details
                            </h3>
                        </div>
                        <div className="p-6">
                            {isEditing ? (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in fade-in slide-in-from-top-2 duration-300">
                                    <div className="space-y-2">
                                        <Label htmlFor="edit-name" className="text-sm font-semibold">Display Name</Label>
                                        <Input
                                            id="edit-name"
                                            value={formData.name}
                                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                            className="rounded-xl h-12 text-base transition-all duration-200 focus:ring-2 focus:ring-primary/20"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="edit-phone" className="text-sm font-semibold flex items-center gap-2">
                                            <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                                            Phone Number
                                        </Label>
                                        <Input
                                            id="edit-phone"
                                            value={formData.phoneNumber}
                                            onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
                                            placeholder="+1 234 567 890"
                                            className="rounded-xl h-12 text-base transition-all duration-200 focus:ring-2 focus:ring-primary/20"
                                        />
                                    </div>
                                    <div className="space-y-2 md:col-span-2">
                                        <Label htmlFor="edit-id" className="text-sm font-semibold flex items-center gap-2">
                                            <IdCard className="h-3.5 w-3.5 text-muted-foreground" />
                                            Registration / ID Number
                                        </Label>
                                        <Input
                                            id="edit-id"
                                            value={formData.registrationId}
                                            onChange={(e) => setFormData({ ...formData, registrationId: e.target.value })}
                                            placeholder="EMP-123 or STU-456"
                                            className="rounded-xl h-12 text-base transition-all duration-200 focus:ring-2 focus:ring-primary/20"
                                        />
                                    </div>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <DetailItem
                                        icon={<User className="h-4 w-4" />}
                                        label="Display Name"
                                        value={profile?.name || 'Not provided'}
                                    />
                                    <DetailItem
                                        icon={<Phone className="h-4 w-4" />}
                                        label="Phone Number"
                                        value={profile?.phoneNumber || 'Not provided'}
                                        empty={!profile?.phoneNumber}
                                    />
                                    <DetailItem
                                        icon={<IdCard className="h-4 w-4" />}
                                        label="Registration ID"
                                        value={profile?.registrationId || 'Not provided'}
                                        empty={!profile?.registrationId}
                                        className="md:col-span-2"
                                    />
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Account Summary Card */}
                <div className="space-y-6">
                    <div className="bg-gradient-to-br from-primary/10 via-background to-background border border-border/50 rounded-2xl p-6 shadow-lg">
                        <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
                            <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                                <User className="h-4 w-4 text-primary" />
                            </div>
                            Account Summary
                        </h3>
                        <div className="space-y-4">
                            <div className="flex items-center justify-between p-3 rounded-xl bg-background/60 border border-border/30">
                                <span className="text-muted-foreground text-sm">Member since</span>
                                <span className="font-semibold text-sm">
                                    {new Date(profile?.createdAt).toLocaleDateString(undefined, {
                                        month: 'short',
                                        day: 'numeric',
                                        year: 'numeric'
                                    })}
                                </span>
                            </div>
                            <div className="flex items-center justify-between p-3 rounded-xl bg-background/60 border border-border/30">
                                <span className="text-muted-foreground text-sm">Organizations</span>
                                <span className="font-semibold text-sm bg-primary/10 text-primary px-2.5 py-0.5 rounded-full">
                                    {profile?.organizations?.length || 0}
                                </span>
                            </div>
                            <div className="flex items-center justify-between p-3 rounded-xl bg-background/60 border border-border/30">
                                <span className="text-muted-foreground text-sm">Profile Status</span>
                                <span className={cn(
                                    "font-semibold text-sm px-2.5 py-0.5 rounded-full",
                                    profile?.phoneNumber && profile?.registrationId
                                        ? "bg-green-500/10 text-green-600"
                                        : "bg-amber-500/10 text-amber-600"
                                )}>
                                    {profile?.phoneNumber && profile?.registrationId ? 'Complete' : 'Incomplete'}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Organizations Section */}
            <div className="mt-8 space-y-4">
                <h3 className="text-xl font-bold flex items-center gap-2">
                    <Building2 className="h-5 w-5 text-primary" />
                    My Organizations
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {profile?.organizations?.length > 0 ? (
                        profile.organizations.map((org: any, index: number) => (
                            <div
                                key={org.id}
                                className="group relative bg-background/80 backdrop-blur-xl border border-border/50 rounded-2xl p-5 hover:border-primary/50 hover:shadow-lg hover:shadow-primary/5 transition-all duration-300 animate-in fade-in slide-in-from-bottom-2"
                                style={{ animationDelay: `${index * 100}ms` }}
                            >
                                <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-2xl" />
                                <div className="relative flex items-center gap-4">
                                    <div className="h-14 w-14 rounded-xl bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center text-primary shadow-sm group-hover:scale-110 transition-transform duration-300">
                                        <span className="font-bold text-2xl">{org.name.charAt(0)}</span>
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <h4 className="font-bold text-lg truncate">{org.name}</h4>
                                        <p className="text-sm text-muted-foreground flex items-center gap-2">
                                            <span className={cn(
                                                "h-2 w-2 rounded-full animate-pulse",
                                                org.role === 'ADMIN' ? 'bg-amber-500' : 'bg-green-500'
                                            )} />
                                            {org.role.charAt(0) + org.role.slice(1).toLowerCase()}
                                        </p>
                                    </div>
                                    <div className="flex flex-col sm:flex-row gap-2">
                                        <Button
                                            asChild
                                            variant="ghost"
                                            size="sm"
                                            className="rounded-xl gap-2 hover:bg-primary/10 hover:text-primary group/btn"
                                        >
                                            <Link href={`/org/${org.slug}/book`}>
                                                <Calendar className="h-4 w-4" />
                                                <span className="hidden sm:inline">Book</span>
                                                <ArrowRight className="h-3 w-3 opacity-0 -ml-1 group-hover/btn:opacity-100 group-hover/btn:ml-0 transition-all duration-200" />
                                            </Link>
                                        </Button>
                                        {org.role === 'ADMIN' && (
                                            <Button
                                                asChild
                                                variant="outline"
                                                size="sm"
                                                className="rounded-xl gap-2 border-amber-500/30 text-amber-600 hover:border-amber-500/50 hover:bg-amber-500/10 group/btn"
                                            >
                                                <Link href={`/org/${org.slug}/admin`}>
                                                    <Shield className="h-4 w-4" />
                                                    <span className="hidden sm:inline">Admin</span>
                                                </Link>
                                            </Button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))
                    ) : (
                        <div className="md:col-span-2 text-center py-16 bg-gradient-to-br from-muted/30 via-background to-muted/20 border border-dashed border-border/50 rounded-2xl">
                            <Building2 className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
                            <p className="text-muted-foreground font-medium">You are not a member of any organizations yet.</p>
                            <p className="text-muted-foreground/60 text-sm mt-1">Join an organization to start booking!</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

// Detail Item Component
function DetailItem({
    icon,
    label,
    value,
    empty,
    className
}: {
    icon: React.ReactNode;
    label: string;
    value: string;
    empty?: boolean;
    className?: string;
}) {
    return (
        <div className={cn("p-4 rounded-xl bg-muted/30 border border-border/30 hover:border-primary/30 transition-all duration-200 group", className)}>
            <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2 mb-1.5">
                <span className="text-primary/60 group-hover:text-primary transition-colors">{icon}</span>
                {label}
            </p>
            <p className={cn(
                "text-lg font-medium",
                empty && "text-muted-foreground/50 italic"
            )}>
                {value}
            </p>
        </div>
    );
}
