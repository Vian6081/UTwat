// Real-wall-clock endurance run. External services stay in offline/mock mode.
import * as fs from 'node:fs';
import * as path from 'node:path';
const receipt = path.resolve('photos/overnight-receipt.json');
async function main() {
  process.env.AMMA_OFFLINE = 'true';
  process.env.AMMA_INSTAGRAM_MODE = 'mock';
  process.env.AMMA_STATE_PATH = path.resolve('photos/overnight-state.json');
  process.env.HOSTAGE_PHOTO = path.resolve('photos/aurafarmer.jpg');
  delete process.env.SIM;
  if (fs.existsSync(receipt) || fs.existsSync(process.env.AMMA_STATE_PATH)) throw Error('Existing overnight evidence must be preserved; refusing a duplicate run');
  const startedAt = new Date().toISOString();
  process.env.DEADLINE_ISO = new Date(Date.now() + 18 * 3_600_000).toISOString();
  const { tick } = await import('../loop');
  const { saveState, withStateLock } = await import('../state');
  let ticks = 0;
  const write = (data: object) => {
    fs.writeFileSync(receipt + '.tmp', JSON.stringify({startedAt, deadline: process.env.DEADLINE_ISO, realClock: true, externalServices: 'offline/mock', ticks, ...data}, null, 2));
    fs.renameSync(receipt + '.tmp', receipt);
  };
  try {
    while (true) {
      const state = await tick(); ticks++;
      write({status: 'running', stage: state.stage, lastTickAt: new Date().toISOString()});
      if (state.stage === 'fired') {
        await withStateLock(async () => { state.done = true; saveState(state); });
        const released = await tick();
        if (released.stage !== 'released' || released.mutations.some(m => !m.undone) || released.drafts.length) throw Error('Release verification failed');
        write({status: 'complete', stage: released.stage, completedAt: new Date().toISOString()});
        break;
      }
      await new Promise(resolve => setTimeout(resolve, 60_000));
    }
  } catch (error) { write({status: 'failed', failedAt: new Date().toISOString(), error: String(error)}); throw error; }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
