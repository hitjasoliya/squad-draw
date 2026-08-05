import { create } from "zustand";
import { devtools } from "zustand/middleware";
import { toast } from "sonner";

interface NotificationState {
  error: string | null;
  success: string | null;
}

interface NotificationActions {
  showError: (message: string) => void;
  showSuccess: (message: string) => void;
}

interface NotificationStore extends NotificationState, NotificationActions {}

export const useNotificationStore = create<NotificationStore>()(
  devtools(
    (set) => ({
      error: null,
      success: null,

      showError: (message: string) => {
        toast.error(message);
        set({ error: message, success: null });
        setTimeout(() => {
          set({ error: null });
        }, 5000);
      },

      showSuccess: (message: string) => {
        toast.success(message);
        set({ success: message, error: null });
        setTimeout(() => {
          set({ success: null });
        }, 3000);
      },
    }),
    {
      name: "notification-store",
    },
  ),
);
