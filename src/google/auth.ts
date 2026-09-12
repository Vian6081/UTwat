export async function getOAuth2Client(): Promise<{
  credentials: { refresh_token: string };
}> {
  console.log("[stub] getOAuth2Client called");
  return { credentials: { refresh_token: "fake-refresh-token" } };
}
