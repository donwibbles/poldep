"use client";

import * as React from "react";
import { useSession } from "next-auth/react";
import { useToast } from "@/hooks/use-toast";

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const { data: session } = useSession();
  const { toast } = useToast();

  React.useEffect(() => {
    if (!session?.user) return;

    let client: any = null;

    async function setup() {
      try {
        const Ably = await import("ably");
        client = new Ably.Realtime({ authUrl: "/api/ably-token", authMethod: "GET" });

        const channels = ["crm:contacts", "crm:endorsements", "crm:communications", "crm:elections", "crm:tasks"];

        channels.forEach((channelName) => {
          const channel = client.channels.get(channelName);
          channel.subscribe((message: any) => {
            if (message.data?.userId !== session?.user?.id) {
              toast({
                title: message.data?.summary || "Update",
                description: `${channelName.split(":")[1]} updated`,
              });
            }
          });
        });
      } catch {
        // Ably not configured, silently skip
      }
    }

    setup();

    return () => {
      if (client) client.close();
    };
  }, [session?.user, toast]);

  return <>{children}</>;
}
