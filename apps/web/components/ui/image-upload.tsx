"use client";

import { useState, useRef } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowUpFromLine, Loader2, X } from "lucide-react";
import { getInitials } from "@/lib/utils";
import { toast } from "sonner";
import { api } from "@/lib/api-client";
import { useQueryClient } from "@tanstack/react-query";
import { API_URL } from "@/lib/config";

interface ImageUploadProps {
    currentImageUrl?: string | null;
    name: string;
    onUploadComplete?: (newUrl: string) => void;
    uploadMode?: 'profile' | 'generic';
}

export function ImageUpload({ currentImageUrl, name, onUploadComplete, uploadMode = 'profile' }: ImageUploadProps) {
    const [isUploading, setIsUploading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const queryClient = useQueryClient();

    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Validation
        if (!file.type.startsWith("image/")) {
            toast.error("Please select a valid image file");
            return;
        }

        if (file.size > 5 * 1024 * 1024) { // 5MB limit
            toast.error("Image size should be less than 5MB");
            return;
        }

        try {
            setIsUploading(true);
            const formData = new FormData();
            formData.append("image", file);

            let resultUrl: string;

            if (uploadMode === 'profile') {
                const result = await api.uploadProfileImage(formData);
                resultUrl = result.avatarUrl;
                toast.success("Profile image updated");
                queryClient.invalidateQueries({ queryKey: ['user'] });
            } else {
                const result = await api.uploadFile(formData);
                resultUrl = result.url;
                toast.success("Image uploaded");
            }

            if (onUploadComplete && resultUrl) {
                onUploadComplete(resultUrl);
            }
        } catch (error) {
            console.error("Upload failed", error);
            toast.error("Failed to upload image. Please try again.");
        } finally {
            setIsUploading(false);
            if (fileInputRef.current) {
                fileInputRef.current.value = "";
            }
        }
    };

    const getFullImageUrl = (url?: string | null) => {
        if (!url) return '';
        if (url.startsWith('http')) return url;
        // If relative path from API, prepend API_URL
        return `${API_URL}${url}`;
    };

    return (
        <div className="flex flex-col items-center gap-4">
            <div className="relative group">
                <Avatar className="h-32 w-32 border-4 border-background shadow-lg">
                    <AvatarImage
                        src={getFullImageUrl(currentImageUrl)}
                        alt={name}
                        className="object-cover"
                    />
                    <AvatarFallback className="text-3xl bg-primary/10 text-primary">
                        {getInitials(name)}
                    </AvatarFallback>
                </Avatar>

                <div className="absolute bottom-0 right-0">
                    <Button
                        size="icon"
                        variant="secondary"
                        className="rounded-full shadow-md h-9 w-9"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isUploading}
                    >
                        {isUploading ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                            <ArrowUpFromLine className="h-4 w-4" />
                        )}
                        <span className="sr-only">Upload image</span>
                    </Button>
                </div>
            </div>

            <Input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleFileSelect}
            />

            <p className="text-xs text-muted-foreground text-center">
                Allowed: JPG, PNG. Max size: 5MB.
            </p>
        </div>
    );
}
