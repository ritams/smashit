'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { Users, Search, MoreHorizontal, User as UserIcon } from 'lucide-react';
import { toast } from 'sonner';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { getInitials, cn } from '@/lib/utils';
import { api } from '@/lib/api-client';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';

interface Member {
    id: string;
    name: string | null;
    email: string | null;
    image: string | null;
    role: string;
}

export default function MembersPage() {
    const params = useParams();
    const router = useRouter();
    const { data: session } = useSession();
    const orgSlug = params.slug as string;

    const [members, setMembers] = useState<Member[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        async function fetchMembers() {
            if (!session?.user?.email) return;
            setLoading(true);
            try {
                const data = await api.getMembers(orgSlug);
                setMembers(data || []);
            } catch (err) {
                console.error('Failed to fetch members:', err);
                toast.error('Failed to load members');
            }
            setLoading(false);
        }
        fetchMembers();
    }, [orgSlug, session?.user?.email]);

    const filteredMembers = members.filter(member => {
        const searchLower = searchQuery.toLowerCase();
        return (
            member.name?.toLowerCase().includes(searchLower) ||
            member.email?.toLowerCase().includes(searchLower)
        );
    });

    if (loading) {
        return (
            <div className="space-y-6">
                <div>
                    <Skeleton className="h-8 w-48 mb-2" />
                    <Skeleton className="h-4 w-96" />
                </div>
                <Skeleton className="h-10 w-full max-w-sm mb-6" />
                <div className="space-y-2">
                    {[1, 2, 3, 4, 5].map((i) => (
                        <Skeleton key={i} className="h-16 w-full rounded-lg" />
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-16">
            <header className="flex flex-col sm:flex-row sm:items-end justify-between gap-8">
                <div className="space-y-4">
                    <div className="flex items-center gap-3 text-muted-foreground/40 uppercase tracking-[.2em] text-[11px] font-bold">
                        <Users className="h-4 w-4" />
                        Community
                    </div>
                    <h1 className="font-display text-4xl font-medium tracking-tight text-foreground leading-tight">
                        Member <span className="text-muted-foreground/30 font-light italic">Directory</span>
                    </h1>
                    <p className="text-lg text-muted-foreground/60 max-w-2xl font-light">
                        Review and manage your organization's members, roles, and administrative access levels.
                    </p>
                </div>
                <div className="relative w-full sm:w-80 group">
                    <div className="absolute inset-0 bg-primary/5 rounded-2xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/40 group-focus-within:text-primary transition-colors" />
                    <Input
                        placeholder="Search by name or email..."
                        className="pl-11 h-12 bg-background/50 border-border/40 rounded-2xl focus:ring-primary/10 transition-all relative"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
            </header>

            <div className="border-t border-border/40 pt-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
                <Table>
                    <TableHeader>
                        <TableRow className="hover:bg-transparent border-none">
                            <TableHead className="text-[10px] font-bold text-muted-foreground/30 uppercase tracking-[.25em] h-12">Member</TableHead>
                            <TableHead className="text-[10px] font-bold text-muted-foreground/30 uppercase tracking-[.25em] h-12">Email</TableHead>
                            <TableHead className="text-[10px] font-bold text-muted-foreground/30 uppercase tracking-[.25em] h-12 text-center">Privileges</TableHead>
                            <TableHead className="text-[10px] font-bold text-muted-foreground/30 uppercase tracking-[.25em] h-12 text-right">Details</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {filteredMembers.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={4} className="h-64 text-center">
                                    <div className="flex flex-col items-center justify-center opacity-40">
                                        <Users className="h-8 w-8 mb-4 stroke-[1.5]" />
                                        <p className="text-sm font-light italic">No match found in the directory</p>
                                    </div>
                                </TableCell>
                            </TableRow>
                        ) : (
                            filteredMembers.map((member) => (
                                <TableRow
                                    key={member.id}
                                    className="group cursor-pointer hover:bg-primary/[0.01] border-border/10 transition-colors duration-300"
                                    onClick={() => router.push(`/org/${orgSlug}/admin/members/${member.id}`)}
                                >
                                    <TableCell className="py-5">
                                        <div className="flex items-center gap-4">
                                            <div className="relative">
                                                <Avatar className="h-11 w-11 rounded-xl ring-2 ring-background border border-border/10">
                                                    <AvatarImage src={member.image || ''} className="object-cover" />
                                                    <AvatarFallback className="bg-primary/[0.03] text-primary/60 text-xs font-bold leading-none">
                                                        {getInitials(member.name || 'U')}
                                                    </AvatarFallback>
                                                </Avatar>
                                                {member.role === 'ADMIN' && (
                                                    <div className="absolute -top-1 -right-1 h-3 w-3 bg-primary rounded-full border-2 border-background" />
                                                )}
                                            </div>
                                            <div className="font-medium text-foreground/80 tracking-tight group-hover:text-primary transition-colors duration-300">
                                                {member.name || 'Unnamed Member'}
                                            </div>
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-sm text-muted-foreground/60 font-medium tabular-nums font-mono lowercase tracking-tight">
                                        {member.email}
                                    </TableCell>
                                    <TableCell className="text-center">
                                        <span className={cn(
                                            "inline-flex items-center px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest",
                                            member.role === 'ADMIN'
                                                ? "bg-primary/10 text-primary"
                                                : "bg-muted/30 text-muted-foreground/60"
                                        )}>
                                            {member.role}
                                        </span>
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl text-muted-foreground/30 group-hover:text-primary group-hover:bg-primary/5 transition-all duration-300">
                                            <UserIcon className="h-4 w-4" />
                                        </span>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>

            <footer className="flex items-center justify-center pt-8 border-t border-border/40">
                <p className="text-[10px] font-bold text-muted-foreground/20 uppercase tracking-[.3em]">
                    Showing {filteredMembers.length} <span className="mx-2">•</span> {members.length} Total Members
                </p>
            </footer>
        </div>
    );
}
