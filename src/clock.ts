import * as fs from "fs";
import * as path from "path";
import { SIM_SPEED } from "./config";

let fake: { wall: number; monotonic: number; speed: number } | null = null;
export function setClock(iso: string, speed = 0): void {
  const wall = Date.parse(iso);
  if (!Number.isFinite(wall) || !Number.isFinite(speed) || speed < 0) throw new Error("Invalid clock");
  fake = { wall, monotonic: performance.now(), speed };
}
export function resetClock(): void { fake = null; }
export function now(): Date {
  if (fake) return new Date(fake.wall + (performance.now() - fake.monotonic) * fake.speed);
  // Dashboard and CLI processes share the simulation epoch through the same state file.
  try {
    const state = JSON.parse(fs.readFileSync(path.resolve(process.env.AMMA_STATE_PATH || "state.json"), "utf8"));
    const clock = state.runtime?.simClock;
    if (clock) return new Date(Date.parse(clock.startISO) + (new Date().getTime() - Date.parse(clock.wallISO)) * clock.speed);
  } catch { /* A fresh real-clock run has no persisted epoch. */ }
  return new Date();
}
export function startSimulation(iso = new Date().toISOString()): void { setClock(iso, SIM_SPEED); }
