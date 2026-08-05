/**
 * @type {import('node-pg-migrate').ColumnDefinitions | undefined}
 */
exports.shorthands = undefined;

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void}
 */
exports.up = (pgm) => {
  pgm.sql(`
    CREATE EXTENSION IF NOT EXISTS "pgcrypto";

    CREATE TABLE IF NOT EXISTS users (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name VARCHAR(255) NOT NULL,
      email VARCHAR(255) UNIQUE NOT NULL,
      password_hash VARCHAR(255) NOT NULL,
      token_version INTEGER NOT NULL DEFAULT 0,
      image TEXT,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS rooms (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name VARCHAR(255) NOT NULL,
      is_shared BOOLEAN DEFAULT false,
      owner_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS room_members (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      role VARCHAR(20) NOT NULL DEFAULT 'MEMBER',
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      room_id UUID NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
      joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      UNIQUE (user_id, room_id)
    );

    CREATE TABLE IF NOT EXISTS shapes (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      type VARCHAR(50) NOT NULL,
      data_from_rough_js JSONB NOT NULL,
      room_id UUID NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
      creator_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS messages (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      message TEXT NOT NULL,
      room_id UUID NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
    CREATE INDEX IF NOT EXISTS idx_rooms_owner_id ON rooms(owner_id);
    CREATE INDEX IF NOT EXISTS idx_room_members_user_id ON room_members(user_id);
    CREATE INDEX IF NOT EXISTS idx_room_members_room_id ON room_members(room_id);
    CREATE INDEX IF NOT EXISTS idx_shapes_room_id ON shapes(room_id);
    CREATE INDEX IF NOT EXISTS idx_messages_room_id ON messages(room_id);
  `);
};

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void}
 */
exports.down = (pgm) => {
  pgm.sql(`
    DROP TABLE IF EXISTS messages;
    DROP TABLE IF EXISTS shapes;
    DROP TABLE IF EXISTS room_members;
    DROP TABLE IF EXISTS rooms;
    DROP TABLE IF EXISTS users;
  `);
};
