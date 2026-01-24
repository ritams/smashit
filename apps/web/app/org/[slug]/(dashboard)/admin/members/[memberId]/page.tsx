'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { ArrowLeft, Mail, Shield, User, Calendar } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { getInitials } from '@/lib/utils';
import { api } from '@/lib/api-client';
import { API_URL } from '@/lib/config';

interface Member {
    id: string;
    name: string | null;
    email: string | null;
    avatarUrl: string | null;
    role: string;
    createdAt?: string; // Optional if not guaranteed by API
}

export default function MemberProfilePage() {
    const params = useParams();
    const router = useRouter();
    const { data: session } = useSession();
    const orgSlug = params.slug as string;
    const memberId = params.memberId as string;

    const [member, setMember] = useState<Member | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetchMember() {
            if (!session?.user?.email) return;
            setLoading(true);
            try {
                // Since there is no specific getMember endpoint, we fetch all and find
                const members = await api.getMembers(orgSlug);
                const found = members?.find((m: Member) => m.id === memberId);
                setMember(found || null);
            } catch (err) {
                console.error('Failed to fetch member:', err);
                toast.error('Failed to load member profile');
            }
            setLoading(false);
        }
        fetchMember();
    }, [orgSlug, memberId, session?.user?.email]);

    if (loading) {
        return (
            <div className="space-y-6">
                <Skeleton className="h-8 w-32" />
                <div className="flex items-center gap-6">
                    <Skeleton className="h-24 w-24 rounded-full" />
                    <div className="space-y-2">
                        <Skeleton className="h-8 w-64" />
                        <Skeleton className="h-4 w-48" />
                    </div>
                </div>
                <Skeleton className="h-64 w-full rounded-xl" />
            </div>
        );
    }

    if (!member) {
        return (
            <div className="flex flex-col items-center justify-center py-20">
                <User className="h-12 w-12 text-muted-foreground mb-4 opacity-20" />
                <h2 className="text-xl font-medium">Member not found</h2>
                <Button variant="link" onClick={() => router.back()} className="mt-2">
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Go back
                </Button>
            </div>
        );
    }

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <div>
                <Button
                    variant="ghost"
                    size="sm"
                    className="mb-4 pl-0 hover:bg-transparent hover:text-primary transition-colors"
                    onClick={() => router.back()}
                >
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Back to Members
                </Button>

                <div className="flex flex-col md:flex-row gap-8 items-start">
                    {/* Profile Header */}
                    <Card className="w-full md:w-auto md:min-w-[300px]">
                        <CardContent className="pt-6 flex flex-col items-center text-center space-y-4">
                            <Avatar className="h-32 w-32 shadow-xl ring-4 ring-background">
                                <AvatarImage src={member.avatarUrl && !member.avatarUrl.startsWith('http') ? `${API_URL}${member.avatarUrl}` : (member.avatarUrl || '')} />
                                <AvatarFallback className="text-4xl bg-muted">
                                    {getInitials(member.name || 'U')}
                                </AvatarFallback>
                            </Avatar>
                            <div>
                                <h1 className="text-2xl font-bold tracking-tight">{member.name || 'Unnamed Member'}</h1>
                                <Badge variant="outline" className="mt-2 text-muted-foreground font-normal">
                                    {member.role}
                                </Badge>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Profile Details */}
                    <Card className="flex-1 w-full">
                        <CardHeader>
                            <CardTitle>Profile Details</CardTitle>
                            <CardDescription>
                                Personal information and account status.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="grid gap-6">
                                <div className="flex items-center gap-4 p-4 rounded-lg bg-muted/20 border border-border/50">
                                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                                        <Mail className="h-5 w-5" />
                                    </div>
                                    <div>
                                        <p className="text-sm font-medium text-muted-foreground">Email Address</p>
                                        <p className="font-medium">{member.email}</p>
                                    </div>
                                </div>

                                <div className="flex items-center gap-4 p-4 rounded-lg bg-muted/20 border border-border/50">
                                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                                        <Shield className="h-5 w-5" />
                                    </div>
                                    <div>
                                        <p className="text-sm font-medium text-muted-foreground">Role</p>
                                        <div className="flex items-center gap-2">
                                            <p className="font-medium capitalize">{member.role.toLowerCase()}</p>
                                            {member.role === 'ADMIN' && (
                                                <Badge className="ml-2 h-5 text-[10px] px-1.5">Full Access</Badge>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-center gap-4 p-4 rounded-lg bg-muted/20 border border-border/50">
                                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                                        <Calendar className="h-5 w-5" />
                                    </div>
                                    <div>
                                        <p className="text-sm font-medium text-muted-foreground">Member Since</p>
                                        <p className="font-medium">
                                            {member.createdAt
                                                ? new Date(member.createdAt).toLocaleDateString('en-US', {
                                                    year: 'numeric',
                                                    month: 'long',
                                                    day: 'numeric'
                                                })
                                                : 'N/A'
                                            }
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <Separator />

                            <div className="bg-blue-50/50 dark:bg-blue-900/10 p-4 rounded-lg border border-blue-100 dark:border-blue-900/50">
                                <p className="text-sm text-muted-foreground text-center">
                                    This is a read-only view. To manage permissions or remove this member, please contact the system administrator.
                                </p>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
