import Ably from "ably";

let client: Ably.Realtime | null = null;

export function getAblyClient() {
  if (!client) {
    client = new Ably.Realtime({
      authUrl: "/api/ably-token",
      authMethod: "GET",
    });
  }
  return client;
}
