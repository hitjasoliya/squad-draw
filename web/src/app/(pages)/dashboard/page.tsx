"use client";
import { useEffect, useState } from "react";
import { UserInfoCard } from "@/components/dashboard/UserInfoCard";
import { CreateRoomForm } from "@/components/dashboard/CreateRoomForm";
import { JoinRoomForm } from "@/components/dashboard/JoinRoomForm";
import {
  RoomsList,
  RoomOverview,
  RoomOverviewEmpty,
} from "@/components/dashboard";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { useDashboardStore } from "@/store/dashboard.store";
import { useNotificationStore } from "@/store/notification.store";
import { useFormStore } from "@/store/form.store";
import { authClient } from "@/lib/auth-client";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Brand } from "@/components/Brand";

export default function Dashboard() {
  const { data: session, isPending: sessionLoading } = authClient.useSession();
  const {
    joinedRooms,
    overviewRoomId,
    members,
    actionLoading,
    expandedRoom,
    error: roomError,
    fetchJoinedRooms,
    createRoom,
    joinRoom,
    deleteRoom,
    leaveRoom,
    shareRoom,
    unshareRoom,
    copyShareLink,
    copyRoomId,
    openOverview,
    closeOverview,
    toggleRoomExpansion,
    canManageRoom,
    isOwner,
    canManageMembers,
    promoteToAdmin,
    demoteFromAdmin,
    kickMember,
    getOverviewRoom,
  } = useDashboardStore();
  const { showError, showSuccess } = useNotificationStore();
  const {
    newRoomName,
    joinRoomId,
    setNewRoomName,
    setJoinRoomId,
    resetNewRoomName,
    resetJoinRoomId,
  } = useFormStore();

  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    if (!sessionLoading) {
      fetchUserAndRooms();
    }
  }, [sessionLoading]);

  // Refresh when the tab regains focus — a room joined via a share link in
  // another tab would otherwise stay invisible until a full reload.
  useEffect(() => {
    const onVisible = () => {
      if (!document.hidden) void fetchUserAndRooms();
    };
    window.addEventListener("focus", onVisible);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.removeEventListener("focus", onVisible);
      document.removeEventListener("visibilitychange", onVisible);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchUserAndRooms = async () => {
    try {
      setLoading(true);
      await fetchJoinedRooms();
    } catch (err) {
      console.error("Error fetching room data:", err);
      showError(roomError || "Failed to load data");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRoomName.trim()) return;

    try {
      await createRoom(newRoomName);
      resetNewRoomName();
      showSuccess("Room created successfully!");
    } catch (err) {
      showError(roomError || "Failed to create room");
    }
  };

  const handleJoinRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!joinRoomId.trim()) return;

    try {
      await joinRoom(joinRoomId);
      resetJoinRoomId();
      showSuccess("Joined room successfully!");
    } catch (err) {
      showError(roomError || "Failed to join room");
    }
  };

  const handleDeleteRoom = async (roomId: string) => {
    try {
      await deleteRoom(roomId);
      showSuccess("Room deleted successfully!");
    } catch (err) {
      showError(roomError || "Failed to delete room");
    }
  };

  const handleLeaveRoom = async (
    roomId: string,
    roomName: string,
    isOwner: boolean,
  ) => {
    try {
      await leaveRoom(roomId, roomName, isOwner);
      showSuccess("Left room successfully!");
    } catch (err) {
      showError(roomError || "Failed to leave room");
    }
  };

  const handleShareRoom = async (roomId: string) => {
    try {
      await shareRoom(roomId);
      showSuccess("Room shared successfully!");
    } catch (err) {
      showError(roomError || "Failed to share room");
    }
  };

  const handleUnshareRoom = async (roomId: string) => {
    try {
      await unshareRoom(roomId);
      showSuccess("Room unshared successfully!");
    } catch (err) {
      showError(roomError || "Failed to unshare room");
    }
  };

  const handleCopyShareLink = (roomId: string) => {
    copyShareLink(roomId);
    showSuccess("Share link copied to clipboard!");
  };

  const handleCopyRoomId = (roomId: string) => {
    copyRoomId(roomId);
    showSuccess("Room ID copied to clipboard!");
  };

  const handlePromoteToAdmin = async (roomId: string, userId: string) => {
    try {
      await promoteToAdmin(roomId, userId);
      showSuccess("Member promoted to admin successfully!");
    } catch (err) {
      showError(roomError || "Failed to promote member");
    }
  };

  const handleDemoteFromAdmin = async (roomId: string, userId: string) => {
    try {
      await demoteFromAdmin(roomId, userId);
      showSuccess("Member demoted to member successfully!");
    } catch (err) {
      showError(roomError || "Failed to demote member");
    }
  };

  const handleKickMember = async (roomId: string, userId: string) => {
    try {
      await kickMember(roomId, userId);
      showSuccess("Member kicked successfully!");
    } catch (err) {
      showError(roomError || "Failed to kick member");
    }
  };

  const handleCloseOverview = () => {
    closeOverview();
  };

  const overviewRoom = getOverviewRoom();

  const createdRoomsCount = session?.user
    ? joinedRooms.filter((room) => room.owner.id === session.user.id).length
    : 0;
  const joinedRoomsCount = joinedRooms.length;

  if (loading || sessionLoading) {
    return (
      <div className="min-h-dvh bg-background flex items-center justify-center">
        <div className="text-center text-foreground">
          <h2 className="text-3xl font-sans mb-4">Loading Dashboard...</h2>
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto"></div>
        </div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="min-h-dvh bg-background flex items-center justify-center">
        <div className="text-center text-foreground">
          <h2 className="text-3xl font-sans mb-4">
            Please sign in to access the dashboard
          </h2>
          <button
            onClick={async () => {
              try {
                await authClient.signOut();
              } catch {}
              router.push("/signin?redirect=/dashboard");
            }}
            className="bg-primary hover:bg-primary/90 text-primary-foreground px-6 py-2 rounded-md active:scale-[0.97] transition-[transform,background-color] duration-150 ease-out cursor-pointer"
          >
            Sign In
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-dvh overflow-hidden bg-background relative text-foreground">
      {/* Decorative Background Gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-background to-secondary/10 -z-10" />

      {/* Left Sidebar */}
      <aside className="w-[320px] border-r bg-card/40 backdrop-blur-xl flex flex-col justify-between shrink-0 h-full overflow-y-auto hidden md:flex">
        <div className="p-5 space-y-8">
           <Link href="/" className="flex items-center gap-2 mb-4 px-2 transition-opacity hover:opacity-90">
             <Brand />
           </Link>
           
           {session?.user && (
             <UserInfoCard user={session.user} joinedRooms={joinedRooms} />
           )}

           <div className="space-y-6">
             <CreateRoomForm
                newRoomName={newRoomName}
                setNewRoomName={setNewRoomName}
                onCreateRoom={handleCreateRoom}
                actionLoading={actionLoading}
                createdRoomsCount={createdRoomsCount}
              />
              <JoinRoomForm
                joinRoomId={joinRoomId}
                setJoinRoomId={setJoinRoomId}
                onJoinRoom={handleJoinRoom}
                actionLoading={actionLoading}
                joinedRoomsCount={joinedRoomsCount}
              />
           </div>
        </div>
        
        <div className="p-5 border-t border-border/50 bg-card/50">
           <div className="flex items-center justify-between px-2">
             <span className="text-sm font-medium text-foreground">Theme</span>
             <ThemeToggle />
           </div>
        </div>
      </aside>

      {/* Mobile Sidebar Fallback (for small screens) - Very simple stack */}
      <div className="md:hidden flex flex-col w-full h-full overflow-y-auto">
        <div className="p-4 flex items-center justify-between border-b bg-card/80 backdrop-blur">
           <Link href="/" className="flex items-center">
             <Brand />
           </Link>
           <ThemeToggle />
        </div>
        <div className="p-4 space-y-6">
           {session?.user && (
             <UserInfoCard user={session.user} joinedRooms={joinedRooms} />
           )}
           <CreateRoomForm
              newRoomName={newRoomName}
              setNewRoomName={setNewRoomName}
              onCreateRoom={handleCreateRoom}
              actionLoading={actionLoading}
              createdRoomsCount={createdRoomsCount}
            />
            <JoinRoomForm
              joinRoomId={joinRoomId}
              setJoinRoomId={setJoinRoomId}
              onJoinRoom={handleJoinRoom}
              actionLoading={actionLoading}
              joinedRoomsCount={joinedRoomsCount}
            />
        </div>
        <div className="p-4">
           <RoomsList
              rooms={joinedRooms}
              user={session?.user || null}
              overviewRoomId={overviewRoomId}
              expandedRoom={expandedRoom}
              actionLoading={actionLoading}
              onlineMembers={[]}
              onJoinRoomInSocket={(roomId) => openOverview(roomId)}
              onToggleExpansion={toggleRoomExpansion}
              onShareRoom={handleShareRoom}
              onUnshareRoom={handleUnshareRoom}
              onDeleteRoom={handleDeleteRoom}
              onLeaveRoom={handleLeaveRoom}
              onCopyShareLink={handleCopyShareLink}
              onCopyRoomId={handleCopyRoomId}
              canManageRoom={(room) => canManageRoom(room, session?.user)}
              isOwner={(room) => isOwner(room, session?.user)}
            />
        </div>
      </div>

      {/* Mobile Room Overview: bottom sheet so members can be inspected/managed */}
      {overviewRoom && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={handleCloseOverview}
          />
          <div className="absolute bottom-0 inset-x-0 max-h-[85dvh] overflow-y-auto bg-card rounded-t-2xl shadow-2xl">
            <div className="flex justify-end p-2">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 rounded-full"
                onClick={handleCloseOverview}
              >
                ✕
              </Button>
            </div>
            <RoomOverview
              overviewRoom={overviewRoom}
              members={members}
              currentUser={session?.user || null}
              onCloseOverview={handleCloseOverview}
              actionLoading={actionLoading}
              canManageMembers={canManageMembers(overviewRoom, session?.user)}
              onPromoteToAdmin={handlePromoteToAdmin}
              onDemoteFromAdmin={handleDemoteFromAdmin}
              onKickMember={handleKickMember}
            />
          </div>
        </div>
      )}

      {/* Main Content (Desktop) */}
      <main className="hidden md:flex flex-1 flex-col h-screen overflow-hidden relative">
        <header className="h-16 border-b border-border/50 flex items-center justify-between px-8 bg-card/30 backdrop-blur-md shrink-0 shadow-sm z-10">
          <h1 className="text-lg font-bold tracking-tight text-foreground">Workspace Overview</h1>
          <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/50 px-3 py-1.5 rounded-full border border-border/40">
            <span>{joinedRooms.length} whiteboard{joinedRooms.length === 1 ? "" : "s"}</span>
          </div>
        </header>

        <div className="flex-1 flex overflow-hidden">
          {/* Rooms Grid */}
          <div className="flex-1 overflow-y-auto p-6 lg:p-10">
            <RoomsList
              rooms={joinedRooms}
              user={session?.user || null}
              overviewRoomId={overviewRoomId}
              expandedRoom={expandedRoom}
              actionLoading={actionLoading}
              onlineMembers={[]}
              onJoinRoomInSocket={(roomId) => openOverview(roomId)}
              onToggleExpansion={toggleRoomExpansion}
              onShareRoom={handleShareRoom}
              onUnshareRoom={handleUnshareRoom}
              onDeleteRoom={handleDeleteRoom}
              onLeaveRoom={handleLeaveRoom}
              onCopyShareLink={handleCopyShareLink}
              onCopyRoomId={handleCopyRoomId}
              canManageRoom={(room) => canManageRoom(room, session?.user)}
              isOwner={(room) => isOwner(room, session?.user)}
            />
          </div>

          {/* Right Split Pane (Overview) */}
          <div className="w-[360px] lg:w-[400px] xl:w-[450px] shrink-0 transition-[transform,opacity] duration-300 ease-in-out border-l shadow-xl shadow-black/5 dark:shadow-black/40 relative z-20">
             {overviewRoom ? (
                <RoomOverview
                  overviewRoom={overviewRoom}
                  members={members}
                  currentUser={session?.user || null}
                  onCloseOverview={handleCloseOverview}
                  actionLoading={actionLoading}
                  canManageMembers={canManageMembers(overviewRoom, session?.user)}
                  onPromoteToAdmin={handlePromoteToAdmin}
                  onDemoteFromAdmin={handleDemoteFromAdmin}
                  onKickMember={handleKickMember}
                />
             ) : (
                <RoomOverviewEmpty 
                   hasRooms={joinedRooms.length > 0}
                   onCreateRoom={() => {
                      const createInput = document.querySelector('input[placeholder="Room name..."]') as HTMLInputElement;
                      createInput?.focus();
                   }}
                />
             )}
          </div>
        </div>
      </main>
    </div>
  );
}