"use client";

import type React from "react";
import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Send, Users, X } from "lucide-react";
import { useRoomStore } from "@/store/room.store";
import { authClient } from "@/lib/auth-client";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface GroupChatbotProps {
  isOpen: boolean;
  onClose: () => void;
}

export function GroupChatbot({ isOpen, onClose }: GroupChatbotProps) {
  const { data: session } = authClient.useSession();
  const { messages, onlineMembers, sendMessage } = useRoomStore();
  const [input, setInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const prevMessagesLength = useRef(messages.length);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    if (messages.length > prevMessagesLength.current) {
      const lastMsg = messages[messages.length - 1];
      if (lastMsg && lastMsg.user?.id !== session?.user?.id) {
        toast(`${lastMsg.user?.name || "Anonymous"}: ${lastMsg.message}`);
      }
    }
    prevMessagesLength.current = messages.length;
    scrollToBottom();
  }, [messages, session?.user?.id]);

  // Close on Escape (mobile drawer behaves like a sheet).
  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isOpen, onClose]);

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!input.trim() || !session?.user) return;
    await sendMessage(input, session.user);
    setInput("");
  };
  
  return (
    <>
      {/* Mobile scrim: dims the canvas and blocks stray draw gestures */}
      <div
        className={cn(
          "fixed inset-0 z-20 bg-black/40 md:hidden transition-opacity duration-200",
          isOpen ? "opacity-100" : "opacity-0 pointer-events-none",
        )}
        onClick={onClose}
      />
    <div
      className={cn(
        "fixed bottom-[4.5rem] right-4 w-[calc(100vw-2rem)] sm:bottom-4 sm:w-[calc(100%-2rem)] md:bottom-24 md:right-6 md:w-96 transition-[transform,opacity] duration-200 ease-out z-30",
        "h-[70vh] max-h-[600px] sm:h-[500px] md:h-[600px]",
        isOpen
          ? "translate-y-0 opacity-100 scale-100"
          : "translate-y-6 opacity-0 scale-95 pointer-events-none",
      )}
    >
      <Card className="h-full shadow-2xl border border-border/80 bg-card/90 backdrop-blur-xl text-card-foreground flex flex-col rounded-2xl overflow-hidden glass-panel gap-0 py-0">
        <div className="px-3 py-2 bg-muted/30 border-b flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-lg font-semibold">
              <Users className="h-5 w-5 text-primary" />
              <span>Room Chat</span>
            </div>
            <div className="flex items-center gap-2 sm:gap-4">
              <span className="text-xs sm:text-sm text-muted-foreground font-medium">
                {onlineMembers.length} online
              </span>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 rounded-full hover:bg-muted flex-shrink-0"
                onClick={onClose}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        <CardContent className="p-0 flex-1 flex flex-col overflow-hidden min-h-0">
          <div className="px-3 py-1.5 border-b bg-muted/20 flex-shrink-0">
            <h3 className="text-xs font-semibold text-foreground mb-1.5">
              Online Users
            </h3>
            <div className="flex flex-wrap gap-1.5 max-h-16 overflow-y-auto">
              {onlineMembers.map((user) => (
                <div
                  key={user.id}
                  className="flex items-center gap-1.5 bg-background/60 border rounded-full px-2 py-1 text-xs flex-shrink-0"
                >
                  <Avatar className="h-4 w-4 border border-primary/30">
                    <AvatarFallback className="bg-primary/20 text-primary font-semibold text-[10px]">
                      {user.name.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-foreground font-medium whitespace-nowrap">
                    {user.name}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="flex-1 overflow-hidden min-h-0">
            <ScrollArea className="h-full">
              <div className="p-2 sm:p-4 space-y-3 sm:space-y-4">
                {messages.map((msg, index) => {
                  const isYou = msg.user?.id === session?.user?.id;
                  const messageDate = new Date(msg.createdAt);
                  const today = new Date();
                  const isToday = messageDate.getDate() === today.getDate() &&
                                  messageDate.getMonth() === today.getMonth() &&
                                  messageDate.getFullYear() === today.getFullYear();
                  
                  return (
                    <div
                      key={index}
                      className={cn(
                        "flex gap-2 sm:gap-3",
                        isYou ? "flex-row-reverse" : "flex-row",
                      )}
                    >
                      <Avatar className="h-6 w-6 sm:h-8 sm:w-8 flex-shrink-0 mt-1">
                        <AvatarFallback className="bg-muted text-muted-foreground text-xs font-medium">
                          {isYou
                            ? session?.user?.name?.charAt(0)?.toUpperCase() ||
                              "Y"
                            : msg.user?.name?.charAt(0)?.toUpperCase() ||
                              msg.user?.id?.charAt(0)?.toUpperCase() ||
                              "U"}
                        </AvatarFallback>
                      </Avatar>
                      <div
                        className={cn(
                          "flex flex-col min-w-0 w-full",
                          isYou ? "items-end" : "items-start",
                        )}
                      >
                        <div
                          className={cn(
                            "flex items-baseline gap-2 mb-1 px-1",
                            isYou ? "flex-row-reverse" : "flex-row",
                          )}
                        >
                          <span className="text-xs font-semibold text-foreground">
                            {isYou ? "You" : msg.user?.name || "Anonymous"}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {isToday 
                              ? messageDate.toLocaleTimeString([], {
                                hour: "2-digit",
                                minute: "2-digit",
                              })
                              : messageDate.toLocaleDateString([], {
                                  year: 'numeric', month: 'long', day: 'numeric' 
                              })
                            }
                          </span>
                        </div>
                        <div
                          className={cn(
                            "rounded-lg px-3 py-2 text-sm break-words w-fit min-w-[60px] max-w-[85%] sm:max-w-[280px] md:max-w-[250px]",
                            "word-break overflow-wrap-anywhere hyphens-auto",
                            isYou
                              ? "bg-primary text-primary-foreground rounded-br-sm ml-auto"
                              : "bg-muted text-foreground rounded-bl-sm mr-auto",
                          )}
                          style={{
                            wordBreak: "break-word",
                            overflowWrap: "anywhere",
                            hyphens: "auto"
                          }}
                        >
                          {msg.message}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
              <div ref={messagesEndRef} />
            </ScrollArea>
          </div>
        </CardContent>

        <CardFooter className="p-2 sm:p-4 border-t bg-muted/20 flex-shrink-0">
          <form onSubmit={onSubmit} className="flex w-full items-center gap-2 sm:gap-3">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Type a message..."
              className="flex-1 bg-background border focus:ring-2 focus:ring-primary/20 rounded-lg min-w-0 text-sm"
              autoComplete="off"
            />
            <Button
              type="submit"
              size="icon"
              className="rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm flex-shrink-0 h-9 w-9 sm:h-10 sm:w-10"
              disabled={!input.trim()}
            >
              <Send className="h-3 w-3 sm:h-4 sm:w-4" />
            </Button>
          </form>
        </CardFooter>
      </Card>
    </div>
    </>
  );
}