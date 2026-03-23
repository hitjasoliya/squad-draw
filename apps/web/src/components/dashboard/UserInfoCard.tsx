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
    <div className="flex flex-col gap-4 p-4 rounded-xl bg-card border shadow-sm">
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-lg font-medium flex-shrink-0 shadow-inner">
          {user.image ? (
            <img src={user.image} alt={user.name} className="w-full h-full rounded-full object-cover" />
          ) : (
            user.name.charAt(0).toUpperCase()
          )}
        </div>
        <div className="overflow-hidden">
          <h3 className="font-semibold text-foreground truncate">{user.name}</h3>
          <p className="text-xs text-muted-foreground truncate">{user.email}</p>
        </div>
      </div>
      
      <div className="grid grid-cols-2 gap-2 text-center text-xs">
        <div className="bg-muted rounded-md p-2">
          <div className="font-bold text-base text-primary">{totalJoined}/5</div>
          <div className="text-muted-foreground">Joined</div>
        </div>
        <div className="bg-muted rounded-md p-2">
          <div className="font-bold text-base text-primary">{createdRooms}/3</div>
          <div className="text-muted-foreground">Created</div>
        </div>
      </div>

      <Button onClick={handleSignOut} variant="outline" className="w-full text-destructive hover:bg-destructive/10 hover:text-destructive flex items-center justify-center gap-2">
        <LogOut className="w-4 h-4" />
        Sign Out
      </Button>
    </div>
  );
};