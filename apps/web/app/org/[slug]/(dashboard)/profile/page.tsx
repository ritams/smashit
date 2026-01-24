"use client";

import { useState } from "react";
import { useUser } from "@/hooks/use-user";
import { ImageUpload } from "@/components/ui/image-upload";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { toast } from "sonner";
import { api } from "@/lib/api-client";
import { useQueryClient } from "@tanstack/react-query";
import { Loader2, Pencil, Check, X, Mail, Phone, Hash, UserCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { API_URL } from "@/lib/config";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getInitials } from "@/lib/utils";

export default function ProfilePage() {
    const { user, isLoading } = useUser();
    const [isEditing, setIsEditing] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const queryClient = useQueryClient();

    // Form state
    const [name, setName] = useState('');
    const [phoneNumber, setPhoneNumber] = useState('');
    const [registrationId, setRegistrationId] = useState('');

    // Sync local state when user loads or edit mode starts
    const startEditing = () => {
        if (user) {
            setName(user.name || '');
            setPhoneNumber(user.phoneNumber || '');
            setRegistrationId(user.registrationId || '');
            setIsEditing(true);
        }
    };

    const cancelEditing = () => {
        setIsEditing(false);
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!name.trim()) {
            toast.error("Name cannot be empty");
            return;
        }

        try {
            setIsSaving(true);
            await api.updateMe({
                name,
                phoneNumber: phoneNumber || null,
                registrationId: registrationId || null
            });

            toast.success("Profile updated successfully");
            queryClient.invalidateQueries({ queryKey: ['user'] });
            setIsEditing(false);
        } catch (error) {
            console.error("Update failed", error);
            toast.error("Failed to update profile");
        } finally {
            setIsSaving(false);
        }
    };

    const getFullImageUrl = (url?: string | null) => {
        if (!url) return '';
        if (url.startsWith('http')) return url;
        return `${API_URL}${url}`;
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-[50vh]">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-500">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-6">
                <div>
                    <h1 className="text-3xl font-display font-bold tracking-tight text-foreground/90">My Profile</h1>
                    <p className="text-muted-foreground mt-1">
                        Manage your personal information and account settings.
                    </p>
                </div>
                {!isEditing && (
                    <Button onClick={startEditing} variant="outline" className="gap-2 shadow-sm hover:bg-muted/50 transition-all">
                        <Pencil className="h-4 w-4" />
                        Edit Profile
                    </Button>
                )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
                {/* Left Column: Avatar & Basic Info */}
                <div className="md:col-span-4 space-y-6">
                    <Card className="border-none shadow-md overflow-hidden bg-gradient-to-b from-card to-muted/20">
                        <CardHeader className="text-center pb-2">
                            <div className="relative mx-auto mb-4">
                                {isEditing ? (
                                    <ImageUpload
                                        currentImageUrl={user?.image || user?.avatarUrl || undefined}
                                        name={user?.name || 'User'}
                                        uploadMode="profile"
                                    />
                                ) : (
                                    <Avatar className="h-32 w-32 border-4 border-background shadow-xl mx-auto">
                                        <AvatarImage
                                            src={getFullImageUrl(user?.image || user?.avatarUrl)}
                                            alt={user?.name || ''}
                                            className="object-cover"
                                        />
                                        <AvatarFallback className="text-3xl bg-primary/10 text-primary">
                                            {getInitials(user?.name || 'User')}
                                        </AvatarFallback>
                                    </Avatar>
                                )}
                            </div>
                            <CardTitle className="text-xl font-bold">{user?.name}</CardTitle>
                            <CardDescription className="flex items-center justify-center gap-1.5 mt-1">
                                <Mail className="h-3.5 w-3.5" />
                                {user?.email}
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="text-center pb-6">
                            <div className="grid grid-cols-2 gap-4 mt-4 pt-4 border-t border-border/50">
                                <div>
                                    <p className="text-xs text-muted-foreground uppercase font-medium tracking-wide">Orgs</p>
                                    <p className="font-semibold text-lg">{user?.organizations?.length || 0}</p>
                                </div>
                                <div>
                                    <p className="text-xs text-muted-foreground uppercase font-medium tracking-wide">Joined</p>
                                    <p className="font-semibold text-lg">
                                        {user?.createdAt ? new Date(user.createdAt).getFullYear() : '-'}
                                    </p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Right Column: Details Form */}
                <div className="md:col-span-8">
                    <Card className="h-full border shadow-sm">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <UserCircle className="h-5 w-5 text-primary" />
                                Personal Details
                            </CardTitle>
                            <CardDescription>
                                Information visible to other members of your organizations.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            {isEditing ? (
                                <form onSubmit={handleSave} className="space-y-6">
                                    <div className="grid gap-4 md:grid-cols-2">
                                        <div className="space-y-2">
                                            <Label htmlFor="name">Full Name</Label>
                                            <Input
                                                id="name"
                                                value={name}
                                                onChange={(e) => setName(e.target.value)}
                                                placeholder="John Doe"
                                                className="bg-background"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="phone">Phone Number</Label>
                                            <Input
                                                id="phone"
                                                value={phoneNumber}
                                                onChange={(e) => setPhoneNumber(e.target.value)}
                                                placeholder="+1 (555) 000-0000"
                                                className="bg-background"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="regId">Registration ID</Label>
                                            <Input
                                                id="regId"
                                                value={registrationId}
                                                onChange={(e) => setRegistrationId(e.target.value)}
                                                placeholder="Student/Employee ID"
                                                className="bg-background"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="email" className="text-muted-foreground">Email Address</Label>
                                            <Input
                                                id="email"
                                                value={user?.email || ''}
                                                disabled
                                                className="bg-muted text-muted-foreground"
                                            />
                                        </div>
                                    </div>

                                    <div className="flex items-center justify-end gap-3 pt-4 border-t">
                                        <Button type="button" variant="ghost" onClick={cancelEditing} disabled={isSaving}>
                                            Cancel
                                        </Button>
                                        <Button type="submit" disabled={isSaving} className="min-w-[100px]">
                                            {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Check className="mr-2 h-4 w-4" />}
                                            Save
                                        </Button>
                                    </div>
                                </form>
                            ) : (
                                <div className="space-y-6">
                                    <div className="grid gap-6 md:grid-cols-2">
                                        <div className="space-y-1">
                                            <p className="text-sm font-medium text-muted-foreground">Display Name</p>
                                            <p className="text-base font-medium">{user?.name}</p>
                                        </div>
                                        <div className="space-y-1">
                                            <p className="text-sm font-medium text-muted-foreground">Email Address</p>
                                            <p className="text-base font-medium">{user?.email}</p>
                                        </div>
                                        <div className="space-y-1">
                                            <p className="text-sm font-medium text-muted-foreground">Phone Number</p>
                                            <div className="flex items-center gap-2">
                                                <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                                                <p className="text-base">{user?.phoneNumber || <span className="text-muted-foreground italic">Not set</span>}</p>
                                            </div>
                                        </div>
                                        <div className="space-y-1">
                                            <p className="text-sm font-medium text-muted-foreground">Registration ID</p>
                                            <div className="flex items-center gap-2">
                                                <Hash className="h-3.5 w-3.5 text-muted-foreground" />
                                                <p className="text-base">{user?.registrationId || <span className="text-muted-foreground italic">Not set</span>}</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
