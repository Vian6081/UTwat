export async function armCompose(
  photoPath: string,
  caption: string
): Promise<{ sessionId: string; liveViewUrl: string }> {
  console.log("[stub] armCompose called", photoPath, caption);
  return {
    sessionId: "stub-session",
    liveViewUrl: "https://live.steel.dev/stub-session",
  };
}

export async function fireNow(): Promise<void> {
  console.log("[stub] fireNow called");
}
