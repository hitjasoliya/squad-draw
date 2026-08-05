# Example Environment Variables

```env
ORIGIN_URL=http://localhost:3000
DATABASE_URL=postgresql://postgres@localhost:5432/db1
```

# WebSocket Server - Real-time Communication

## Overview

The WebSocket server for Squad Draw provides real-time communication capabilities for collaborative drawing. Built with Socket.IO, it handles real-time synchronization of drawing actions, user presence, and chat functionality.

## 🚀 Features

### Real-time Communication

- **Drawing Synchronization**: Real-time sharing of drawing actions
- **User Presence**: Track online users in each room
- **Chat Messages**: Real-time group chat within rooms
- **Room Events**: Join/leave room notifications
- **Shape Updates**: Live synchronization of canvas shapes

### Authentication & Security

- **Auth Middleware**: Custom authentication for socket connections
- **Room-based Access**: Users can only join rooms they're members of
- **Permission Checks**: Validate user permissions for actions
- **Secure Connections**: CORS and origin validation

### Event Handling

- **Connection Management**: Handle user connections and disconnections
- **Room Management**: Join/leave room functionality
- **Content Events**: Share drawings, messages, and shapes
- **Error Handling**: Comprehensive error handling with user feedback

## 🛠 Technical Implementation

### Core Technologies

- **Socket.IO**: WebSocket library for real-time communication
- **Node.js**: JavaScript runtime
- **TypeScript**: Type-safe development
- **Prisma**: Database ORM for user and room validation

### Socket Events

#### Connection Events

- `connection`: New user connects
- `disconnect`: User disconnects
- `join-room`: User joins a specific room
- `leave-room`: User leaves a room

#### Drawing Events

- `new-shape`: New shape drawn on canvas
- `clear-shapes`: All shapes cleared from canvas
- `canvas-update`: General canvas updates

#### Chat Events

- `new-message`: New chat message in room
- `message-history`: Request chat history

#### Membership Events

- `member-joined`: New member joined room
- `member-left`: Member left room
- `member-promoted`: Member promoted to admin
- `member-demoted`: Member demoted from admin
- `member-kicked`: Member kicked from room

## 📁 Project Structure

```
src/
├── index.ts              # Main server entry point
├── handlers/             # Event handlers
│   ├── connection.handlers.ts    # Connection management
│   ├── content.handlers.ts       # Drawing and chat
│   └── membership.handlers.ts    # Room membership
├── middlewares/          # Socket middlewares
│   └── auth.middleware.ts        # Authentication
└── types/               # TypeScript types
    └── user.ts          # User-related types
```

## 🔧 Configuration

### Environment Variables

```env
DATABASE_URL="postgresql://..."
PORT=3001
ALLOWED_ORIGINS="http://localhost:3000,https://yourdomain.com"
NODE_ENV="development"
```

### CORS Configuration

- Configurable allowed origins
- Credentials support for authentication
- Development and production modes

## 🎯 Event Handlers

### Connection Handler (`connection.handlers.ts`)

```typescript
// Handle user authentication and room joining
export const connectionHandler = async (socket: Socket, data: any) => {
  // Validate user authentication
  // Check room membership
  // Add user to room
  // Notify other users
};
```

### Content Handler (`content.handlers.ts`)

```typescript
// Handle drawing and chat events
export const newShapeHandler = async (socket: Socket, data: ShapeData) => {
  // Validate shape data
  // Save to database
  // Broadcast to room members
};

export const clearShapesHandler = async (socket: Socket, data: any) => {
  // Check admin permissions
  // Clear shapes from database
  // Notify all room members
};

export const newMessageHandler = async (socket: Socket, data: MessageData) => {
  // Validate message
  // Save to database
  // Broadcast to room
};
```

### Membership Handler (`membership.handlers.ts`)

```typescript
// Handle room membership changes
export const memberJoinedHandler = async (socket: Socket, data: any) => {
  // Update room membership
  // Notify existing members
};

export const memberKickedHandler = async (socket: Socket, data: any) => {
  // Check admin permissions
  // Remove member from room
  // Notify affected users
};
```

## 🔐 Authentication Middleware

### Auth Middleware (`auth.middleware.ts`)

```typescript
export const authMiddleware = async (socket: Socket, next: Function) => {
  try {
    // Extract token from socket handshake
    // Validate JWT token
    // Attach user data to socket
    // Allow connection
    next();
  } catch (error) {
    // Reject connection
    next(new Error("Authentication failed"));
  }
};
```

## 🚀 Development

### Prerequisites

- Node.js 18+
- pnpm package manager
- PostgreSQL database (shared with web app)

### Setup

1. Install dependencies: `pnpm install`
2. Set up environment variables in `.env`
3. Start development: `pnpm dev`

### Scripts

```bash
pnpm dev          # Start development server with auto-reload
pnpm build        # Build TypeScript to JavaScript
pnpm start        # Start production server
pnpm lint         # Run ESLint
pnpm check-types  # TypeScript type checking
```

## 🔗 Integration

### Web Application

- Connects to Next.js web app for user authentication
- Shares database schema for consistency
- Validates user permissions against room membership

### Database Integration

- Uses `@repo/db` package for Prisma operations
- Validates room membership before allowing actions
- Stores chat messages and drawing data
- Maintains user session information

### Shared Packages

- **@repo/db**: Database operations and types
- **@repo/typescript-config**: TypeScript configuration
- \*\*@repo/

## 📊 Performance

### Optimization Features

- **Room-based Broadcasting**: Only send events to relevant users
- **Connection Pooling**: Efficient database connection management
- **Event Throttling**: Prevent spam and reduce server load
- **Memory Management**: Clean up disconnected users

### Monitoring

- Connection count tracking
- Room activity monitoring
- Error logging and handling
- Performance metrics collection

## 🛡️ Security

### Security Measures

- **JWT Authentication**: Secure token-based authentication
- **Origin Validation**: CORS protection
- **Rate Limiting**: Prevent abuse and spam
- **Permission Checks**: Validate user permissions for actions
- **Input Validation**: Sanitize and validate all incoming data

## 📈 Scalability

### Horizontal Scaling

- **Redis Adapter**: Support for multiple server instances
- **Load Balancing**: Distribute connections across servers
- **Session Sharing**: Shared session store for consistency

### Future Enhancements

- Message queuing for high-traffic scenarios
- Database sharding for large-scale deployments
- CDN integration for static content
- Advanced caching strategies

---

## 🔧 Usage

The WebSocket server automatically starts when running the development environment. It integrates seamlessly with the web application to provide real-time features:

1. **User Connection**: Authenticated users connect automatically
2. **Room Joining**: Users join rooms they have access to
3. **Real-time Drawing**: Drawing actions are synchronized instantly
4. **Chat Communication**: Messages are delivered in real-time
5. **Presence Updates**: User online/offline status is tracked
