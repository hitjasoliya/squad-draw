# Web App - Squad Draw Frontend

## Overview

The main Squad Draw application built with Next.js 15 and React 19. This is a full-stack application that includes both the frontend interface and backend API routes for the collaborative drawing platform.

## 🚀 Features

### Drawing & Canvas

- **Real-time Collaborative Drawing**: Multiple users can draw simultaneously
- **Shape Tools**: Ellipse, Rectangle, Line, Diamond, Arrow, Free Draw
- **Drawing Customization**:
  - Stroke color and width
  - Fill color and opacity
  - Roughness levels (0-4)
  - Line styles (solid, dashed, dotted, dash-dot, long dash)
- **Save Canvas as Image**: Download the current canvas as a PNG image

### Room Management

- **Room Creation**: Create private or shared rooms
- **Room Dashboard**: View and manage all your rooms
- **Member Management**: Kick, promote, and demote members
- **Role-based Permissions**: Owner, Admin, and Member roles
- **Room Sharing**: Generate and manage shareable room links
- **Clear Canvas**: Admin/Owner can clear all shapes with confirmation modal

### User Interface

- **Responsive Design**: Works on desktop and mobile devices
- **Dark/Light Theme**: Toggle between themes with system preference support
- **Control Panel**: Floating control panel for drawing options
- **Shape Selector**: Easy-to-use shape selection tool
- **Real-time Chat**: Group chat functionality within rooms
- **Notifications**: Toast notifications for user actions and updates

### Authentication & Security

- **Better Auth Integration**: Secure authentication system
- **Session Management**: Persistent user sessions
- **Protected Routes**: Middleware for route protection
- **Role-based Access**: Different permissions for different user roles

## 🛠 Technical Implementation

### Frontend Stack

- **Framework**: Next.js 15 with App Router
- **React**: React 19 with modern hooks and patterns
- **Styling**: Tailwind CSS with custom component system
- **Canvas**: RoughJS for hand-drawn style graphics
- **UI Components**: Radix UI primitives with custom styling
- **Icons**: Lucide React icons
- **Theme**: Next-themes for dark/light mode

### State Management

- **Zustand**: Global state management for:
  - Room state and real-time updates
  - User authentication state
  - Drawing options and canvas state
  - Notification system

### Real-time Communication

- **Socket.IO Client**: Real-time communication with WebSocket server
- **Event Handling**:
  - Drawing synchronization
  - Room membership updates
  - User presence tracking
  - Chat messages

### API Integration

- **Next.js API Routes**: Internal API for all backend operations
- **Type-safe APIs**: Full TypeScript integration
- **Error Handling**: Comprehensive error handling with user feedback
- **Validation**: Zod schemas for request/response validation

## 📁 Project Structure

```
src/
├── app/                    # Next.js App Router
│   ├── (pages)/           # Main application pages
│   │   ├── dashboard/     # Dashboard page
│   │   ├── room/          # Room pages
│   │   ├── login/         # Authentication pages
│   │   └── layout.tsx     # Main layout
│   ├── api/               # API routes
│   │   ├── auth/          # Authentication endpoints
│   │   ├── rooms/         # Room management
│   │   └── users/         # User management
│   └── globals.css        # Global styles
├── components/            # React components
│   ├── ui/               # Reusable UI components
│   ├── auth/             # Authentication components
│   ├── dashboard/        # Dashboard components
│   ├── ControlPanel.tsx  # Drawing controls
│   ├── ShapeSelector.tsx # Shape selection
│   └── GroupChatbot.tsx  # Chat functionality
├── hooks/                # Custom React hooks
├── lib/                  # Utility functions
├── store/                # Zustand stores
└── middleware.ts         # Next.js middleware
```

## 🔧 API Routes

### Authentication (`/api/auth/`)

- **POST** `/api/auth/login` - User login
- **POST** `/api/auth/register` - User registration
- **POST** `/api/auth/logout` - User logout
- **GET** `/api/auth/session` - Get current session

### Room Management (`/api/rooms/`)

