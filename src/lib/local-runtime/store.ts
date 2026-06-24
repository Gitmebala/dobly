import "server-only";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";

type LocalDatabase = {
  tables: Record<string, Record<string, unknown>[]>;
};

const databasePath = path.join(process.cwd(), ".dobly", "local-db.json");
let writeQueue = Promise.resolve();

function emptyDatabase(): LocalDatabase {
  return { tables: {} };
}

async function readDatabase(): Promise<LocalDatabase> {
  try {
    return JSON.parse(await readFile(databasePath, "utf8")) as LocalDatabase;
  } catch {
    return emptyDatabase();
  }
}

async function writeDatabase(database: LocalDatabase) {
  await mkdir(path.dirname(databasePath), { recursive: true });
  await writeFile(databasePath, JSON.stringify(database, null, 2), "utf8");
}

export async function readTable(table: string) {
  const database = await readDatabase();
  return [...(database.tables[table] ?? [])];
}

export async function mutateTable<T>(
  table: string,
  mutation: (rows: Record<string, unknown>[]) => T | Promise<T>,
) {
  let result!: T;
  writeQueue = writeQueue.then(async () => {
    const database = await readDatabase();
    const rows = [...(database.tables[table] ?? [])];
    result = await mutation(rows);
    database.tables[table] = rows;
    await writeDatabase(database);
  });
  await writeQueue;
  return result;
}

export function prepareRow(row: Record<string, unknown>) {
  const now = new Date().toISOString();
  return {
    id: typeof row.id === "string" && row.id ? row.id : randomUUID(),
    created_at: row.created_at ?? now,
    updated_at: now,
    ...row,
  };
}
