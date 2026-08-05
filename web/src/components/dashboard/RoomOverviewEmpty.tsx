// apps/web/src/components/dashboard/RoomOverviewEmpty.tsx
import { Button } from "@/components/ui/button";

interface RoomOverviewEmptyProps {
  hasRooms: boolean;
  onCreateRoom: () => void;
}

export const RoomOverviewEmpty = ({
  hasRooms,
  onCreateRoom,
}: RoomOverviewEmptyProps) => {
  return (
    <div className="flex flex-col h-full bg-card/60 backdrop-blur-3xl border-l p-8 overflow-y-auto items-center justify-center text-center">
      <div className="max-w-md space-y-8 tracking-wide">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight text-foreground">
            {hasRooms ? "Select a Room" : "Welcome to Squad Draw!"}
          </h2>
          <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
            {hasRooms
              ? "Click on any room from your list to see its members and manage room settings."
              : "Create your first room or join an existing one to start collaborating."}
          </p>
        </div>

        {!hasRooms && (
          <Button onClick={onCreateRoom} variant="default" className="w-full">
            Create Your First Room
          </Button>
        )}

        {/* Features List */}
        <div className="pt-8 border-t border-border/50">
          <p className="text-sm font-medium mb-4 text-foreground">Features available:</p>
          <div className="flex flex-col gap-4 text-sm text-muted-foreground text-left px-4">
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 bg-primary rounded-full shadow-sm"></div>
              <span>Real-time collaborative drawing</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 bg-primary rounded-full shadow-sm"></div>
              <span>Real-time chat & user presence</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 bg-primary rounded-full shadow-sm"></div>
              <span>Room & member management</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};