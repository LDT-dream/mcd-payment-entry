import { randomUUID } from 'node:crypto';
import { rename, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const directory = dirname(fileURLToPath(import.meta.url));
const latestFile = join(directory, 'latest.json');

function usage() {
  return 'Usage: node update-order.mjs <digits-orderId> [ttlMinutes] | --clear';
}

function makeRecord(args, now = new Date()) {
  if (args.length === 1 && args[0] === '--clear') {
    return { orderId: null, updatedAt: null, useUntil: null };
  }
  if (args.length < 1 || args.length > 2 || !/^\d+$/.test(args[0] ?? '')) {
    throw new Error(usage());
  }
  const ttl = args.length === 2 ? Number(args[1]) : 10;
  if (!Number.isInteger(ttl) || ttl < 1 || ttl > 60) {
    throw new Error('ttlMinutes must be a whole number from 1 to 60.');
  }
  const updatedAt = now.getTime();
  return {
    orderId: args[0],
    updatedAt: new Date(updatedAt).toISOString(),
    useUntil: new Date(updatedAt + ttl * 60_000).toISOString(),
  };
}

export async function writeLatestAtomically(file, record) {
  const temporary = `${file}.${randomUUID()}.tmp`;
  const data = `${JSON.stringify(record, null, 2)}\n`;
  await writeFile(temporary, data, { encoding: 'utf8', flag: 'wx' });
  await rename(temporary, file);
}

export async function run(args, file = latestFile) {
  const record = makeRecord(args);
  await writeLatestAtomically(file, record);
  return record;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  try {
    const record = await run(process.argv.slice(2));
    process.stdout.write(`${record.orderId ? 'Updated' : 'Cleared'} latest.json\n`);
  } catch (error) {
    process.stderr.write(`${error.message}\n`);
    process.exitCode = 1;
  }
}
