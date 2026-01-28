"use client";

import { SessionProvider } from "next-auth/react";
import { ToastContextProvider } from "@/hooks/use-toast";
import { Toaster } from "@/components/ui/toaster";
import { NotificationProvider } from "./notification-provider";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <ToastContextProvider>
        <NotificationProvider>
          {children}
        </NotificationProvider>
        <Toaster />
      </ToastContextProvider>
    </SessionProvider>
  );
}
