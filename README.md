# Squad Draw - Real-time Collaborative Drawing Application

## Project Overview

Squad Draw is a full-stack real-time collaborative drawing application built as a monorepo. Users can create rooms, invite others, and draw together in real-time with various shapes and tools.

### Architecture

- **apps/web**: Next.js 15 full-stack application with integrated API routes

- **apps/ws-server**: WebSocket server for real-time collaboration (Socket.IO)
- **packages/**: Shared code (database, schemas, UI components, configuration)

---

## 🚀 Features

### Drawing & Collaboration

- **Real-time Drawing**: Multiple users can draw simultaneously
- **Shape Tools**: Ellipse, Rectangle, Line, Diamond, Arrow, Free Draw
- **Drawing Options**: Customizable stroke, fill, opacity, roughness, and line styles
  - **Live Updates**: Real-time synchronization of all drawing actions
- **Save Canvas as Image**: Download the current canvas as a PNG image with a single click

### Room Management

- **Create Rooms**: Users can create private or shared rooms
- **Join Rooms**: Join existing rooms via room ID or share link
- **Room Permissions**: Owner, Admin, and Member role system
- **Member Management**: Kick, promote, and demote members
- **Room Sharing**: Generate shareable links for room access

### User Experience & Security

- **Premium PC Dashboard**: Highly-productive split-pane architecture featuring a sidebar, glassmorphic effects, and interactive data sheets.
- **Robust Security**: Edge-compatible API validation directly in the middleware to strictly verify opaque session tokens.
- **Authentication**: Secure JWT-based custom authentication system.
- **Responsive Design**: Gracefully adapts from a desktop workspace down to a mobile-friendly stacked layout.
- **Dark/Light Theme**: Seamless toggle between themes.
- **Real-time Chat**: Group chat functionality embedded within rooms.
- **Notifications**: Subtle toast notifications for user actions.
- **Whiteboard Controls**: Admins can clear all shapes with a confirmation modal.

---

## 🛠 Technical Stack

### Frontend

- **Framework**: Next.js 15 with React 19
- **Styling**: Tailwind CSS with custom component system
- **State Management**: Zustand for global state
- **Canvas**: RoughJS for hand-drawn style graphics
- **UI Components**: Radix UI primitives with custom styling
- **Forms**: React Hook Form with Zod validation

### Backend

- **API**: Next.js API routes with TypeScript
- **Database**: PostgreSQL (raw SQL queries with `pg` driver)
- **Authentication**: Secure JWT-based custom authentication system with robust session management
- **WebSocket**: Socket.IO for real-time communication
- **Validation**: Zod schemas for type-safe validation

### Development

- **Monorepo**: Turborepo for efficient building and development
- **Package Manager**: pnpm with workspace support
- **TypeScript**: Full TypeScript implementation
- **Linting**: ESLint with custom configurations
- **Database**: Schema execution via raw `schema.sql`

---

## 📁 Project Structure

### apps/web (Main Application)

- **Status**: - Full-stack Next.js application
- **Features**:
  - Complete room management system
  - Real-time collaborative drawing
  - User authentication and authorization
  - Responsive UI with theme support
  - Member management and permissions
  - Room sharing functionality

### apps/ws-server (WebSocket Server)

- **Status**:  - Real-time communication server
- **Features**:
  - Socket.IO server for real-time events
  - Room-based communication
  - Drawing synchronization
  - User presence tracking
  - Authentication middleware


### packages/db

- **Driver**: PostgreSQL with `pg` library
- **Schema**: User, Room, RoomMember, shapes, and messages
- **Migrations**: Seeded directly from `schema.sql`

### packages/schemas

- **Validation**: Zod schemas for all data validation
- **Types**: TypeScript types inferred from schemas
- **Schemas**: User, Room, Drawing, and API validation schemas

### packages/config, typescript-config, eslint-config

- **Shared Configuration**: Centralized config for all packages
- **TypeScript**: Consistent type checking across monorepo
- **ESLint**: Shared linting rules and standards

---

## 🚀 Getting Started

### Prerequisites

- Node.js 18 or higher
- pnpm (recommended package manager)
- PostgreSQL database

### Installation

1. Clone the repository:

```bash
git clone https://github.com/hit-7624/squad-draw.git
cd squad-draw
```

2. Install dependencies:

```bash
pnpm install
```

3. Set up environment variables:

```bash
# Copy environment files and configure
cp apps/web/.env.example apps/web/.env.local
cp apps/ws-server/.env.example apps/ws-server/.env
```

4. Set up the database:

```bash
cd packages/db
pnpm db:push
```

5. Start development servers:

```bash
pnpm dev
```

### Development Commands

```bash
# Start all development servers
pnpm dev

# Build all packages
pnpm build

# Run linting
pnpm lint

# Type checking
pnpm check-types

# Format code
pnpm format
```

---

## 🔧 Environment Configuration

### Web App (.env.local)

```env
DATABASE_URL="postgresql://..."
NEXT_PUBLIC_WS_URL="http://localhost:3001"
```

### WebSocket Server (.env)

```env
DATABASE_URL="postgresql://..."
PORT=3001
ALLOWED_ORIGINS="http://localhost:3000"
```

---

## 🎨 Usage

1. **Create Account**: Sign up for a new account or sign in
2. **Create Room**: Create a new drawing room
3. **Invite Others**: Share the room link or ID with collaborators
4. **Start Drawing**: Use the shape tools to draw on the canvas
5. **Save Canvas**: Click the save button to download your drawing as a PNG image
6. **Collaborate**: See real-time updates from other users
7. **Manage Room**: Use admin features to manage members and settings

---

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## 📄 License

This project is open source and available under the [MIT License](LICENSE).

---

## 🔗 Links

- **Repository**: [GitHub](https://github.com/hit-7624/squad-draw)
- **Issues**: [GitHub Issues](https://github.com/hit-7624/squad-draw/issues)
- **Discussions**: [GitHub Discussions](https://github.com/hit-7624/squad-draw/discussions)
