import { User, Room } from "./dashboard.types";
import { signOut } from "@/lib/auth-client";
import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";

interface UserInfoCardProps {
  user: User;
  joinedRooms?: Room[];
}

export const UserInfoCard = ({ user, joinedRooms = [] }: UserInfoCardProps) => {
  const router = useRouter();

  const handleSignOut = async () => {
    try {
      await signOut();
      router.push("/");
    } catch (error) {
      console.error("Sign out error:", error);
    }
  };

  const createdRooms = joinedRooms.filter((room) => room.owner.id === user.id).length;
  const totalJoined = joinedRooms.length;

  return (
    <div className="flex flex-col gap-4 p-5 rounded-2xl bg-card/90 border border-border/80 shadow-md glass-panel">
      <div className="flex items-center gap-3.5">
        <div className="w-12 h-12 rounded-full bg-primary/10 text-primary border border-primary/20 flex items-center justify-center text-lg font-bold flex-shrink-0 shadow-sm">
          {user.image ? (
            <img src={user.image} alt={user.name} className="w-full h-full rounded-full object-cover" />
          ) : (
            user.name.charAt(0).toUpperCase()
          )}
        </div>
        <div className="overflow-hidden space-y-0.5">
          <h3 className="font-bold text-foreground text-base truncate">{user.name}</h3>
          <p className="text-xs text-muted-foreground truncate">{user.email}</p>
        </div>
      </div>
      
      <div className="grid grid-cols-2 gap-3 text-center text-xs">
        <div className="bg-secondary/50 border border-border/60 rounded-xl p-2.5 space-y-0.5">
          <div className="font-extrabold text-lg text-primary">{totalJoined}/5</div>
          <div className="text-muted-foreground font-medium">Joined Rooms</div>
        </div>
        <div className="bg-secondary/50 border border-border/60 rounded-xl p-2.5 space-y-0.5">
          <div className="font-extrabold text-lg text-primary">{createdRooms}/3</div>
          <div className="text-muted-foreground font-medium">Owned Rooms</div>
        </div>
      </div>

      <Button
        onClick={handleSignOut}
        variant="outline"
        className="w-full h-9 border-destructive/30 text-destructive hover:bg-destructive/10 hover:text-destructive flex items-center justify-center gap-2 font-medium"
      >
        <LogOut className="w-4 h-4" />
        Sign Out
      </Button>
    </div>
  );
};