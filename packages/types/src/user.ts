export interface User {
    id: string;
    email: string;
    name: string;
    avatarUrl?: string;
    role: UserRole;
    orgId: string;
    createdAt: Date;
    updatedAt: Date;
}

export type UserRole = 'ADMIN' | 'MEMBER';

export interface UserPublic {
    id: string;
    name: string;
    avatarUrl?: string;
    role: UserRole;
}

export interface UpdateUserRoleInput {
    role: UserRole;
}
