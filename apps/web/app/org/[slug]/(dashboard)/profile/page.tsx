'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { User, Phone, IdCard, Loader2, Shield, Calendar, Building2, Pencil, X, Check } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn, getInitials } from '@/lib/utils';
import { api } from '@/lib/api-client';

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
            const profileData = await api.getMe();
            setProfile(profileData);
            setFormData({
                name: profileData.name || '',
                phoneNumber: profileData.phoneNumber || '',
                registrationId: profileData.registrationId || '',
            });
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
            const updatedData = await api.updateMe(formData);
            setProfile({ ...profile, ...updatedData });
            setIsEditing(false);
            toast.success('Profile updated');
        } catch (error) {
            toast.error('Could not save changes');
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
            <div className="flex items-center justify-center min-h-[60vh]">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
        );
    }

    return (
        <div className="max-w-3xl mx-auto py-4 px-4 sm:px-0">
            {/* Header Section */}
            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 sm:gap-6 mb-8 sm:mb-10 text-center sm:text-left">
                <Avatar className="h-20 w-20 sm:h-28 sm:w-28 border border-border shadow-sm">
                    <AvatarImage src={session?.user?.image || ''} className="object-cover" />
                    <AvatarFallback className="text-xl sm:text-3xl font-medium bg-primary/[0.03] text-primary border border-primary/10">
                        {getInitials(profile?.name || 'U')}
                    </AvatarFallback>
                </Avatar>

                <div className="flex-1 min-w-0 space-y-3 sm:space-y-4 pt-1">
                    <h1 className="text-3xl font-medium tracking-tight font-display text-foreground/90">{profile?.name}</h1>
                    <div className="flex flex-col gap-1.5">
                        <p className="text-muted-foreground/70 font-medium">{profile?.email}</p>
                        <div className="flex flex-wrap items-center justify-center sm:justify-start gap-5 mt-1 text-[13px] text-muted-foreground/60">
                            <span className="flex items-center gap-2">
                                <Calendar className="h-4 w-4 opacity-70" />
                                <span className="font-medium">Joined {new Date(profile?.createdAt).toLocaleDateString(undefined, { month: 'short', year: 'numeric' })}</span>
                            </span>
                            <div className="hidden sm:block h-3.5 w-px bg-border/40" />
                            <span className="flex items-center gap-2">
                                <Building2 className="h-4 w-4 opacity-70" />
                                <span className="font-medium">{profile?.organizations?.length || 0} organization{(profile?.organizations?.length || 0) !== 1 ? 's' : ''}</span>
                            </span>
                        </div>
                    </div>
                </div>

                {!isEditing ? (
                    <Button
                        onClick={() => setIsEditing(true)}
                        variant="outline"
                        size="sm"
                        className="w-full sm:w-auto px-6 h-10 rounded-lg border-border/60 hover:bg-muted/50 transition-colors"
                    >
                        <Pencil className="h-3.5 w-3.5 mr-2" />
                        Edit Profile
                    </Button>
                ) : (
                    <div className="flex gap-3 w-full sm:w-auto justify-center">
                        <Button
                            onClick={handleCancel}
                            variant="ghost"
                            size="sm"
                            className="flex-1 sm:flex-none h-10 px-6 rounded-lg text-muted-foreground/70 hover:text-foreground transition-colors"
                        >
                            Cancel
                        </Button>
                        <Button
                            onClick={handleSave}
                            disabled={isSaving}
                            size="sm"
                            className="flex-1 sm:flex-none h-10 px-8 rounded-lg shadow-sm transition-all"
                        >
                            {isSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-2" /> : <Check className="h-3.5 w-3.5 mr-2" />}
                            Save Changes
                        </Button>
                    </div>
                )}
            </div>

            {/* Details Section */}
            <div className="space-y-8">
                <section>
                    <h2 className="text-[10px] font-semibold text-muted-foreground/50 uppercase tracking-[0.2em] mb-6">
                        Personal details
                    </h2>

                    {isEditing ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 bg-muted/[0.02] border border-border/30 rounded-2xl p-6">
                            <div className="space-y-3">
                                <Label htmlFor="edit-name" className="text-xs font-semibold uppercase tracking-widest text-muted-foreground/60 ml-1">Display name</Label>
                                <Input
                                    id="edit-name"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    className="h-12 border-border/40 bg-background/50 focus:ring-primary/20 rounded-xl"
                                />
                            </div>
                            <div className="space-y-3">
                                <Label htmlFor="edit-phone" className="text-xs font-semibold uppercase tracking-widest text-muted-foreground/60 ml-1">Phone number</Label>
                                <Input
                                    id="edit-phone"
                                    value={formData.phoneNumber}
                                    onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
                                    placeholder="Not provided"
                                    className="h-12 border-border/40 bg-background/50 focus:ring-primary/20 rounded-xl"
                                />
                            </div>
                            <div className="space-y-3 sm:col-span-2">
                                <Label htmlFor="edit-id" className="text-xs font-semibold uppercase tracking-widest text-muted-foreground/60 ml-1">Registration / ID number</Label>
                                <Input
                                    id="edit-id"
                                    value={formData.registrationId}
                                    onChange={(e) => setFormData({ ...formData, registrationId: e.target.value })}
                                    placeholder="Optional"
                                    className="h-12 border-border/40 bg-background/50 focus:ring-primary/20 rounded-xl"
                                />
                            </div>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <DetailField
                                label="Display name"
                                value={profile?.name}
                            />
                            <DetailField
                                label="Phone number"
                                value={profile?.phoneNumber}
                                placeholder="Not provided"
                            />
                            <DetailField
                                label="Registration ID"
                                value={profile?.registrationId}
                                placeholder="Not provided"
                                className="sm:col-span-2"
                            />
                        </div>
                    )}
                </section>

                {/* Organizations Section */}
                <section>
                    <h2 className="text-[10px] font-semibold text-muted-foreground/50 uppercase tracking-[0.2em] mb-6">
                        Organizations
                    </h2>

                    {profile?.organizations?.length > 0 ? (
                        <div className="grid grid-cols-1 gap-3">
                            {profile.organizations.map((org: any) => (
                                <div
                                    key={org.id}
                                    className="flex flex-col sm:flex-row sm:items-center justify-between p-5 rounded-2xl border border-border/40 bg-card/50 backdrop-blur-sm hover:bg-card/80 hover:border-border/80 transition-all group"
                                >
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 rounded-xl bg-primary/[0.03] border border-primary/10 flex items-center justify-center text-primary font-display font-medium text-xl shadow-sm">
                                            {org.name.charAt(0)}
                                        </div>
                                        <div className="space-y-0.5">
                                            <p className="font-display text-lg font-medium text-foreground/90 group-hover:text-primary transition-colors">{org.name}</p>
                                            <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-muted-foreground/40">
                                                {org.role === 'ADMIN' ? 'Administrator' : 'Community Member'}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3 w-full sm:w-auto">
                                        <Link href={`/org/${org.slug}/book`} className="flex-1 sm:flex-none">
                                            <Button variant="ghost" size="sm" className="w-full sm:w-auto h-9 px-4 rounded-lg text-muted-foreground/70 hover:text-foreground hover:bg-muted/50 transition-colors">
                                                <Calendar className="h-4 w-4 mr-2 opacity-70" />
                                                Book
                                            </Button>
                                        </Link>
                                        {org.role === 'ADMIN' && (
                                            <Link href={`/org/${org.slug}/admin`} className="flex-1 sm:flex-none">
                                                <Button variant="outline" size="sm" className="w-full sm:w-auto h-9 px-5 rounded-lg border-border/60 hover:bg-muted/50 transition-colors">
                                                    <Shield className="h-4 w-4 mr-2 opacity-70" />
                                                    Admin
                                                </Button>
                                            </Link>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-10 border border-dashed border-border rounded-lg">
                            <Building2 className="h-8 w-8 mx-auto text-muted-foreground/40 mb-2" />
                            <p className="text-sm text-muted-foreground">Not a member of any organizations</p>
                        </div>
                    )}
                </section>
            </div>
        </div>
    );
}

function DetailField({
    label,
    value,
    placeholder = '',
    className
}: {
    label: string;
    value?: string;
    placeholder?: string;
    className?: string;
}) {
    const displayValue = value || placeholder;
    const isEmpty = !value;

    return (
        <div className={cn("py-3 px-1 border-b border-border/30 last:border-0", className)}>
            <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-muted-foreground/50 mb-1">{label}</p>
            <p className={cn(
                "text-base font-medium text-foreground/80",
                isEmpty && "text-muted-foreground/30 font-normal italic"
            )}>
                {displayValue}
            </p>
        </div>
    );
}
