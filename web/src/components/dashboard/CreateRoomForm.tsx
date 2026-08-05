import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

interface CreateRoomFormProps {
  newRoomName: string;
  setNewRoomName: (name: string) => void;
  onCreateRoom: (e: React.FormEvent) => Promise<void>;
  actionLoading: string | null;
  createdRoomsCount: number;
}

const MAX_CREATED_ROOMS = Number(process.env.NEXT_PUBLIC_MAX_CREATED_ROOMS || 3);

export const CreateRoomForm = ({
  newRoomName,
  setNewRoomName,
  onCreateRoom,
  actionLoading,
  createdRoomsCount,
}: CreateRoomFormProps) => {
  const isAtLimit = createdRoomsCount >= MAX_CREATED_ROOMS;
  return (
    <div className="p-5 rounded-2xl bg-card/90 border border-border/80 shadow-md glass-panel">
      <div className="mb-3 space-y-0.5">
        <h4 className="font-bold text-sm text-foreground">Create New Room</h4>
        <p className="text-xs text-muted-foreground font-medium">
          {isAtLimit ? <span className="text-destructive font-semibold">Limit reached ({MAX_CREATED_ROOMS})</span> : `${createdRoomsCount}/${MAX_CREATED_ROOMS} rooms created`}
        </p>
      </div>
      <form onSubmit={onCreateRoom} className="flex flex-col gap-2.5">
        <Input
          type="text"
          value={newRoomName}
          onChange={(e) => setNewRoomName(e.target.value)}
          placeholder="Enter room name..."
          disabled={actionLoading === "create"}
          className="text-sm h-10 bg-background/60"
        />
        <Button
          type="submit"
          disabled={actionLoading === "create" || !newRoomName.trim() || isAtLimit}
          variant={isAtLimit ? "secondary" : "default"}
          className="w-full h-10 flex items-center justify-center gap-2 font-medium shadow-sm active:scale-95"
        >
          <Plus className="w-4 h-4" />
          {actionLoading === "create" ? "Creating..." : "Create Room"}
        </Button>
      </form>
    </div>
  );
};
