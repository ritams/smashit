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
        <div className="space-y-16">
            <header className="flex flex-col sm:flex-row sm:items-end justify-between gap-8">
                <div className="space-y-4">
                    <div className="flex items-center gap-3 text-muted-foreground/40 uppercase tracking-[.2em] text-[11px] font-bold">
                        <Shield className="h-4 w-4" />
                        Security & Privileges
                    </div>
                    <h1 className="font-display text-4xl font-medium tracking-tight text-foreground leading-tight">
                        Access <span className="text-muted-foreground/30 font-light italic">Control</span>
                    </h1>
                    <p className="text-lg text-muted-foreground/60 max-w-2xl font-light">
                        Configure organization-wide access policies, whitelisted domains, and individual user permissions.
                    </p>
                </div>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 border-t border-border/40 pt-12 animate-in fade-in slide-in-from-bottom-4 duration-700">
                {/* Domain Whitelist */}
                <section className="space-y-8">
                    <div className="space-y-2">
                        <div className="flex items-center gap-2 text-foreground/80">
                            <Globe className="h-4 w-4 text-primary opacity-60" />
                            <h3 className="text-lg font-display font-medium">Trusted Domains</h3>
                        </div>
                        <p className="text-sm text-muted-foreground/60 font-light leading-relaxed max-w-sm">
                            Automatically grant access to any user signing up with a matching email domain.
                        </p>
                    </div>

                    <div className="bg-muted/[0.03] border border-border/40 rounded-full p-2 pr-2.5 flex items-center gap-3 shadow-sm focus-within:ring-2 focus-within:ring-primary/10 transition-all">
                        <Input
                            placeholder="e.g. google.com"
                            value={newDomain}
                            onChange={(e) => setNewDomain(e.target.value)}
                            className="flex-1 border-none bg-transparent h-12 px-6 shadow-none focus-visible:ring-0 text-base"
                            onKeyDown={(e) => e.key === 'Enter' && addDomain()}
                        />
                        <Button
                            onClick={addDomain}
                            disabled={isUpdatingSettings || !newDomain}
                            size="sm"
                            className="rounded-full h-10 px-8 font-semibold shadow-md shadow-primary/10"
                        >
                            Add
                        </Button>
                    </div>

                    <div className="space-y-3 pl-1">
                        {allowedDomains.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground/30 border border-dashed border-border/40 rounded-[1.5rem] bg-muted/[0.02]">
                                <Lock className="h-6 w-6 mb-3 opacity-20" />
                                <span className="text-xs font-bold uppercase tracking-widest">No Domain Restrictions</span>
                            </div>
                        ) : (
                            <div className="flex flex-wrap gap-2">
                                {allowedDomains.map((domain) => (
                                    <div key={domain} className="group flex items-center gap-2 pl-4 pr-2 py-2 rounded-full bg-background border border-border/40 hover:border-primary/20 hover:shadow-sm transition-all duration-300">
                                        <span className="text-sm font-medium text-foreground/80">{domain}</span>
                                        <button
                                            onClick={() => removeDomain(domain)}
                                            className="h-6 w-6 rounded-full flex items-center justify-center text-muted-foreground/40 hover:text-destructive hover:bg-destructive/10 transition-all opacity-0 group-hover:opacity-100"
                                        >
                                            <Trash2 className="h-3 w-3" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </section>

                {/* Email Whitelist */}
                <section className="space-y-8 lg:border-l lg:border-border/40 lg:pl-16">
                    <div className="space-y-2">
                        <div className="flex items-center gap-2 text-foreground/80">
                            <Mail className="h-4 w-4 text-primary opacity-60" />
                            <h3 className="text-lg font-display font-medium">Individual Access</h3>
                        </div>
                        <p className="text-sm text-muted-foreground/60 font-light leading-relaxed max-w-sm">
                            Grant exclusive access to specific individuals outside of your trusted domains.
                        </p>
                    </div>

                    <div className="bg-muted/[0.03] border border-border/40 rounded-full p-2 pr-2.5 flex items-center gap-3 shadow-sm focus-within:ring-2 focus-within:ring-primary/10 transition-all">
                        <Input
                            placeholder="user@partner.com"
                            value={newEmail}
                            onChange={(e) => setNewEmail(e.target.value)}
                            className="flex-1 border-none bg-transparent h-12 px-6 shadow-none focus-visible:ring-0 text-base"
                            onKeyDown={(e) => e.key === 'Enter' && addEmail()}
                        />
                        <Button
                            onClick={addEmail}
                            disabled={isUpdatingSettings || !newEmail}
                            size="sm"
                            className="rounded-full h-10 px-8 font-semibold shadow-md shadow-primary/10"
                        >
                            Add
                        </Button>
                    </div>

                    <div className="space-y-3 pl-1">
                        {allowedEmails.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground/30 border border-dashed border-border/40 rounded-[1.5rem] bg-muted/[0.02]">
                                <Users className="h-6 w-6 mb-3 opacity-20" />
                                <span className="text-xs font-bold uppercase tracking-widest">No Individual Guests</span>
                            </div>
                        ) : (
                            <div className="flex flex-wrap gap-2">
                                {allowedEmails.map((email) => (
                                    <div key={email} className="group flex items-center gap-2 pl-4 pr-2 py-2 rounded-full bg-background border border-border/40 hover:border-primary/20 hover:shadow-sm transition-all duration-300">
                                        <span className="text-sm font-medium text-foreground/80">{email}</span>
                                        <button
                                            onClick={() => removeEmail(email)}
                                            className="h-6 w-6 rounded-full flex items-center justify-center text-muted-foreground/40 hover:text-destructive hover:bg-destructive/10 transition-all opacity-0 group-hover:opacity-100"
                                        >
                                            <Trash2 className="h-3 w-3" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </section>
            </div>
        </div>
    );
}
