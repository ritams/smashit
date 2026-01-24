"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import { ImageUpload } from "@/components/ui/image-upload";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Loader2, Plus, MapPin, Trash2, Edit2, Image as ImageIcon } from "lucide-react";

export default function AdminFacilitiesPage() {
    const params = useParams();
    const orgSlug = params.slug as string;
    const queryClient = useQueryClient();
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [isEditing, setIsEditing] = useState<string | null>(null);

    // Form State
    const [name, setName] = useState("");
    const [description, setDescription] = useState("");
    const [location, setLocation] = useState("");
    const [imageUrl, setImageUrl] = useState("");

    const { data: facilities, isLoading } = useQuery({
        queryKey: ['admin-facilities', orgSlug],
        queryFn: () => api.getAdminFacilities(orgSlug)
    });

    const createMutation = useMutation({
        mutationFn: (data: any) => api.createFacility(orgSlug, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['admin-facilities', orgSlug] });
            toast.success("Facility created successfully");
            setIsCreateOpen(false);
            resetForm();
        },
        onError: () => toast.error("Failed to create facility")
    });

    const updateMutation = useMutation({
        mutationFn: ({ id, data }: { id: string, data: any }) => api.updateFacility(orgSlug, id, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['admin-facilities', orgSlug] });
            toast.success("Facility updated successfully");
            setIsEditing(null);
            resetForm();
        },
        onError: () => toast.error("Failed to update facility")
    });

    const deleteMutation = useMutation({
        mutationFn: (id: string) => api.deleteFacility(orgSlug, id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['admin-facilities', orgSlug] });
            toast.success("Facility deleted");
        },
        onError: () => toast.error("Failed to delete facility")
    });

    const resetForm = () => {
        setName("");
        setDescription("");
        setLocation("");
        setImageUrl("");
    };

    const handleEdit = (facility: any) => {
        setName(facility.name);
        setDescription(facility.description || "");
        setLocation(facility.location || "");
        // Handle array of images, just take first for now or empty
        setImageUrl(facility.imageUrls?.[0] || "");
        setIsEditing(facility.id);
        setIsCreateOpen(true);
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const data = {
            name,
            description,
            location,
            imageUrls: imageUrl ? [imageUrl] : []
        };

        if (isEditing) {
            updateMutation.mutate({ id: isEditing, data });
        } else {
            createMutation.mutate(data);
        }
    };

    if (isLoading) {
        return <div className="flex justify-center p-8"><Loader2 className="animate-spin" /></div>;
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-3xl font-display font-bold tracking-tight">Facilities</h2>
                    <p className="text-muted-foreground">Manage your organization's facilities.</p>
                </div>
                <Dialog open={isCreateOpen} onOpenChange={(open) => {
                    setIsCreateOpen(open);
                    if (!open) {
                        setIsEditing(null);
                        resetForm();
                    }
                }}>
                    <DialogTrigger asChild>
                        <Button>
                            <Plus className="mr-2 h-4 w-4" />
                            Add Facility
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[500px]">
                        <form onSubmit={handleSubmit}>
                            <DialogHeader>
                                <DialogTitle>{isEditing ? "Edit Facility" : "Create Facility"}</DialogTitle>
                                <DialogDescription>
                                    Add details for the facility. Images can be uploaded below.
                                </DialogDescription>
                            </DialogHeader>
                            <div className="grid gap-4 py-4">
                                <div className="space-y-2">
                                    <Label>Facility Image</Label>
                                    <div className="flex justify-center p-4 border-2 border-dashed rounded-lg">
                                        <ImageUpload
                                            name="Facility"
                                            currentImageUrl={imageUrl}
                                            uploadMode="generic"
                                            onUploadComplete={(url) => setImageUrl(url)}
                                        />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="name">Name</Label>
                                    <Input id="name" value={name} onChange={e => setName(e.target.value)} required placeholder="e.g. Main Badminton Hall" />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="location">Location</Label>
                                    <Input id="location" value={location} onChange={e => setLocation(e.target.value)} placeholder="Building A, Level 2" />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="desc">Description</Label>
                                    <Textarea id="desc" value={description} onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setDescription(e.target.value)} placeholder="Brief description..." />
                                </div>
                            </div>
                            <DialogFooter>
                                <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                                    {(createMutation.isPending || updateMutation.isPending) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                    {isEditing ? "Update" : "Create"}
                                </Button>
                            </DialogFooter>
                        </form>
                    </DialogContent>
                </Dialog>
            </div>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {facilities?.map((facility: any) => (
                    <Card key={facility.id} className="overflow-hidden">
                        <div className="aspect-video relative bg-muted flex items-center justify-center">
                            {facility.imageUrls?.[0] ? (
                                <img
                                    src={facility.imageUrls[0].startsWith('http') ? facility.imageUrls[0] : `/api/uploads/image/${facility.imageUrls[0].split('/').pop()}`} // Hacky fix for relative path matching
                                    alt={facility.name}
                                    className="w-full h-full object-cover"
                                />
                            ) : (
                                <ImageIcon className="h-12 w-12 text-muted-foreground/30" />
                            )}
                        </div>
                        <CardHeader>
                            <CardTitle>{facility.name}</CardTitle>
                            <CardDescription className="flex items-center gap-1">
                                <MapPin className="h-3 w-3" />
                                {facility.location || "No location set"}
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <p className="text-sm text-muted-foreground line-clamp-2">
                                {facility.description || "No description provided."}
                            </p>
                        </CardContent>
                        <CardFooter className="flex justify-end gap-2 border-t bg-muted/20 p-4">
                            <Button variant="ghost" size="sm" onClick={() => handleEdit(facility)}>
                                <Edit2 className="h-4 w-4" />
                            </Button>
                            <Button
                                variant="ghost"
                                size="sm"
                                className="text-destructive hover:bg-destructive/10"
                                onClick={() => {
                                    if (confirm("Are you sure? This will delete all spaces and bookings.")) {
                                        deleteMutation.mutate(facility.id);
                                    }
                                }}
                            >
                                <Trash2 className="h-4 w-4" />
                            </Button>
                        </CardFooter>
                    </Card>
                ))}
            </div>
        </div>
    );
}
