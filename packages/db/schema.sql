-- Squad Draw Database Schema
-- Run this against your PostgreSQL database to create all tables

-- Drop existing tables if they exist (order matters due to foreign keys)
DROP TABLE IF EXISTS messages CASCADE;
DROP TABLE IF EXISTS shapes CASCADE;
DROP TABLE IF EXISTS room_members CASCADE;
DROP TABLE IF EXISTS rooms CASCADE;
DROP TABLE IF EXISTS session CASCADE;
DROP TABLE IF EXISTS account CASCADE;
DROP TABLE IF EXISTS verification CASCADE;
DROP TABLE IF EXISTS "user" CASCADE;

-- Drop existing enums
DROP TYPE IF EXISTS room_member_role CASCADE;
DROP TYPE IF EXISTS shape_type CASCADE;

-- Create enums
CREATE TYPE room_member_role AS ENUM ('ADMIN', 'MEMBER');
CREATE TYPE shape_type AS ENUM ('RECTANGLE', 'DIAMOND', 'ELLIPSE', 'LINE', 'ARROW', 'FREEDRAW', 'TEXT', 'IMAGE');

-- Users table (simplified, no more better-auth fields)
CREATE TABLE users (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    email_verified BOOLEAN NOT NULL DEFAULT false,
    image TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Sessions table (simplified)
CREATE TABLE sessions (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    token TEXT NOT NULL UNIQUE,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_sessions_token ON sessions(token);
CREATE INDEX idx_sessions_user_id ON sessions(user_id);

-- Rooms table
CREATE TABLE rooms (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    name TEXT NOT NULL DEFAULT 'Untitled Room',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    owner_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    is_shared BOOLEAN NOT NULL DEFAULT false
);

-- Room members table
CREATE TABLE room_members (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    role room_member_role NOT NULL DEFAULT 'MEMBER',
    joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    room_id TEXT NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
    UNIQUE(user_id, room_id)
);

-- Shapes table
CREATE TABLE shapes (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    type shape_type NOT NULL,
    data_from_rough_js JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    room_id TEXT NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
    creator_id TEXT NOT NULL REFERENCES users(id)
);

-- Messages table
CREATE TABLE messages (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    message TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    room_id TEXT NOT NULL REFERENCES rooms(id) ON DELETE CASCADE
);

-- Indexes for performance
CREATE INDEX idx_room_members_user_id ON room_members(user_id);
CREATE INDEX idx_room_members_room_id ON room_members(room_id);
CREATE INDEX idx_room_members_room_user ON room_members(room_id, user_id);
CREATE INDEX idx_shapes_room_id ON shapes(room_id);
CREATE INDEX idx_shapes_room_created ON shapes(room_id, created_at);
CREATE INDEX idx_messages_room_id ON messages(room_id);
CREATE INDEX idx_messages_room_created ON messages(room_id, created_at);
CREATE INDEX idx_messages_created_at ON messages(created_at);
CREATE INDEX idx_shapes_created_at ON shapes(created_at);
CREATE INDEX idx_rooms_owner_id ON rooms(owner_id);
