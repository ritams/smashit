'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Mail } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

export default function ContactPage() {
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submitted, setSubmitted] = useState(false);

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setIsSubmitting(true);
        await new Promise(resolve => setTimeout(resolve, 1000));
        setIsSubmitting(false);
        setSubmitted(true);
        toast.success('Message sent');
    };

    return (
        <div className="min-h-screen bg-background flex flex-col">
            {/* Header */}
            <header className="py-6 border-b border-border">
                <div className="container max-w-4xl">
                    <nav className="flex items-center justify-between">
                        <Link href="/" className="group">
                            <span className="font-display text-xl font-medium tracking-tight">
                                Avith
                            </span>
                        </Link>
                        <Link href="/">
                            <Button variant="ghost" size="sm">
                                <ArrowLeft className="mr-2 h-4 w-4" />
                                Back
                            </Button>
                        </Link>
                    </nav>
                </div>
            </header>

            {/* Main */}
            <main className="flex-1 py-16 md:py-24">
                <div className="container max-w-4xl">
                    <div className="grid lg:grid-cols-2 gap-16 items-start">
                        {/* Left Side - Info */}
                        <div className="space-y-8">
                            <div className="space-y-4">
                                <h1 className="font-display text-3xl md:text-4xl font-medium tracking-tight">
                                    Get in touch
                                </h1>
                                <p className="text-muted-foreground text-lg leading-relaxed">
                                    Interested in bringing Avith to your community? We'd love to hear from you.
                                </p>
                            </div>

                            <div className="space-y-4 pt-4">
                                <div className="flex items-center gap-3">
                                    <Mail className="h-5 w-5 text-muted-foreground" />
                                    <a
                                        href="mailto:hello@avith.app"
                                        className="text-foreground hover:text-primary transition-colors"
                                    >
                                        hello@avith.app
                                    </a>
                                </div>
                            </div>

                            <div className="pt-4 border-t border-border">
                                <p className="text-sm text-muted-foreground">
                                    We typically respond within one business day.
                                </p>
                            </div>
                        </div>

                        {/* Right Side - Form */}
                        <div>
                            {submitted ? (
                                <div className="bg-muted/30 rounded-lg p-8 text-center space-y-4 border border-border">
                                    <h2 className="text-lg font-medium">Thank you</h2>
                                    <p className="text-muted-foreground text-sm">
                                        We've received your message and will be in touch soon.
                                    </p>
                                    <Link href="/">
                                        <Button variant="outline" className="mt-4">
                                            Return home
                                        </Button>
                                    </Link>
                                </div>
                            ) : (
                                <form onSubmit={handleSubmit} className="space-y-5">
                                    <div className="space-y-2">
                                        <Label htmlFor="name">Name</Label>
                                        <Input
                                            id="name"
                                            name="name"
                                            placeholder="Your name"
                                            required
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="email">Email</Label>
                                        <Input
                                            id="email"
                                            name="email"
                                            type="email"
                                            placeholder="you@example.com"
                                            required
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="organization">Organization</Label>
                                        <Input
                                            id="organization"
                                            name="organization"
                                            placeholder="Your community or club"
                                            required
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="message">Message</Label>
                                        <textarea
                                            id="message"
                                            name="message"
                                            placeholder="Tell us about your booking needs..."
                                            required
                                            rows={4}
                                            className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 resize-none"
                                        />
                                    </div>

                                    <Button
                                        type="submit"
                                        className="w-full"
                                        disabled={isSubmitting}
                                    >
                                        {isSubmitting ? 'Sending...' : 'Send message'}
                                    </Button>
                                </form>
                            )}
                        </div>
                    </div>
                </div>
            </main>

            {/* Footer */}
            <footer className="py-8 border-t border-border">
                <div className="container max-w-4xl">
                    <div className="flex items-center justify-between text-sm text-muted-foreground">
                        <span className="font-display font-medium text-foreground">Avith</span>
                        <span>© 2026</span>
                    </div>
                </div>
            </footer>
        </div>
    );
}
