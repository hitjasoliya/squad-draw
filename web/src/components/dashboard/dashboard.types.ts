export interface User {
  id: string;
  name: string;
  email: string;
  emailVerified?: boolean;
  image?: string | null;
  createdAt?: string | Date;
  updatedAt?: string | Date;
}

export interface Room {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  isShared: boolean;
  owner: {
    id: string;
    name: string;
    email: string;
  };
  userRole: "ADMIN" | "MEMBER";
  memberCount: number;
  shapeCount: number;
  messageCount: number;
}

export interface Member {
  id: string;
  name: string;
  email: string;
  role: "ADMIN" | "MEMBER";
  isOwner: boolean;
}

export interface Message {
  id: string;
  message: string;
  createdAt: string;
  user: {
    id: string;
    name: string;
    email: string;
  };
  roomId: string;
  userId: string;
}

export interface OnlineMember {
  userId: string;
  socketId: string;
}
