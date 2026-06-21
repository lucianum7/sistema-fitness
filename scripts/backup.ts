import { readdir, mkdir, rm, stat } from "node:fs/promises";
import path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { getEnv } from "../src/lib/server/env";

const execFileAsync = promisify(execFile);

async function main() {
  const env = getEnv();
  const backupDir = path.resolve(env.BACKUP_DIR);
  await mkdir(backupDir, { recursive: true });

  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const filePath = path.join(backupDir, `sistema-fitness-${timestamp}.sql`);

  await execFileAsync("pg_dump", [env.DATABASE_URL, "--file", filePath, "--no-owner", "--no-privileges"], {
    timeout: 1000 * 60 * 10,
  });

  const files = await readdir(backupDir);
  const cutoff = Date.now() - env.BACKUP_RETENTION_DAYS * 24 * 60 * 60 * 1000;
  await Promise.all(
    files
      .filter((file) => file.startsWith("sistema-fitness-") && file.endsWith(".sql"))
      .map(async (file) => {
        const fullPath = path.join(backupDir, file);
        const info = await stat(fullPath);
        if (info.mtimeMs < cutoff) await rm(fullPath);
      }),
  );

  console.log(`Backup criado em ${filePath}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
