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
    <div className="p-5 rounded-2xl bg-card/90 border border-border/80 shadow-md glass-panel">
      <div className="mb-3 space-y-0.5">
        <h4 className="font-bold text-sm text-foreground">Join Room via Code</h4>
        <p className="text-xs text-muted-foreground font-medium">
          {isAtLimit ? <span className="text-destructive font-semibold">Limit reached ({MAX_JOINED_ROOMS})</span> : `${joinedRoomsCount}/${MAX_JOINED_ROOMS} rooms joined`}
        </p>
      </div>
      <form onSubmit={onJoinRoom} className="flex flex-col gap-2.5">
        <Input
          type="text"
          value={joinRoomId}
          onChange={(e) => setJoinRoomId(e.target.value)}
          placeholder="Paste Room ID or Code..."
          disabled={actionLoading === "join"}
          className="text-sm h-10 bg-background/60 font-mono"
        />
        <Button
          type="submit"
          disabled={actionLoading === "join" || !joinRoomId.trim() || isAtLimit}
          variant={isAtLimit ? "secondary" : "default"}
          className="w-full h-10 flex items-center justify-center gap-2 font-medium shadow-sm active:scale-95"
        >
          <LogIn className="w-4 h-4" />
          {actionLoading === "join" ? "Joining..." : "Join Room"}
        </Button>
      </form>
    </div>
  );
};
