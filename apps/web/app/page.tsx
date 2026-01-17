'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useSession, signIn, signOut } from 'next-auth/react';
import { Calendar, Users, Zap, ArrowRight, LogOut, Sparkles, Check, Clock, Share2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
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
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-cyan-50/30 overflow-hidden">
            {/* Floating Orbs Background */}
            <div className="fixed inset-0 pointer-events-none overflow-hidden">
                <div className="orb orb-primary w-[500px] h-[500px] -top-48 -right-48 animate-float" />
                <div className="orb orb-accent w-[400px] h-[400px] top-1/3 -left-32 animate-float-delayed" />
                <div className="orb orb-tertiary w-[300px] h-[300px] bottom-20 right-1/4 animate-float-slow" />
            </div>

            {/* Grid Pattern Overlay */}
            <div className="fixed inset-0 grid-pattern pointer-events-none opacity-50" />

            {/* Header */}
            <header
                className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${scrolled
                    ? 'py-3 glass shadow-lg'
                    : 'py-6 bg-transparent'
                    }`}
            >
                <div className="container">
                    <nav className="flex items-center justify-between">
                        <div className="flex items-center gap-3 group">
                            <div className={`flex items-center justify-center w-11 h-11 rounded-2xl bg-gradient-to-br from-primary to-cyan-500 text-white shadow-lg shadow-primary/25 transition-all duration-300 group-hover:shadow-xl group-hover:shadow-primary/30 group-hover:scale-105 ${scrolled ? 'w-10 h-10 rounded-xl' : ''}`}>
                                <Calendar className="h-5 w-5" />
                            </div>
                            <span className={`font-bold tracking-tight transition-all duration-300 ${scrolled ? 'text-lg' : 'text-xl'}`}>
                                SmashIt
                            </span>
                        </div>
                        <div className="flex items-center gap-4">
                            {session ? (
                                <>
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <button className="flex items-center gap-3 px-3 py-1.5 rounded-full bg-white/60 backdrop-blur-sm border border-white/20 shadow-sm hover:bg-white/80 hover:shadow-md transition-all duration-300 cursor-pointer outline-none">
                                                <Avatar className="h-8 w-8 ring-2 ring-white shadow-sm">
                                                    <AvatarImage src={session.user?.image || ''} />
                                                    <AvatarFallback className="text-xs font-medium bg-gradient-to-br from-primary to-cyan-500 text-white">
                                                        {getInitials(session.user?.name || 'U')}
                                                    </AvatarFallback>
                                                </Avatar>
                                                <span className="text-sm font-medium hidden md:block">
                                                    {session.user?.name}
                                                </span>
                                            </button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end" className="w-56 mt-2">
                                            <DropdownMenuLabel className="font-normal">
                                                <div className="flex flex-col space-y-1">
                                                    <p className="text-sm font-medium">{session.user?.name}</p>
                                                    <p className="text-xs text-muted-foreground">{session.user?.email}</p>
                                                </div>
                                            </DropdownMenuLabel>
                                            <DropdownMenuSeparator />
                                            <DropdownMenuItem
                                                className="text-red-600 focus:text-red-600 focus:bg-red-50 cursor-pointer"
                                                onClick={() => signOut({ callbackUrl: '/' })}
                                            >
                                                <LogOut className="mr-2 h-4 w-4" />
                                                Sign out
                                            </DropdownMenuItem>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                    <Link href="/dashboard">
                                        <Button className="rounded-xl shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/30 transition-all duration-300 hover:scale-105">
                                            Dashboard
                                        </Button>
                                    </Link>
                                </>
                            ) : (
                                <Button
                                    className="rounded-xl shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/30 transition-all duration-300 hover:scale-105"
                                    onClick={() => signIn('google', { callbackUrl: '/dashboard' })}
                                >
                                    Sign In
                                </Button>
                            )}
                        </div>
                    </nav>
                </div>
            </header>

            {/* Hero Section */}
            <section className="relative pt-32 pb-24 md:pt-40 md:pb-32">
                <div className="container">
                    <div className="max-w-4xl mx-auto text-center space-y-8">
                        {/* Badge */}
                        <div className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-gradient-to-r from-primary/10 via-cyan-100/80 to-teal-100/60 text-primary text-sm font-semibold border border-primary/10 shadow-sm animate-slide-up relative overflow-hidden group">
                            <div className="absolute inset-0 animate-shimmer" />
                            <Sparkles className="h-4 w-4 relative z-10" />
                            <span className="relative z-10">Simple booking for organizations</span>
                        </div>

                        {/* Headline */}
                        <h1 className="text-5xl md:text-7xl font-bold tracking-tight animate-slide-up delay-100" style={{ animationFillMode: 'both' }}>
                            Book your spaces
                            <span className="block gradient-text mt-2">in seconds</span>
                        </h1>

                        {/* Subheadline */}
                        <p className="text-xl md:text-2xl text-muted-foreground max-w-2xl mx-auto leading-relaxed animate-slide-up delay-200" style={{ animationFillMode: 'both' }}>
                            SmashIt helps organizations manage space bookings effortlessly.
                            Create your booking portal and let your members reserve slots instantly.
                        </p>

                        {/* CTA Buttons */}
                        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-6 animate-slide-up delay-300" style={{ animationFillMode: 'both' }}>
                            {session ? (
                                <Link href="/dashboard">
                                    <Button size="lg" className="h-14 px-10 text-lg gap-3 rounded-2xl animated-gradient text-white border-0 shadow-xl shadow-primary/30 hover:shadow-2xl hover:shadow-primary/40 transition-all duration-300 hover:scale-105 animate-glow-pulse">
                                        Go to Dashboard
                                        <ArrowRight className="h-5 w-5" />
                                    </Button>
                                </Link>
                            ) : (
                                <>
                                    <Button
                                        size="lg"
                                        className="h-14 px-10 text-lg gap-3 rounded-2xl animated-gradient text-white border-0 shadow-xl shadow-primary/30 hover:shadow-2xl hover:shadow-primary/40 transition-all duration-300 hover:scale-105 animate-glow-pulse"
                                        onClick={() => signIn('google', { callbackUrl: '/dashboard' })}
                                    >
                                        Get Started Free
                                        <ArrowRight className="h-5 w-5" />
                                    </Button>
                                    <Button
                                        variant="outline"
                                        size="lg"
                                        className="h-14 px-10 text-lg rounded-2xl bg-white/60 backdrop-blur-sm border-2 border-slate-200 hover:border-primary/30 hover:bg-white/80 transition-all duration-300"
                                    >
                                        Learn More
                                    </Button>
                                </>
                            )}
                        </div>

                        {/* Trust Indicators */}
                        <div className="flex items-center justify-center gap-8 pt-8 text-sm text-muted-foreground animate-slide-up delay-400" style={{ animationFillMode: 'both' }}>
                            <div className="flex items-center gap-2">
                                <Check className="h-4 w-4 text-green-500" />
                                <span>Free to start</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <Check className="h-4 w-4 text-green-500" />
                                <span>No credit card</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <Check className="h-4 w-4 text-green-500" />
                                <span>Setup in 60 seconds</span>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Features Section */}
            <section className="relative py-24 md:py-32">
                <div className="container">
                    <div className="text-center mb-16 space-y-4">
                        <h2 className="text-3xl md:text-4xl font-bold">Everything you need</h2>
                        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                            Powerful features to streamline your organization&apos;s booking process
                        </p>
                    </div>

                    <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
                        {/* Feature Card 1 */}
                        <Card className="group border-0 shadow-xl bg-white/70 backdrop-blur-sm card-3d glow-border overflow-hidden">
                            <CardContent className="pt-8 pb-8 px-8 space-y-5">
                                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary/10 to-cyan-100 flex items-center justify-center group-hover:scale-110 group-hover:shadow-lg group-hover:shadow-primary/20 transition-all duration-300">
                                    <Calendar className="h-7 w-7 text-primary" />
                                </div>
                                <h3 className="text-xl font-bold">Easy Booking</h3>
                                <p className="text-muted-foreground leading-relaxed">
                                    Members can book spaces with just a few clicks. See availability in real-time and reserve instantly.
                                </p>
                            </CardContent>
                        </Card>

                        {/* Feature Card 2 */}
                        <Card className="group border-0 shadow-xl bg-white/70 backdrop-blur-sm card-3d glow-border overflow-hidden">
                            <CardContent className="pt-8 pb-8 px-8 space-y-5">
                                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-teal-100 to-emerald-100 flex items-center justify-center group-hover:scale-110 group-hover:shadow-lg group-hover:shadow-teal-500/20 transition-all duration-300">
                                    <Users className="h-7 w-7 text-teal-600" />
                                </div>
                                <h3 className="text-xl font-bold">See Who&apos;s Booked</h3>
                                <p className="text-muted-foreground leading-relaxed">
                                    Know who booked each slot. Coordinate with your team effortlessly and avoid conflicts.
                                </p>
                            </CardContent>
                        </Card>

                        {/* Feature Card 3 */}
                        <Card className="group border-0 shadow-xl bg-white/70 backdrop-blur-sm card-3d glow-border overflow-hidden">
                            <CardContent className="pt-8 pb-8 px-8 space-y-5">
                                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-100 to-orange-100 flex items-center justify-center group-hover:scale-110 group-hover:shadow-lg group-hover:shadow-amber-500/20 transition-all duration-300">
                                    <Zap className="h-7 w-7 text-amber-600" />
                                </div>
                                <h3 className="text-xl font-bold">Custom URL</h3>
                                <p className="text-muted-foreground leading-relaxed">
                                    Get your own branded booking page. Share it with your organization members easily.
                                </p>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </section>

            {/* How It Works */}
            <section className="relative py-24 md:py-32 bg-gradient-to-b from-transparent via-slate-50/50 to-transparent">
                <div className="container">
                    <div className="max-w-4xl mx-auto">
                        <div className="text-center mb-16 space-y-4">
                            <h2 className="text-3xl md:text-4xl font-bold">How It Works</h2>
                            <p className="text-lg text-muted-foreground">
                                Get started in three simple steps
                            </p>
                        </div>

                        <div className="grid md:grid-cols-3 gap-8 md:gap-4">
                            {/* Step 1 */}
                            <div className="relative group step-connector">
                                <div className="flex flex-col items-center text-center space-y-5">
                                    <div className="relative">
                                        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-cyan-500 text-white flex items-center justify-center font-bold text-xl shadow-xl shadow-primary/30 group-hover:scale-110 group-hover:shadow-2xl group-hover:shadow-primary/40 transition-all duration-300">
                                            1
                                        </div>
                                        <div className="absolute inset-0 rounded-2xl bg-primary/30 animate-ping opacity-20" style={{ animationDuration: '2s' }} />
                                    </div>
                                    <div className="space-y-2">
                                        <h3 className="font-bold text-lg">Create Account</h3>
                                        <p className="text-muted-foreground text-sm leading-relaxed">
                                            Sign in with Google to create your account in seconds.
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* Step 2 */}
                            <div className="relative group step-connector">
                                <div className="flex flex-col items-center text-center space-y-5">
                                    <div className="relative">
                                        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-teal-500 to-emerald-500 text-white flex items-center justify-center font-bold text-xl shadow-xl shadow-teal-500/30 group-hover:scale-110 group-hover:shadow-2xl group-hover:shadow-teal-500/40 transition-all duration-300">
                                            2
                                        </div>
                                        <div className="absolute inset-0 rounded-2xl bg-teal-500/30 animate-ping opacity-20" style={{ animationDuration: '2s', animationDelay: '0.5s' }} />
                                    </div>
                                    <div className="space-y-2">
                                        <h3 className="font-bold text-lg">Create Organization</h3>
                                        <p className="text-muted-foreground text-sm leading-relaxed">
                                            Set up your org and add bookable spaces.
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* Step 3 */}
                            <div className="relative group">
                                <div className="flex flex-col items-center text-center space-y-5">
                                    <div className="relative">
                                        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-500 text-white flex items-center justify-center font-bold text-xl shadow-xl shadow-amber-500/30 group-hover:scale-110 group-hover:shadow-2xl group-hover:shadow-amber-500/40 transition-all duration-300">
                                            3
                                        </div>
                                        <div className="absolute inset-0 rounded-2xl bg-amber-500/30 animate-ping opacity-20" style={{ animationDuration: '2s', animationDelay: '1s' }} />
                                    </div>
                                    <div className="space-y-2">
                                        <h3 className="font-bold text-lg">Share & Book</h3>
                                        <p className="text-muted-foreground text-sm leading-relaxed">
                                            Share your URL and let members start booking.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* CTA Section */}
            <section className="relative py-24 md:py-32">
                <div className="container">
                    <Card className="border-0 overflow-hidden max-w-4xl mx-auto shadow-2xl">
                        <div className="relative animated-gradient p-12 md:p-16">
                            {/* Decorative Elements */}
                            <div className="absolute top-6 left-6 w-20 h-20 rounded-full bg-white/10 blur-xl" />
                            <div className="absolute bottom-6 right-6 w-32 h-32 rounded-full bg-white/10 blur-xl" />

                            <CardContent className="relative text-center space-y-6 p-0">
                                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/20 backdrop-blur-sm text-white/90 text-sm font-medium">
                                    <Sparkles className="h-4 w-4" />
                                    Start for free today
                                </div>
                                <h2 className="text-3xl md:text-4xl font-bold text-white">
                                    Ready to get started?
                                </h2>
                                <p className="text-white/80 text-lg max-w-xl mx-auto">
                                    Create your organization&apos;s booking portal in less than a minute. No credit card required.
                                </p>
                                {session ? (
                                    <Link href="/create-org">
                                        <Button size="lg" className="h-14 px-10 text-lg rounded-2xl bg-white text-primary hover:bg-white/90 shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105 font-semibold">
                                            Create Organization
                                            <ArrowRight className="h-5 w-5 ml-2" />
                                        </Button>
                                    </Link>
                                ) : (
                                    <Button
                                        size="lg"
                                        className="h-14 px-10 text-lg rounded-2xl bg-white text-primary hover:bg-white/90 shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105 font-semibold"
                                        onClick={() => signIn('google', { callbackUrl: '/dashboard' })}
                                    >
                                        Sign In to Get Started
                                        <ArrowRight className="h-5 w-5 ml-2" />
                                    </Button>
                                )}
                            </CardContent>
                        </div>
                    </Card>
                </div>
            </section>

            {/* Footer */}
            <footer className="relative py-12 border-t border-slate-200/50 bg-gradient-to-b from-transparent to-slate-50/50">
                <div className="container">
                    <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                        <div className="flex items-center gap-3">
                            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-cyan-500 text-white shadow-lg shadow-primary/20">
                                <Calendar className="h-5 w-5" />
                            </div>
                            <span className="font-bold text-lg">SmashIt</span>
                        </div>
                        <p className="text-sm text-muted-foreground">
                            © 2026 SmashIt. Simple booking for organizations.
                        </p>
                        <div className="flex items-center gap-6 text-sm text-muted-foreground">
                            <a href="#" className="hover:text-primary transition-colors">Privacy</a>
                            <a href="#" className="hover:text-primary transition-colors">Terms</a>
                            <a href="#" className="hover:text-primary transition-colors">Contact</a>
                        </div>
                    </div>
                </div>
            </footer>
        </div>
    );
}
