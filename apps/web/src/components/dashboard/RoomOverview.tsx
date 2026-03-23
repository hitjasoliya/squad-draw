// apps/web/src/components/dashboard/RoomOverview.tsx
import { Button } from "@/components/ui/button";
import { MemberCard } from "./MemberCard";
import { Room, Member, User } from "./dashboard.types";

interface RoomOverviewProps {
  overviewRoom: Room;
  members: Member[];
  currentUser: User | null;
  onCloseOverview: () => void;
  actionLoading: string | null;
  isConnected?: boolean;
  onlineMembers?: string[];
  canManageMembers: boolean;
  onPromoteToAdmin: (roomId: string, userId: string) => Promise<void>;
  onDemoteFromAdmin: (roomId: string, userId: string) => Promise<void>;
  onKickMember: (roomId: string, userId: string) => Promise<void>;
}

export const RoomOverview = ({
  overviewRoom,
  members,
  currentUser,
  onCloseOverview,
  actionLoading,
  isConnected,
  onlineMembers,
  canManageMembers,
  onPromoteToAdmin,
  onDemoteFromAdmin,
  onKickMember,
}: RoomOverviewProps) => {
  return (
    <div className="flex flex-col h-full bg-card/60 backdrop-blur-3xl border-l p-6 overflow-y-auto">
      {/* Room Header */}
      <div className="pb-6 border-b mb-6 border-border/50">
        <div className="flex flex-col gap-4">
          <div>
            <h3 className="text-xl font-semibold text-foreground">{overviewRoom.name}</h3>
            <p className="text-xs text-muted-foreground mt-1">
              Created: {new Date(overviewRoom.createdAt).toLocaleDateString()}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {overviewRoom.isShared && (
              <Button
                onClick={() => {
                  navigator.clipboard.writeText(`${window.location.origin}/join/room/${overviewRoom.id}`);
                }}
                size="sm"
                variant="outline"
                className="flex-1"
              >
                Copy Link
              </Button>
            )}
            <Button onClick={onCloseOverview} size="sm" variant="secondary" className="flex-1">
              Close
            </Button>
          </div>
        </div>
      </div>

      {/* Members Section */}
      <div>
        <div className="mb-4">
          <h4 className="font-semibold flex items-center gap-2 text-sm">
            Members <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">{members.length}</span>
          </h4>
          {onlineMembers && onlineMembers.length > 0 && (
            <p className="text-xs text-green-600 font-medium mt-1">
              {onlineMembers.length} online
            </p>
          )}
        </div>
        
        <div className="space-y-3">
          {members.map((member) => {
            const isOnline = onlineMembers ? onlineMembers.includes(member.id) : false;

            return (
              <MemberCard
                key={member.id}
                member={member}
                currentUser={currentUser}
                room={overviewRoom}
                actionLoading={actionLoading}
                isOnline={isOnline}
                canManageMembers={canManageMembers}
                isOwner={overviewRoom.owner.id === currentUser?.id}
                onPromoteToAdmin={onPromoteToAdmin}
                onDemoteFromAdmin={onDemoteFromAdmin}
                onKickMember={onKickMember}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
};