- **GET** `/api/rooms` - Get user's rooms
- **POST** `/api/rooms` - Create new room
- **GET** `/api/rooms/[id]` - Get room details
- **PUT** `/api/rooms/[id]` - Update room
- **DELETE** `/api/rooms/[id]` - Delete room
- **POST** `/api/rooms/[id]/join` - Join room
- **POST** `/api/rooms/[id]/leave` - Leave room
- **POST** `/api/rooms/[id]/share` - Share room
- **DELETE** `/api/rooms/[id]/share` - Unshare room

### Member Management (`/api/rooms/[id]/members/`)

- **GET** `/api/rooms/[id]/members` - Get room members
- **POST** `/api/rooms/[id]/members/[userId]/kick` - Kick member
- **POST** `/api/rooms/[id]/members/[userId]/promote` - Promote to admin
- **POST** `/api/rooms/[id]/members/[userId]/demote` - Demote from admin

### Shapes (`/api/rooms/[id]/shapes/`)

- **GET** `/api/rooms/[id]/shapes` - Get room shapes
- **POST** `/api/rooms/[id]/shapes` - Add new shape
- **DELETE** `/api/rooms/[id]/shapes` - Clear all shapes

## 🎨 Components

### Core Components

- **ControlPanel**: Floating panel for drawing options
- **ShapeSelector**: Tool selection interface
- **GroupChatbot**: Real-time chat interface
- **ThemeToggle**: Dark/light theme switcher

### UI Components

- **Button**: Custom button with variants
- **Card**: Container component
- **Modal**: Confirmation dialogs
- **Badge**: Status indicators
- **Dialog**: Radix UI dialog wrapper

### Dashboard Components

- **RoomCard**: Room management interface
- **MemberCard**: Member management interface

## 🚀 Development

### Prerequisites

- Node.js 18+
- pnpm package manager
- PostgreSQL database

### Setup

1. Install dependencies: `pnpm install`
2. Set up environment variables in `.env.local`
3. Run database migrations: `pnpm db:push`
4. Start development: `pnpm dev`

### Environment Variables

```env
# =========================
# API & App URLs
# =========================
NEXT_PUBLIC_API_URL=http://localhost:3001
NEXT_PUBLIC_BASE_URL=http://localhost:3000
NEXT_PUBLIC_WEBSOCKET_URL=http://localhost:3002
BETTER_AUTH_URL=http://localhost:3000

# =========================
# Authentication Secrets
# =========================
BETTER_AUTH_SECRET=your-better-auth-secret

# =========================
# Database
# =========================
DATABASE_URL="postgresql://user:password@localhost:5432/dbname"

# =========================
# OAuth / Social Login
# =========================
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
GITHUB_CLIENT_ID=your-github-client-id
GITHUB_CLIENT_SECRET=your-github-client-secret

# =========================
# Email Configuration (Gmail)
# =========================
EMAIL_FROM="Squad Draw <your-email@gmail.com>"
EMAIL_USER="your-email@gmail.com"
EMAIL_PASS="your-app-password"

# =========================
# Rate Limiting
# =========================
RATE_LIMIT_WINDOW=60
RATE_LIMIT_MAX=100
VERIFICATION_EMAIL_RATE_LIMIT_WINDOW=3600
VERIFICATION_EMAIL_RATE_LIMIT_MAX=2

# =========================
# App Limits
# =========================
NEXT_PUBLIC_MAX_CREATED_ROOMS=3
```

### Scripts

```bash
pnpm dev          # Start development server
pnpm build        # Build for production
pnpm start        # Start production server
pnpm lint         # Run ESLint
pnpm check-types  # TypeScript type checking
```

## 🔗 Integration

### WebSocket Server

- Connects to `apps/ws-server` for real-time features
- Handles drawing synchronization and user presence
- Room-based communication

### Database

- Uses `@repo/db` package for Prisma integration
- Shared database schema across monorepo
- Type-safe database operations

### Shared Packages

- **@repo/db**: Database operations
- **@repo/eslint-config**: Linting configuration
- **@repo/typescript-config**: TypeScript configuration

---

## 📱 Usage

1. **Authentication**: Sign up or log in to access the application
2. **Dashboard**: View and manage your rooms from the dashboard
3. **Room Creation**: Create new rooms with custom settings
4. **Drawing**: Use various tools to draw on the collaborative canvas
5. **Save Canvas**: Download your current drawing as a PNG image
6. **Collaboration**: Invite others and draw together in real-time
7. **Room Management**: Manage members, permissions, and room settings
