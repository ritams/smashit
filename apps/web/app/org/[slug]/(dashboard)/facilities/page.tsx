'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { useParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import {
    MapPin,
    Users,
    Clock,
    ChevronRight,
    Calendar,
    Info,
    ShieldCheck,
    ExternalLink
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { api } from '@/lib/api-client';

interface Facility {
    id: string;
    name: string;
    description: string | null;
    type: string;
    location: string | null;
    mapLink: string | null;
    imageUrls: string[];
    guidelines: string[];
    spaces: {
        id: string;
        name: string;
        capacity: number;
    }[];
    rules: {
        openTime: string;
        closeTime: string;
        slotDurationMin: number;
    } | null;
}

export default function FacilitiesPage() {
    const params = useParams();
    const { data: session } = useSession();
    const orgSlug = params.slug as string;

    const [facilities, setFacilities] = useState<Facility[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeFacilityId, setActiveFacilityId] = useState<string | null>(null);

    useEffect(() => {
        async function fetchFacilities() {
            if (!session?.user?.email) return;
            setLoading(true);
            try {
                const data = await api.getFacilities(orgSlug);
                setFacilities(data);
                if (data.length > 0 && !activeFacilityId) {
                    setActiveFacilityId(data[0].id);
                }
            } catch (err) {
                console.error('Failed to fetch facilities:', err);
            }
            setLoading(false);
        }
        fetchFacilities();
    }, [orgSlug, session?.user?.email, activeFacilityId]);

    const activeFacility = facilities.find(f => f.id === activeFacilityId);

    if (loading) {
        return (
            <div className="flex gap-12">
                <div className="hidden lg:block w-56 flex-shrink-0">
                    <Skeleton className="h-64 w-full rounded-2xl bg-muted/20" />
                </div>
                <div className="flex-1 py-4 space-y-10">
                    <Skeleton className="h-12 w-64 rounded-xl bg-muted/20" />
                    <Skeleton className="h-[400px] w-full rounded-[2rem] bg-muted/20" />
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col lg:flex-row min-h-[calc(100vh-10rem)]">
            {/* Sidebar - Typographic & Minimal */}
            <aside className="hidden lg:block w-64 flex-shrink-0 border-r border-border/40 pr-10 py-2">
                <nav className="sticky top-20 self-start">
                    <p className="text-[10px] font-bold text-muted-foreground/30 uppercase tracking-[.25em] mb-8 px-4">
                        Explore Facilities
                    </p>
                    <div className="space-y-2">
                        {facilities.map((fac) => (
                            <button
                                key={fac.id}
                                onClick={() => setActiveFacilityId(fac.id)}
                                className={cn(
                                    "group w-full text-left px-5 py-3.5 rounded-2xl transition-all duration-500 relative flex items-center justify-between gap-3 border",
                                    activeFacilityId === fac.id
                                        ? "bg-primary/[0.04] border-primary/20"
                                        : "text-muted-foreground hover:bg-muted/30 hover:text-foreground border-transparent"
                                )}
                            >
                                <span className={cn(
                                    "text-sm font-medium tracking-wide transition-all duration-300",
                                    activeFacilityId === fac.id
                                        ? "text-primary translate-x-1"
                                        : "group-hover:translate-x-0.5"
                                )}>
                                    {fac.name}
                                </span>
                                <span className={cn(
                                    "text-[10px] font-mono transition-opacity duration-300",
                                    activeFacilityId === fac.id ? "opacity-60 text-primary" : "opacity-30"
                                )}>
                                    {fac.spaces.length}
                                </span>
                            </button>
                        ))}
                    </div>
                </nav>
            </aside>

            {/* Main Content Area */}
            <main className="flex-1 lg:pl-16 py-2 max-w-6xl">
                {activeFacility ? (
                    <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
                        {/* Hero - Integrated, Full Bleed Look */}
                        <div className="relative h-[18rem] sm:h-[22rem] rounded-[2.5rem] overflow-hidden mb-12 shadow-md shadow-primary/5 border border-border/50 group">
                            {activeFacility.imageUrls?.[0] ? (
                                <img
                                    src={activeFacility.imageUrls[0]}
                                    alt={activeFacility.name}
                                    className="absolute inset-0 w-full h-full object-cover transition-transform duration-[1.5s] ease-out group-hover:scale-105"
                                />
                            ) : (
                                <div className="absolute inset-0 bg-gradient-to-tr from-primary/10 via-primary/[0.02] to-background" />
                            )}

                            {/* Sophisticated Overlay */}
                            <div className="absolute inset-0 bg-gradient-to-t from-background/95 via-background/20 to-transparent" />

                            <div className="absolute bottom-0 left-0 right-0 p-8 sm:p-12">
                                <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6">
                                    <div className="space-y-3">
                                        <div className="flex items-center gap-3">
                                            <span className="px-3 py-1 rounded-full bg-primary/10 text-primary text-[10px] font-bold uppercase tracking-widest backdrop-blur-md">
                                                {activeFacility.type}
                                            </span>
                                            {activeFacility.spaces.length > 0 && (
                                                <span className="text-[10px] font-semibold text-muted-foreground/60 uppercase tracking-widest">
                                                    {activeFacility.spaces.length} Modern {activeFacility.spaces.length === 1 ? 'Space' : 'Spaces'} Available
                                                </span>
                                            )}
                                        </div>
                                        <h1 className="text-4xl sm:text-5xl font-display tracking-tight text-foreground leading-[1.1] font-medium">
                                            {activeFacility.name}
                                        </h1>
                                    </div>

                                    <Link href={`/org/${orgSlug}/book?facilityId=${activeFacility.id}`}>
                                        <Button size="lg" className="h-12 px-8 rounded-2xl text-sm font-semibold shadow-lg shadow-primary/10 hover:shadow-primary/20 transition-all duration-300">
                                            <Calendar className="h-4 w-4 mr-2.5 opacity-70" />
                                            Book A Slot
                                        </Button>
                                    </Link>
                                </div>
                            </div>
                        </div>

                        {/* Integrated Details Sections */}
                        <div className="grid lg:grid-cols-12 gap-x-12 px-2">
                            <div className="lg:col-span-7 space-y-16">
                                {/* About Section */}
                                <section>
                                    <div className="flex items-center gap-3 mb-6 text-muted-foreground/40 uppercase tracking-[.2em] text-[11px] font-bold">
                                        <Info className="h-4 w-4" />
                                        About
                                    </div>
                                    <p className="text-xl text-foreground/80 leading-relaxed font-light">
                                        {activeFacility.description || "Experience excellence in our state-of-the-art facilities. Designed for both professional athletes and enthusiasts, our spaces provide the perfect environment for your session."}
                                    </p>
                                </section>

                                {/* Location & Details Grid */}
                                <div className="grid sm:grid-cols-2 gap-12 pt-4">
                                    <section>
                                        <div className="flex items-center gap-3 mb-6 text-muted-foreground/40 uppercase tracking-[.2em] text-[11px] font-bold">
                                            <MapPin className="h-4 w-4" />
                                            Location
                                        </div>
                                        <div className="space-y-4">
                                            <p className="text-lg text-foreground/90 font-medium leading-snug">
                                                {activeFacility.location || "Sports Complex Main Wing"}
                                            </p>
                                            {activeFacility.mapLink && (
                                                <a
                                                    href={activeFacility.mapLink}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="inline-flex items-center gap-2 text-sm text-primary hover:text-primary/70 transition-colors font-semibold group"
                                                >
                                                    Open Navigation
                                                    <ExternalLink className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                                                </a>
                                            )}
                                        </div>
                                    </section>

                                    <section>
                                        <div className="flex items-center gap-3 mb-6 text-muted-foreground/40 uppercase tracking-[.2em] text-[11px] font-bold">
                                            <Clock className="h-4 w-4" />
                                            Schedule
                                        </div>
                                        <div className="space-y-4">
                                            <p className="text-lg text-foreground/90 font-medium">
                                                {activeFacility.rules?.openTime || "06:00"} — {activeFacility.rules?.closeTime || "22:00"}
                                            </p>
                                            <p className="text-sm text-muted-foreground font-medium">
                                                Available daily for bookings
                                            </p>
                                        </div>
                                    </section>
                                </div>
                            </div>

                            {/* Guidelines Section - On the right */}
                            <aside className="lg:col-span-5 lg:border-l border-border/40 lg:pl-10 mt-16 lg:mt-0">
                                <div className="flex items-center gap-3 mb-8 text-muted-foreground/40 uppercase tracking-[.2em] text-[11px] font-bold">
                                    <ShieldCheck className="h-4 w-4" />
                                    Facility Guidelines
                                </div>
                                <div className="space-y-6">
                                    {(activeFacility.guidelines?.length ? activeFacility.guidelines : [
                                        "Non-marking shoes are mandatory",
                                        "Bring your own sports equipment",
                                        "Arrive 10 minutes prior to your slot",
                                        "Respect fellow players and staff"
                                    ]).map((rule, idx) => (
                                        <div key={idx} className="group flex gap-5 text-sm text-foreground/70 leading-relaxed font-medium">
                                            <span className="flex-shrink-0 text-primary/30 font-mono text-[10px] tabular-nums mt-1 select-none text-right w-5">
                                                {(idx + 1).toString().padStart(2, '0')}
                                            </span>
                                            <span className="transition-colors group-hover:text-foreground">
                                                {rule}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </aside>
                        </div>



                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center py-32 border-2 border-dashed border-muted/20 rounded-[3rem] bg-muted/5">
                        <MapPin className="h-16 w-16 text-muted-foreground/10 mb-8" />
                        <h2 className="text-3xl font-display font-medium mb-4">Discovery Awaits</h2>
                        <p className="text-muted-foreground text-center max-w-sm font-light px-8">
                            We're currently preparing our world-class facilities. Please check back shortly.
                        </p>
                    </div>
                )}
            </main>
        </div>
    );
}



