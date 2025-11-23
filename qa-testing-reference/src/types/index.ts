// This file defines TypeScript types and interfaces used throughout the application.

export type Role = 'superAdmin' | 'orgAdmin' | 'departmentManager' | 'teamLead' | 'agent' | 'auditor' | 'externalClient';

export interface User {
    id: string;
    email: string;
    username: string;
    role: Role;
    passwordHash: string;
}

export interface Client {
    id: string;
    name: string;
    createdById: string;
    status: 'pending' | 'active' | 'inactive';
}

export interface Thread {
    id: string;
    title: string;
    createdById: string;
}

export interface ThreadMember {
    threadId: string;
    userId: string;
    role: 'moderator' | 'member';
    isActive: boolean;
}

export interface ApprovalWorkflow {
    id: string;
    initiatorId: string;
    reviewerId: string;
    approverId: string;
    finalApproverId: string;
    status: 'pending' | 'approved' | 'rejected';
    createdAt: Date;
    updatedAt: Date;
}

export interface AuditLog {
    id: string;
    action: string;
    userId: string;
    timestamp: Date;
    details: string;
}