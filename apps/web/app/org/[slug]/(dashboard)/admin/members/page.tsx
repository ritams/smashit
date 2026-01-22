'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { Users, Search, MoreHorizontal, User as UserIcon } from 'lucide-react';
import { toast } from 'sonner';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { getInitials } from '@/lib/utils';
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
        <div className="space-y-8">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="font-display text-2xl font-medium tracking-tight">Members</h1>
                    <p className="text-muted-foreground mt-1">
                        View and manage members of your organization.
                    </p>
                </div>
                <div className="relative w-full sm:w-72">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Search members..."
                        className="pl-9"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
            </div>

            <div className="rounded-lg border bg-card text-card-foreground shadow-sm overflow-hidden">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Member</TableHead>
                            <TableHead>Email</TableHead>
                            <TableHead>Role</TableHead>
                            <TableHead className="w-[50px]"></TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {filteredMembers.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={4} className="h-32 text-center text-muted-foreground">
                                    No members found.
                                </TableCell>
                            </TableRow>
                        ) : (
                            filteredMembers.map((member) => (
                                <TableRow
                                    key={member.id}
                                    className="cursor-pointer hover:bg-muted/50"
                                    onClick={() => router.push(`/org/${orgSlug}/admin/members/${member.id}`)}
                                >
                                    <TableCell>
                                        <div className="flex items-center gap-3">
                                            <Avatar className="h-9 w-9">
                                                <AvatarImage src={member.image || ''} />
                                                <AvatarFallback>
                                                    {getInitials(member.name || 'U')}
                                                </AvatarFallback>
                                            </Avatar>
                                            <div className="font-medium">{member.name || 'Unnamed'}</div>
                                        </div>
                                    </TableCell>
                                    <TableCell>{member.email}</TableCell>
                                    <TableCell>
                                        <Badge variant={member.role === 'ADMIN' ? 'default' : 'secondary'} className="text-xs">
                                            {member.role}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>
                                        <span className="text-muted-foreground">
                                            <UserIcon className="h-4 w-4 opacity-50" />
                                        </span>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>
            <div className="text-xs text-muted-foreground text-center">
                Showing {filteredMembers.length} of {members.length} members
            </div>
        </div>
    );
}
