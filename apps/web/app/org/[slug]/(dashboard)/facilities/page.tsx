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

// Category configuration
const CATEGORY_CONFIG: Record<string, {
    label: string;
    shortLabel: string;
    description: string;
    location: string;
    rules: string[];
}> = {
    BADMINTON: {
        label: 'Badminton Courts',
        shortLabel: 'Badminton',
        description: 'Professional-grade badminton courts with international standard markings, premium flooring, and optimal lighting conditions for competitive and recreational play.',
        location: 'Sports Complex, Ground Floor',
        rules: [
            'Non-marking shoes required',
            'Bring your own rackets and shuttlecocks',
            'Maximum 4 players per court',
            'Please vacate court 5 minutes before slot ends'
        ],
    },
    TENNIS: {
        label: 'Tennis Courts',
        shortLabel: 'Tennis',
        description: 'Well-maintained outdoor tennis courts with quality playing surfaces. Perfect for both singles and doubles matches.',
        location: 'Outdoor Sports Area, Near Main Gate',
        rules: [
            'Tennis shoes recommended',
            'Equipment available on request',
            'Maximum 4 players per court',
            'Courts may close during adverse weather'
        ],
    },
    TABLE_TENNIS: {
        label: 'Table Tennis',
        shortLabel: 'Table Tennis',
        description: 'Indoor table tennis facilities with professional tables and climate-controlled environment for year-round play.',
        location: 'Recreation Hall, First Floor',
        rules: [
            'Paddles and balls provided',
            'Clean the table after use',
            'Maximum 4 players per table',
            'Indoor footwear only'
        ],
    },
    FOOTBALL: {
        label: 'Football Ground',
        shortLabel: 'Football',
        description: 'Full-size football ground with natural grass turf, goal posts, and floodlights for evening matches.',
        location: 'Main Sports Field',
        rules: [
            'Studs allowed on grass surface',
            'Bring your own football',
            'Minimum 10 players for full booking',
            'Ground maintenance on Mondays'
        ],
    },
    BASKETBALL: {
        label: 'Basketball Court',
        shortLabel: 'Basketball',
        description: 'Outdoor basketball court with professional hoops and markings. Ideal for pickup games and practice sessions.',
        location: 'Outdoor Sports Area',
        rules: [
            'Basketball shoes required',
            'Balls available at reception',
            'Maximum 10 players per court',
            'No food or drinks on court'
        ],
    },
    CRICKET: {
        label: 'Cricket Nets',
        shortLabel: 'Cricket',
        description: 'Practice nets with artificial turf pitch. Perfect for batting practice and bowling sessions.',
        location: 'Cricket Ground, Adjacent to Main Field',
        rules: [
            'Helmets mandatory for batting',
            'Bring your own cricket kit',
            'Book full net for team practice',
            'No leather balls without permission'
        ],
    },
    SWIMMING: {
        label: 'Swimming Pool',
        shortLabel: 'Swimming',
        description: 'Olympic-size swimming pool with separate lanes for lap swimming and recreational use.',
        location: 'Aquatic Center',
        rules: [
            'Swimming cap mandatory',
            'Shower before entering pool',
            'Lifeguard on duty during open hours',
            'Children must be accompanied'
        ],
    },
    GENERIC: {
        label: 'Other Facilities',
        shortLabel: 'Other',
        description: 'Additional recreational facilities available for booking.',
        location: 'Various Locations',
        rules: [
            'Follow facility-specific guidelines',
            'Respect other users',
            'Return equipment after use'
        ],
    },
};

interface Space {
    id: string;
    name: string;
    description: string | null;
    capacity: number;
    isActive: boolean;
    type: string;
    rules?: {
        openTime: string;
        closeTime: string;
        slotDurationMin: number;
        maxAdvanceDays: number;
    };
}

interface CategoryData {
    type: string;
    config: typeof CATEGORY_CONFIG[string];
    spaces: Space[];
    totalCapacity: number;
    operatingHours: string;
}

