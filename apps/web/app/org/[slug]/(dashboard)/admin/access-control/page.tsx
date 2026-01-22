'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { Shield, Trash2, Plus, Lock, Globe, Mail, Users } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { api } from '@/lib/api-client';

export default function AccessControlPage() {
    const params = useParams();
    const { data: session } = useSession();
    const orgSlug = params.slug as string;

    const [allowedDomains, setAllowedDomains] = useState<string[]>([]);
    const [allowedEmails, setAllowedEmails] = useState<string[]>([]);
    const [loading, setLoading] = useState(true);
    const [newDomain, setNewDomain] = useState('');
    const [newEmail, setNewEmail] = useState('');
    const [isUpdatingSettings, setIsUpdatingSettings] = useState(false);

    useEffect(() => {
        async function fetchSettings() {
            if (!session?.user?.email) return;
            setLoading(true);
            try {
                const orgData = await api.getOrg(orgSlug);
                setAllowedDomains(orgData?.allowedDomains || []);
                setAllowedEmails(orgData?.allowedEmails || []);
            } catch (err) {
                console.error('Failed to fetch org settings:', err);
                toast.error('Failed to load validation settings');
            }
            setLoading(false);
        }
        fetchSettings();
    }, [orgSlug, session?.user?.email]);

    const handleUpdateSettings = async (updates: { allowedDomains?: string[]; allowedEmails?: string[] }) => {
        if (!session?.user?.email) return;
        setIsUpdatingSettings(true);
        try {
            await api.updateOrgSettings(orgSlug, updates);
            if (updates.allowedDomains) setAllowedDomains(updates.allowedDomains);
            if (updates.allowedEmails) setAllowedEmails(updates.allowedEmails);
            toast.success('Access settings updated');
        } catch (error: any) {
            toast.error(error.message || 'Failed to update settings');
        }
        setIsUpdatingSettings(false);
    };

    const addDomain = () => {
        if (!newDomain) return;

        // Sanitize: remove @, trim, lowercase
        const domain = newDomain.trim().toLowerCase().replace(/^@/, '');

        if (!domain) {
            toast.error('Invalid domain');
            return;
        }

        if (allowedDomains.includes(domain)) {
            toast.error('Domain already added');
            setNewDomain('');
            return;
        }

        const updated = [...allowedDomains, domain];
        handleUpdateSettings({ allowedDomains: updated });
        setNewDomain('');
    };

    const removeDomain = (domain: string) => {
        const updated = allowedDomains.filter(d => d !== domain);
        handleUpdateSettings({ allowedDomains: updated });
    };

    const addEmail = () => {
        if (!newEmail) return;

        // Basic email validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(newEmail)) {
            toast.error('Please enter a valid email address');
            return;
        }

        if (allowedEmails.includes(newEmail)) {
            toast.error('Email already added');
            setNewEmail('');
            return;
        }

        const updated = [...allowedEmails, newEmail];
        handleUpdateSettings({ allowedEmails: updated });
        setNewEmail('');
    };

    const removeEmail = (email: string) => {
        const updated = allowedEmails.filter(e => e !== email);
        handleUpdateSettings({ allowedEmails: updated });
    };

    if (loading) {
        return (
            <div className="space-y-6">
                <div>
                    <Skeleton className="h-8 w-48 mb-2" />
                    <Skeleton className="h-4 w-96" />
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <Skeleton className="h-64 rounded-xl" />
                    <Skeleton className="h-64 rounded-xl" />
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-8">
            <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                    <Shield className="h-5 w-5" />
                </div>
                <div>
                    <h1 className="font-display text-2xl font-medium tracking-tight">Access Control</h1>
                    <p className="text-muted-foreground">
                        Configure who can access and book resources in your organization.
                    </p>
                </div>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
                {/* Domain Whitelist */}
                <Card>
                    <CardHeader>
                        <div className="flex items-center gap-2 mb-1">
                            <Globe className="h-4 w-4 text-primary" />
                            <CardTitle>Allowed Domains</CardTitle>
                        </div>
                        <CardDescription>
                            Restrict access to users with specific email domains (e.g., example.com).
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex gap-2">
                            <Input
                                placeholder="example.com"
                                value={newDomain}
                                onChange={(e) => setNewDomain(e.target.value)}
                                className="flex-1"
                                onKeyDown={(e) => e.key === 'Enter' && addDomain()}
                            />
                            <Button onClick={addDomain} disabled={isUpdatingSettings || !newDomain}>
                                <Plus className="h-4 w-4 mr-2" />
                                Add
                            </Button>
                        </div>

                        <div className="bg-muted/30 rounded-lg p-4 min-h-[120px]">
                            <div className="flex flex-wrap gap-2">
                                {allowedDomains.length === 0 ? (
                                    <div className="w-full h-full flex flex-col items-center justify-center text-muted-foreground py-4">
                                        <Lock className="h-5 w-5 mb-2 opacity-20" />
                                        <span className="text-sm italic">No restrictions. Anyone can join.</span>
                                    </div>
                                ) : (
                                    allowedDomains.map((domain) => (
                                        <div key={domain} className="flex items-center gap-1.5 bg-background border px-3 py-1.5 rounded-full text-sm font-medium shadow-sm">
                                            <span>{domain}</span>
                                            <button
                                                onClick={() => removeDomain(domain)}
                                                className="text-muted-foreground hover:text-destructive transition-colors ml-1 focus:outline-none"
                                            >
                                                <Trash2 className="h-3 w-3" />
                                            </button>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Email Whitelist */}
                <Card>
                    <CardHeader>
                        <div className="flex items-center gap-2 mb-1">
                            <Mail className="h-4 w-4 text-primary" />
                            <CardTitle>Allowed Emails</CardTitle>
                        </div>
                        <CardDescription>
                            Grant access to specific individuals regardless of domain restrictions.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex gap-2">
                            <Input
                                placeholder="user@gmail.com"
                                value={newEmail}
                                onChange={(e) => setNewEmail(e.target.value)}
                                className="flex-1"
                                onKeyDown={(e) => e.key === 'Enter' && addEmail()}
                            />
                            <Button onClick={addEmail} disabled={isUpdatingSettings || !newEmail}>
                                <Plus className="h-4 w-4 mr-2" />
                                Add
                            </Button>
                        </div>

                        <div className="bg-muted/30 rounded-lg p-4 min-h-[120px]">
                            <div className="flex flex-wrap gap-2">
                                {allowedEmails.length === 0 ? (
                                    <div className="w-full h-full flex flex-col items-center justify-center text-muted-foreground py-4">
                                        <Users className="h-5 w-5 mb-2 opacity-20" />
                                        <span className="text-sm italic">No individual emails allowed.</span>
                                    </div>
                                ) : (
                                    allowedEmails.map((email) => (
                                        <div key={email} className="flex items-center gap-1.5 bg-background border px-3 py-1.5 rounded-full text-sm font-medium shadow-sm">
                                            <span>{email}</span>
                                            <button
                                                onClick={() => removeEmail(email)}
                                                className="text-muted-foreground hover:text-destructive transition-colors ml-1 focus:outline-none"
                                            >
                                                <Trash2 className="h-3 w-3" />
                                            </button>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
