'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useSession, signIn, signOut } from 'next-auth/react';
import { ArrowRight, LogOut, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { getInitials } from '@/lib/utils';

export default function LandingPage() {
    const { data: session } = useSession();
    const [scrolled, setScrolled] = useState(false);

    useEffect(() => {
        const handleScroll = () => {
            setScrolled(window.scrollY > 20);
        };
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    return (
        <div className="min-h-screen bg-background">
            {/* Header */}
            <header
                className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${scrolled
                    ? 'py-4 bg-background/95 backdrop-blur-sm border-b border-border'
                    : 'py-6 bg-transparent'
                    }`}
            >
                <div className="container max-w-6xl">
                    <nav className="flex items-center justify-between">
                        <Link href="/" className="group">
                            <span className="font-display text-2xl font-medium tracking-tight text-foreground">
                                Avith
                            </span>
                        </Link>
                        <div className="flex items-center gap-6">
                            <Link
                                href="/contact"
                                className="text-sm text-muted-foreground hover:text-foreground transition-colors hidden sm:block"
                            >
                                Contact
                            </Link>
                            {session ? (
                                <>
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <button className="flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-muted transition-colors cursor-pointer outline-none">
                                                <Avatar className="h-7 w-7">
                                                    <AvatarImage src={session.user?.image || ''} />
                                                    <AvatarFallback className="text-xs font-medium bg-primary text-primary-foreground">
                                                        {getInitials(session.user?.name || 'U')}
                                                    </AvatarFallback>
                                                </Avatar>
                                                <span className="text-sm font-medium hidden md:block">
                                                    {session.user?.name}
                                                </span>
                                            </button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end" className="w-48">
                                            <DropdownMenuLabel className="font-normal">
                                                <div className="flex flex-col space-y-1">
                                                    <p className="text-sm font-medium">{session.user?.name}</p>
                                                    <p className="text-xs text-muted-foreground">{session.user?.email}</p>
                                                </div>
                                            </DropdownMenuLabel>
                                            <DropdownMenuSeparator />
                                            <DropdownMenuItem
                                                className="text-destructive focus:text-destructive cursor-pointer"
                                                onClick={() => signOut({ callbackUrl: '/' })}
                                            >
                                                <LogOut className="mr-2 h-4 w-4" />
                                                Sign out
                                            </DropdownMenuItem>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                    <Link href="/dashboard">
                                        <Button size="sm">Dashboard</Button>
                                    </Link>
                                </>
                            ) : (
                                <>
                                    <button
                                        onClick={() => signIn('google', { callbackUrl: '/dashboard' })}
                                        className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                                    >
                                        Sign in
                                    </button>
                                    <Link href="/contact">
                                        <Button size="sm" className="hover:scale-[1.02] transition-transform">Partner With Us</Button>
                                    </Link>
                                </>
                            )}
                        </div>
                    </nav>
                </div>
            </header>

            {/* Hero Section - Full Height */}
            <section className="min-h-screen flex flex-col justify-center relative">
                {/* Subtle watermark */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none overflow-hidden">
                    <span className="font-display text-[22vw] font-light text-muted/5 tracking-tighter">
                        Avith
                    </span>
                </div>

                <div className="container max-w-6xl relative z-10 pt-32 pb-24">
                    <div className="max-w-4xl space-y-10">
                        <h1 className="font-display text-6xl md:text-7xl lg:text-8xl font-medium tracking-tight leading-[0.95] text-balance">
                            Bespoke reservation infrastructure
                        </h1>

                        <p className="text-xl md:text-2xl text-muted-foreground leading-relaxed max-w-2xl font-light">
                            Elevated scheduling systems for private clubs and exclusive communities who demand excellence.
                        </p>

                        <div className="flex flex-col sm:flex-row items-start gap-4 pt-4">
                            {session ? (
                                <Link href="/dashboard">
                                    <Button size="lg" className="h-14 px-10 text-base">
                                        Go to Dashboard
                                        <ArrowRight className="ml-2 h-4 w-4" />
                                    </Button>
                                </Link>
                            ) : (
                                <>
                                    <Link href="/contact">
                                        <Button size="lg" className="h-14 px-12 text-base transition-transform hover:scale-[1.02] active:scale-[0.98]">
                                            Partner With Us
                                            <ArrowRight className="ml-2 h-4 w-4" />
                                        </Button>
                                    </Link>
                                    <button
                                        onClick={() => signIn('google', { callbackUrl: '/dashboard' })}
                                        className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors h-14 px-2"
                                    >
                                        Already a member?
                                        <span className="font-medium text-foreground">Sign in</span>
                                        <ChevronRight className="h-3.5 w-3.5" />
                                    </button>
                                </>
                            )}
                        </div>
                    </div>
                </div>

                {/* Scroll indicator */}
                <div className="absolute bottom-12 left-1/2 -translate-x-1/2 flex flex-col items-center gap-4">
                    <span className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground/50 font-medium">Scroll to explore</span>
                    <div className="w-px h-20 bg-gradient-to-b from-border/50 via-border to-transparent" />
                </div>
            </section>

            {/* Value Propositions - Numbered */}
            <section className="py-32 border-t border-border">
                <div className="container max-w-6xl">
                    <div className="grid md:grid-cols-3 gap-0 md:divide-x divide-border">
                        {/* Value 1 */}
                        <div className="py-12 md:py-0 md:pr-16 space-y-6">
                            <span className="font-display text-5xl font-light text-primary/10">01</span>
                            <div className="space-y-3">
                                <h3 className="text-xl font-medium">Seamless facility management</h3>
                                <p className="text-muted-foreground leading-relaxed">
                                    From tennis courts to cricket grounds, manage your entire athletic portfolio with precision and ease.
                                </p>
                            </div>
                        </div>

                        {/* Value 2 */}
                        <div className="py-12 md:py-0 md:px-16 space-y-6 border-t md:border-t-0 border-border">
                            <span className="font-display text-5xl font-light text-primary/10">02</span>
                            <div className="space-y-3">
                                <h3 className="text-xl font-medium">Total member visibility</h3>
                                <p className="text-muted-foreground leading-relaxed">
                                    Real-time availability and coordination for exclusive communities who value their members&apos; time.
                                </p>
                            </div>
                        </div>

                        {/* Value 3 */}
                        <div className="py-12 md:py-0 md:pl-16 space-y-6 border-t md:border-t-0 border-border">
                            <span className="font-display text-5xl font-light text-primary/10">03</span>
                            <div className="space-y-3">
                                <h3 className="text-xl font-medium">Bespoke configurations</h3>
                                <p className="text-muted-foreground leading-relaxed">
                                    Custom rules, tailored branding, and granular control designed for the world&apos;s most prestigious estates.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Divider */}
            <div className="container max-w-6xl">
                <div className="h-px bg-border" />
            </div>

            {/* Pricing / Partnership Section */}
            <section className="py-32">
                <div className="container max-w-6xl">
                    <div className="grid lg:grid-cols-2 gap-20 items-start">
                        {/* Left - Text */}
                        <div className="space-y-8">
                            <h2 className="font-display text-4xl md:text-5xl font-medium tracking-tight leading-tight">
                                Infrastructure tailored to your community
                            </h2>
                            <p className="text-xl text-muted-foreground leading-relaxed">
                                Every partnership begins with a conversation. We work with you to understand your space, your members, and your&nbsp;vision.
                            </p>
                            <Link href="/contact">
                                <Button size="lg" className="h-14 px-10 text-base mt-4">
                                    Partner With Us
                                    <ArrowRight className="ml-2 h-4 w-4" />
                                </Button>
                            </Link>
                        </div>

                        {/* Right - Features list */}
                        <div className="space-y-0 divide-y divide-border border-y border-border">
                            {[
                                'Unlimited athletic facilities and courts',
                                'Real-time booking with live availability',
                                'Exclusive member directory and profiles',
                                'Bespoke branding for your community',
                                'Advanced analytics and usage insights',
                                'Dedicated concierge-level support',
                            ].map((feature, i) => (
                                <div key={i} className="py-5 flex items-center gap-4">
                                    <span className="text-xs font-medium text-muted-foreground w-6">
                                        {String(i + 1).padStart(2, '0')}
                                    </span>
                                    <span className="text-foreground">{feature}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </section>

            {/* Contact Section */}
            <section className="py-24 border-t border-border bg-muted/30">
                <div className="container max-w-6xl">
                    <div className="max-w-xl mx-auto text-center space-y-6">
                        <h2 className="font-display text-3xl font-medium tracking-tight">
                            Ready to elevate your community?
                        </h2>
                        <p className="text-muted-foreground">
                            Get in touch to discuss how Avith can serve your members.
                        </p>
                        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
                            <Link href="/contact">
                                <Button size="lg" className="h-12 px-10 transition-transform hover:scale-[1.02] active:scale-[0.98]">
                                    Begin a Conversation
                                </Button>
                            </Link>
                            <a
                                href="mailto:hello@avith.app"
                                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                            >
                                hello@avith.app
                            </a>
                        </div>
                    </div>
                </div>
            </section>

            {/* Footer */}
            <footer className="py-12 border-t border-border">
                <div className="container max-w-6xl">
                    <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                        <span className="font-display text-xl font-medium">Avith</span>
                        <p className="text-sm text-muted-foreground">
                            © 2026 Avith. Premium booking for private communities.
                        </p>
                        <div className="flex items-center gap-6 text-sm text-muted-foreground">
                            <Link href="/contact" className="hover:text-foreground transition-colors">
                                Contact
                            </Link>
                            <a href="mailto:hello@avith.app" className="hover:text-foreground transition-colors">
                                hello@avith.app
                            </a>
                        </div>
                    </div>
                </div>
            </footer>
        </div>
    );
}
