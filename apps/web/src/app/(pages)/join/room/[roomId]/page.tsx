"use client";
import { useEffect, use } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "@/lib/auth-client";
import { useState } from "react";

const JoinRoomPage = ({ params }: { params: Promise<{ roomId: string }> }) => {
  const router = useRouter();
  const { data: session, isPending: status } = useSession();
  const { roomId } = use(params);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (status) return;
    if (!session) {
      router.replace(`/signin?redirect=/join/room/${roomId}`);
      return;
    }
    const joinRoom = async () => {
      const res = await fetch(`/api/rooms/${roomId}/join`, { method: "POST", credentials: "include" });
      if (res.ok) {
        router.replace(`/room/${roomId}`);
      } else {
        const data = await res.json();
        setError(data.error || "Failed to join room");
      }
    };
    joinRoom();
  }, [session, status, roomId, router]);

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background text-foreground">
        <div className="p-8 rounded-lg border bg-card text-center">
          <h2 className="text-2xl font-bold mb-4">Unable to Join Room</h2>
          <p className="text-lg text-destructive mb-6">{error}</p>
          <button
            className="px-6 py-2 rounded bg-primary text-primary-foreground"
            onClick={() => router.replace("/dashboard")}
          >
            Go to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return null;
};

export default JoinRoomPage; 