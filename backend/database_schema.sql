-- Multi-Tenant Task Management System
-- Core Schema Definition

-- 1. Ensure uuid generation extension is available
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Define Enum types for data integrity (No redundant string checks)
CREATE TYPE role_enum AS ENUM ('ADMIN', 'MEMBER');
CREATE TYPE status_enum AS ENUM ('PENDING', 'IN_PROGRESS', 'COMPLETED', 'OVERDUE');
CREATE TYPE priority_enum AS ENUM ('LOW', 'MEDIUM', 'HIGH');

-- ==========================================
-- SYSTEM TABLES
-- ==========================================

-- 3. ORGANIZATIONS (Top level tenant)
CREATE TABLE organizations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4. USERS
-- Every user belongs to one organization strictly.
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255), -- Nullable for users who authenticate only via OAuth
    google_id VARCHAR(255) UNIQUE,
    role role_enum DEFAULT 'MEMBER',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP WITH TIME ZONE -- Used for soft deleting users
);

-- 5. TASKS
CREATE TABLE tasks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    status status_enum DEFAULT 'PENDING',
    priority priority_enum DEFAULT 'MEDIUM',
    due_date TIMESTAMP WITH TIME ZONE,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,     -- Null if user is deleted hard (or soft)
    assigned_to UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP WITH TIME ZONE -- Soft delete tasks so history is kept
);

-- ==========================================
-- LOGGING & COMMUNICATION
-- ==========================================

-- 6. ACTIVITY LOGS
-- Immutable log of actions
CREATE TABLE activity_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    action VARCHAR(50) NOT NULL, -- Examples: 'CREATED', 'UPDATED_STATUS', 'ASSIGNED', 'DELETED'
    performed_by UUID NULL REFERENCES users(id) ON DELETE SET NULL,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 7. NOTIFICATIONS
CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    message TEXT NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 8. INVITATIONS
-- Allows inviting members to an existing organization
CREATE TABLE invitations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    email VARCHAR(255) NOT NULL,
    token VARCHAR(255) UNIQUE NOT NULL,
    invited_by UUID REFERENCES users(id) ON DELETE CASCADE,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    is_accepted BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ==========================================
-- INDEXES (For Performance and Multi-Tenant Scaling)
-- ==========================================

-- Fast lookups of users per organization
CREATE INDEX idx_users_org ON users(organization_id);

-- Highly utilized task queries (dashboard filtering and isolation)
CREATE INDEX idx_tasks_org_status ON tasks(organization_id, status);
CREATE INDEX idx_tasks_assigned_to ON tasks(assigned_to);

-- Overdue task scans for background cron job
CREATE INDEX idx_tasks_due_date ON tasks(due_date) WHERE status != 'COMPLETED';

-- Fast pagination for activity logs within a specific task/tenant
CREATE INDEX idx_logs_org_task ON activity_logs(organization_id, task_id);

-- Retrieve unread notifications fast
CREATE INDEX idx_notifications_user_unread ON notifications(user_id, is_read);
