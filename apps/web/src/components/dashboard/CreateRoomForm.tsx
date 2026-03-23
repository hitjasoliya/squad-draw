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
    <div className="p-4 rounded-xl bg-card border shadow-sm">
      <div className="mb-3">
        <h4 className="font-semibold text-sm">Create Room</h4>
        <p className="text-xs text-muted-foreground">
          {isAtLimit ? <span className="text-red-500">Limit reached ({MAX_CREATED_ROOMS})</span> : `${createdRoomsCount}/${MAX_CREATED_ROOMS} rooms created`}
        </p>
      </div>
      <form onSubmit={onCreateRoom} className="flex flex-col gap-2">
        <Input
          type="text"
          value={newRoomName}
          onChange={(e) => setNewRoomName(e.target.value)}
          placeholder="Room name..."
          disabled={actionLoading === "create"}
          className="text-sm h-9"
        />
        <Button
          type="submit"
          disabled={actionLoading === "create" || !newRoomName.trim() || isAtLimit}
          variant={isAtLimit ? "secondary" : "default"}
          className="w-full h-9 flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          {actionLoading === "create" ? "Creating..." : "Create"}
        </Button>
      </form>
    </div>
  );
};
