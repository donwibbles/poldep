import Ably from "ably";

const globalForAbly = globalThis as unknown as { ably: Ably.Rest };

export const ably = globalForAbly.ably ?? new Ably.Rest({ key: process.env.ABLY_API_KEY! });

if (process.env.NODE_ENV !== "production") globalForAbly.ably = ably;

export async function publishEvent(channel: string, event: string, data: unknown) {
  try {
    const ch = ably.channels.get(channel);
    await ch.publish(event, data);
  } catch (error) {
    console.error("Failed to publish Ably event:", error);
  }
}
