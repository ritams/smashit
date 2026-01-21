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
                <Avatar className="h-20 w-20 sm:h-24 sm:w-24 border border-border">
                    <AvatarImage src={session?.user?.image || ''} className="object-cover" />
                    <AvatarFallback className="text-xl sm:text-2xl font-medium bg-primary/10 text-primary">
                        {getInitials(profile?.name || 'U')}
                    </AvatarFallback>
                </Avatar>

                <div className="flex-1 min-w-0 space-y-2 sm:space-y-1">
                    <h1 className="text-2xl font-medium tracking-tight">{profile?.name}</h1>
                    <p className="text-muted-foreground">{profile?.email}</p>
                    <div className="flex flex-wrap items-center justify-center sm:justify-start gap-4 mt-2 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                            <Calendar className="h-3.5 w-3.5" />
                            Joined {new Date(profile?.createdAt).toLocaleDateString(undefined, { month: 'short', year: 'numeric' })}
                        </span>
                        <span className="flex items-center gap-1">
                            <Building2 className="h-3.5 w-3.5" />
                            {profile?.organizations?.length || 0} org{(profile?.organizations?.length || 0) !== 1 ? 's' : ''}
                        </span>
                    </div>
                </div>

                {!isEditing ? (
                    <Button
                        onClick={() => setIsEditing(true)}
                        variant="outline"
                        size="sm"
                        className="w-full sm:w-auto"
                    >
                        <Pencil className="h-3.5 w-3.5 mr-1.5" />
                        Edit
                    </Button>
                ) : (
                    <div className="flex gap-2 w-full sm:w-auto justify-center">
                        <Button
                            onClick={handleCancel}
                            variant="ghost"
                            size="sm"
                            className="flex-1 sm:flex-none"
                        >
                            Cancel
                        </Button>
                        <Button
                            onClick={handleSave}
                            disabled={isSaving}
                            size="sm"
                            className="flex-1 sm:flex-none"
                        >
                            {isSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> : <Check className="h-3.5 w-3.5 mr-1.5" />}
                            Save
                        </Button>
                    </div>
                )}
            </div>

            {/* Details Section */}
            <div className="space-y-8">
                <section>
                    <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-4">
                        Personal details
                    </h2>

                    {isEditing ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="edit-name">Display name</Label>
                                <Input
                                    id="edit-name"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    className="h-11"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="edit-phone">Phone number</Label>
                                <Input
                                    id="edit-phone"
                                    value={formData.phoneNumber}
                                    onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
                                    placeholder="Optional"
                                    className="h-11"
                                />
                            </div>
                            <div className="space-y-2 sm:col-span-2">
                                <Label htmlFor="edit-id">Registration / ID number</Label>
                                <Input
                                    id="edit-id"
                                    value={formData.registrationId}
                                    onChange={(e) => setFormData({ ...formData, registrationId: e.target.value })}
                                    placeholder="Optional"
                                    className="h-11"
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
                    <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-4">
                        Organizations
                    </h2>

                    {profile?.organizations?.length > 0 ? (
                        <div className="space-y-2">
                            {profile.organizations.map((org: any) => (
                                <div
                                    key={org.id}
                                    className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-lg border border-border hover:bg-muted/50 transition-colors gap-4"
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary font-medium text-lg">
                                            {org.name.charAt(0)}
                                        </div>
                                        <div>
                                            <p className="font-medium text-base">{org.name}</p>
                                            <p className="text-xs text-muted-foreground">
                                                {org.role === 'ADMIN' ? 'Admin' : 'Member'}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2 w-full sm:w-auto">
                                        <Link href={`/org/${org.slug}/book`} className="flex-1 sm:flex-none">
                                            <Button variant="ghost" size="sm" className="w-full sm:w-auto border sm:border-0 border-border/50">
                                                <Calendar className="h-3.5 w-3.5 mr-1.5" />
                                                Book
                                            </Button>
                                        </Link>
                                        {org.role === 'ADMIN' && (
                                            <Link href={`/org/${org.slug}/admin`} className="flex-1 sm:flex-none">
                                                <Button variant="outline" size="sm" className="w-full sm:w-auto">
                                                    <Shield className="h-3.5 w-3.5 mr-1.5" />
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
        <div className={cn("space-y-1", className)}>
            <p className="text-xs text-muted-foreground">{label}</p>
            <p className={cn(
                "text-sm font-medium",
                isEmpty && "text-muted-foreground/50"
            )}>
                {displayValue}
            </p>
        </div>
    );
}
