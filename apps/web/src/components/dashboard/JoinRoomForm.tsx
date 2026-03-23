import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { LogIn } from "lucide-react";

interface JoinRoomFormProps {
  joinRoomId: string;
  setJoinRoomId: (id: string) => void;
  onJoinRoom: (e: React.FormEvent) => Promise<void>;
  actionLoading: string | null;
  joinedRoomsCount: number;
}

const MAX_JOINED_ROOMS = 5;

export const JoinRoomForm = ({
  joinRoomId,
  setJoinRoomId,
  onJoinRoom,
  actionLoading,
  joinedRoomsCount,
}: JoinRoomFormProps) => {
  const isAtLimit = joinedRoomsCount >= MAX_JOINED_ROOMS;
  return (
    <div className="p-4 rounded-xl bg-card border shadow-sm">
      <div className="mb-3">
        <h4 className="font-semibold text-sm">Join Room</h4>
        <p className="text-xs text-muted-foreground">
          {isAtLimit ? <span className="text-red-500">Limit reached ({MAX_JOINED_ROOMS})</span> : `${joinedRoomsCount}/${MAX_JOINED_ROOMS} rooms joined`}
        </p>
      </div>
      <form onSubmit={onJoinRoom} className="flex flex-col gap-2">
        <Input
          type="text"
          value={joinRoomId}
          onChange={(e) => setJoinRoomId(e.target.value)}
          placeholder="Room ID..."
          disabled={actionLoading === "join"}
          className="text-sm h-9"
        />
        <Button
          type="submit"
          disabled={actionLoading === "join" || !joinRoomId.trim() || isAtLimit}
          variant={isAtLimit ? "secondary" : "default"}
          className="w-full h-9 flex items-center gap-2"
        >
          <LogIn className="w-4 h-4" />
          {actionLoading === "join" ? "Joining..." : "Join"}
        </Button>
      </form>
    </div>
  );
};
