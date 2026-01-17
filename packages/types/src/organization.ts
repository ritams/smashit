export interface Organization {
    id: string;
    name: string;
    slug: string;
    timezone: string;
    settings: OrganizationSettings;
    createdAt: Date;
    updatedAt: Date;
}

export interface OrganizationSettings {
    brandColor?: string;
    logoUrl?: string;
}

export interface CreateOrganizationInput {
    name: string;
    slug: string;
    timezone?: string;
}

export interface OrganizationPublic {
    id: string;
    name: string;
    slug: string;
    timezone: string;
    settings: OrganizationSettings;
}
