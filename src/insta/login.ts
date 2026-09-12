export async function login(): Promise<{ profileId: string }> {
  console.log("[stub] login called");
  return { profileId: "stub-profile-id" };
}

login().then((result) => {
  console.log("[stub] login result", result);
});
