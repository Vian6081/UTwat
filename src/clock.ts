import { SIM_SPEED } from "./config";

const accelerated =
  process.env.SIM === "1" || process.argv.includes("--sim");

const originRealMs = Date.now();
const originWallMs = Date.now();

export function now(): Date {
  if (!accelerated) return new Date(Date.now());
  const elapsed = Date.now() - originRealMs;
  return new Date(originWallMs + elapsed * SIM_SPEED);
}
