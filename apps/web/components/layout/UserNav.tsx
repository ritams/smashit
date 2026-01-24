"use client"

import { LogOut, Shield, User, LayoutGrid, Settings } from "lucide-react"
import { useSession, signOut } from "next-auth/react"
import Link from "next/link"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuGroup,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { getInitials } from "@/lib/utils"
import { useUser } from "@/hooks/use-user"
import { clearTokenCache } from "@/lib/api-client"

interface UserNavProps {
    orgSlug?: string
    isAdmin?: boolean
    showDashboardLink?: boolean
}

export function UserNav({
    orgSlug,
    isAdmin = false,
    showDashboardLink = false,
}: UserNavProps) {
    const { user } = useUser();

    if (!user) {
        return null;
    }

    const handleLogout = async () => {
        clearTokenCache()
        // If inside an org, redirect to org login, otherwise home
        const callbackUrl = orgSlug ? `/org/${orgSlug}/login` : '/'
        await signOut({ callbackUrl })
    }

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-10 w-10 rounded-full md:h-auto md:w-auto md:px-2 md:py-1.5 md:rounded-xl data-[state=open]:bg-muted hover:bg-muted/60 transition-all duration-200">
                    <Avatar className="h-8 w-8 transition-transform group-active:scale-95">
                        <AvatarImage src={user.image || ''} alt={user.name || ''} />
                        <AvatarFallback className="bg-primary/10 text-primary font-medium">
                            {getInitials(user.name || 'U')}
                        </AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col items-start gap-0.5 ml-3 hidden md:flex text-left">
                        <span className="text-sm font-medium leading-none text-foreground/90">{user.name}</span>
                    </div>
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-60 p-2" align="end" forceMount>
                <div className="md:hidden p-2 pb-3 mb-1 border-b border-border/50">
                    <div className="flex flex-col space-y-1">
                        <p className="text-sm font-medium leading-none">{user.name}</p>
                    </div>
                </div>

                <DropdownMenuGroup>
                    {orgSlug ? (
                        <>
                            <DropdownMenuItem asChild className="cursor-pointer py-2.5">
                                <Link href={`/org/${orgSlug}/profile`} className="flex items-center gap-2.5">
                                    <User className="h-4 w-4 text-muted-foreground" />
                                    <span>Profile</span>
                                </Link>
                            </DropdownMenuItem>

                            {isAdmin && (
                                <DropdownMenuItem asChild className="cursor-pointer py-2.5">
                                    <Link href={`/org/${orgSlug}/admin`} className="flex items-center gap-2.5">
                                        <Shield className="h-4 w-4 text-muted-foreground" />
                                        <span>Admin Console</span>
                                    </Link>
                                </DropdownMenuItem>
                            )}
                        </>
                    ) : (
                        // Non-org context (e.g. landing page)
                        // Maybe link to a generic profile page if it exists locally, or just show basic info
                        <DropdownMenuLabel className="font-normal text-muted-foreground text-xs px-2 py-1">
                            Account
                        </DropdownMenuLabel>
                    )}

                    {showDashboardLink && (
                        <DropdownMenuItem asChild className="cursor-pointer py-2.5">
                            <Link href="/dashboard" className="flex items-center gap-2.5">
                                <LayoutGrid className="h-4 w-4 text-muted-foreground" />
                                <span className="">Go to Dashboard</span>
                            </Link>
                        </DropdownMenuItem>
                    )}
                </DropdownMenuGroup>

                <DropdownMenuSeparator className="my-1.5 opacity-50" />

                <DropdownMenuItem
                    onClick={handleLogout}
                    className="text-destructive focus:text-destructive focus:bg-destructive/5 cursor-pointer py-2.5 flex items-center gap-2.5"
                >
                    <LogOut className="h-4 w-4" />
                    <span>Sign out</span>
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    )
}