export default function FacilitiesPage() {
    const params = useParams();
    const { data: session } = useSession();
    const orgSlug = params.slug as string;

    const [spaces, setSpaces] = useState<Space[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeCategory, setActiveCategory] = useState<string | null>(null);
    const sectionRefs = useRef<Record<string, HTMLElement | null>>({});

    useEffect(() => {
        async function fetchSpaces() {
            if (!session?.user?.email) return;
            setLoading(true);
            try {
                const data = await api.getSpaces(orgSlug);
                setSpaces(data.filter((s: Space) => s.isActive));
            } catch (err) {
                console.error('Failed to fetch spaces:', err);
            }
            setLoading(false);
        }
        fetchSpaces();
    }, [orgSlug, session?.user?.email]);

    // Group spaces by category with aggregated data
    const categories = useMemo((): CategoryData[] => {
        const groups: Record<string, Space[]> = {};
        spaces.forEach(space => {
            if (!groups[space.type]) groups[space.type] = [];
            groups[space.type].push(space);
        });

        return Object.entries(groups).map(([type, typeSpaces]) => {
            const config = CATEGORY_CONFIG[type] || CATEGORY_CONFIG.GENERIC;
            const firstWithRules = typeSpaces.find(s => s.rules);
            const operatingHours = firstWithRules?.rules
                ? `${firstWithRules.rules.openTime} - ${firstWithRules.rules.closeTime}`
                : '06:00 - 22:00';

            return {
                type,
                config: { ...config, label: config.label || type },
                spaces: typeSpaces,
                totalCapacity: typeSpaces.reduce((sum, s) => sum + s.capacity, 0),
                operatingHours,
            };
        }).sort((a, b) => a.config.label.localeCompare(b.config.label));
    }, [spaces]);

    // Set initial active category
    useEffect(() => {
        if (categories.length > 0 && !activeCategory) {
            setActiveCategory(categories[0].type);
        }
    }, [categories, activeCategory]);

    // Scroll to section when clicking sidebar
    const scrollToSection = (type: string) => {
        setActiveCategory(type);
        const element = sectionRefs.current[type];
        if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    };

    // Update active category on scroll
    useEffect(() => {
        const handleScroll = () => {
            const offset = 150;
            for (const category of categories) {
                const element = sectionRefs.current[category.type];
                if (element) {
                    const rect = element.getBoundingClientRect();
                    if (rect.top <= offset && rect.bottom > offset) {
                        setActiveCategory(category.type);
                        break;
                    }
                }
            }
        };

        window.addEventListener('scroll', handleScroll, { passive: true });
        return () => window.removeEventListener('scroll', handleScroll);
    }, [categories]);

    if (loading) {
        return (
            <div className="flex gap-8">
                <div className="hidden lg:block w-48 flex-shrink-0">
                    <Skeleton className="h-64 rounded-xl" />
                </div>
                <div className="flex-1 py-8 space-y-12">
                    <Skeleton className="h-10 w-64" />
                    <Skeleton className="h-6 w-96" />
                    {[1, 2].map((i) => (
                        <Skeleton key={i} className="h-80 rounded-2xl" />
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div className="flex gap-8">
            {/* Left Sidebar - Category Navigation */}
            <aside className="hidden lg:block w-48 flex-shrink-0 relative">
                <nav className="sticky top-20 space-y-1 pr-6 border-r border-border/40">
                    <p className="text-[10px] font-semibold text-muted-foreground/40 uppercase tracking-[0.2em] mb-4 pl-3">
                        Facilities
                    </p>
                    {categories.map((category) => (
                        <button
                            key={category.type}
                            onClick={() => scrollToSection(category.type)}
                            className={cn(
                                "w-full text-left px-3 py-2 text-sm font-medium transition-colors relative flex items-center",
                                activeCategory === category.type
                                    ? "text-primary"
                                    : "text-muted-foreground hover:text-foreground"
                            )}
                        >
                            {/* Active Dot Indicator */}
                            {activeCategory === category.type && (
                                <span className="absolute -left-1.5 h-1.5 w-1.5 rounded-full bg-primary" />
                            )}

                            <span>{category.config.shortLabel}</span>
                        </button>
                    ))}
                </nav>
            </aside>

            {/* Main Content */}
            <div className="flex-1 py-8 max-w-4xl">
                {/* Header */}
                <div className="mb-12">
                    <h1 className="text-3xl font-medium tracking-tight font-display text-foreground/90">
                        Facilities
                    </h1>
                    <p className="text-muted-foreground/70 mt-2 text-sm max-w-lg">
                        Discover our world-class sporting facilities, designed for optimal performance and comfort.
                    </p>
                </div>

                {/* Category Sections */}
                <div className="space-y-16">
                    {categories.map((category) => (
                        <section
                            key={category.type}
                            id={`facility-${category.type}`}
                            ref={(el) => { sectionRefs.current[category.type] = el; }}
                            className="scroll-mt-20"
                        >
                            <CategorySection
                                category={category}
                                orgSlug={orgSlug}
                            />
                        </section>
                    ))}
                </div>

                {/* Empty State */}
                {categories.length === 0 && (
                    <div className="text-center py-16 border border-dashed border-border rounded-xl">
                        <MapPin className="h-10 w-10 mx-auto text-muted-foreground/40 mb-4" />
                        <p className="text-lg font-medium mb-2">No facilities available</p>
                        <p className="text-muted-foreground text-sm">
                            Contact your administrator to set up booking spaces.
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}

/** Category Section Component */
function CategorySection({
    category,
    orgSlug,
}: {
    category: CategoryData;
    orgSlug: string;
}) {
    const { config, spaces, totalCapacity, operatingHours, type } = category;

    return (
        <div className="group">
            {/* Hero Image with Gradient Overlay */}
            <div className="relative h-48 rounded-2xl overflow-hidden bg-gradient-to-br from-muted/50 to-muted/30 mb-6">
                {/* Placeholder gradient */}
                <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-primary/10" />

                {/* Category Label Overlay */}
                <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-background/90 via-background/60 to-transparent">
                    <div className="flex items-center justify-between">
                        <div>
                            <h2 className="text-2xl font-display font-medium text-foreground">
                                {config.label}
                            </h2>
                            <p className="text-sm text-muted-foreground mt-1">
                                {spaces.length} {spaces.length === 1 ? 'space' : 'spaces'} available
                            </p>
                        </div>
                        <Link href={`/org/${orgSlug}/book?category=${type}`}>
                            <Button className="shadow-lg">
                                <Calendar className="h-4 w-4 mr-2" />
                                Book Now
                            </Button>
                        </Link>
                    </div>
                </div>
            </div>

            {/* Content Grid */}
            <div className="grid md:grid-cols-2 gap-6">
                {/* Left Column - About & Location */}
                <div className="space-y-6">
                    {/* About */}
                    <div className="space-y-3">
                        <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                            <Info className="h-4 w-4" />
                            <span className="uppercase tracking-wider text-xs">About</span>
                        </div>
                        <p className="text-sm text-foreground/80 leading-relaxed">
                            {config.description}
                        </p>
                    </div>

                    {/* Location */}
                    <div className="space-y-3">
                        <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                            <MapPin className="h-4 w-4" />
                            <span className="uppercase tracking-wider text-xs">Location</span>
                        </div>
                        <div className="flex items-center justify-between">
                            <p className="text-sm text-foreground/80">
                                {config.location}
                            </p>
                            <button className="text-xs text-primary hover:underline flex items-center gap-1">
                                View on map
                                <ExternalLink className="h-3 w-3" />
                            </button>
                        </div>
                    </div>

                    {/* Quick Stats */}
                    <div className="flex items-center gap-6 pt-4 border-t border-border/40">
                        <div className="flex items-center gap-2 text-sm">
                            <Users className="h-4 w-4 text-muted-foreground" />
                            <span className="text-foreground/80">{totalCapacity} spots total</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                            <Clock className="h-4 w-4 text-muted-foreground" />
                            <span className="text-foreground/80">{operatingHours}</span>
                        </div>
                    </div>
                </div>

                {/* Right Column - Rules & Guidelines */}
                <div className="space-y-3">
                    <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                        <ShieldCheck className="h-4 w-4" />
                        <span className="uppercase tracking-wider text-xs">Rules & Guidelines</span>
                    </div>
                    <ul className="space-y-2">
                        {config.rules.map((rule, idx) => (
                            <li key={idx} className="flex items-start gap-3 text-sm text-foreground/80">
                                <ChevronRight className="h-4 w-4 text-primary/60 mt-0.5 flex-shrink-0" />
                                <span>{rule}</span>
                            </li>
                        ))}
                    </ul>
                </div>
            </div>

            {/* Spaces List */}
            <div className="mt-6 pt-6 border-t border-border/30">
                <p className="text-xs text-muted-foreground/60 uppercase tracking-wider mb-3">
                    Available Spaces
                </p>
                <div className="flex flex-wrap gap-2">
                    {spaces.map((space) => (
                        <span
                            key={space.id}
                            className="px-3 py-1.5 rounded-full bg-muted/50 text-xs font-medium text-muted-foreground border border-border/40"
                        >
                            {space.name}
                        </span>
                    ))}
                </div>
            </div>
        </div>
    );
}
