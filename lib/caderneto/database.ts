import * as SQLite from "expo-sqlite";
import { createId, DEFAULT_SETTINGS, type AppSettings, type Note, type Notebook } from "./types";

let databasePromise: Promise<SQLite.SQLiteDatabase> | null = null;

async function db() {
  if (!databasePromise) {
    databasePromise = SQLite.openDatabaseAsync("caderneto.db");
  }
  const database = await databasePromise;
  await database.execAsync(`
    PRAGMA journal_mode = WAL;
    CREATE TABLE IF NOT EXISTS notebooks (
      id TEXT PRIMARY KEY NOT NULL,
      owner_id TEXT NOT NULL DEFAULT 'device',
      parent_id TEXT,
      title TEXT NOT NULL,
      cover_uri TEXT,
      sort_order INTEGER NOT NULL DEFAULT 0,
      created_at INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS notebooks_owner_parent ON notebooks(owner_id, parent_id, sort_order);
    CREATE TABLE IF NOT EXISTS notes (
      id TEXT PRIMARY KEY NOT NULL,
      owner_id TEXT NOT NULL DEFAULT 'device',
      notebook_id TEXT,
      title TEXT NOT NULL DEFAULT '',
      content TEXT NOT NULL DEFAULT '',
      updated_at INTEGER NOT NULL,
      pinned INTEGER NOT NULL DEFAULT 0,
      favorite INTEGER NOT NULL DEFAULT 0,
      archived INTEGER NOT NULL DEFAULT 0,
      trashed INTEGER NOT NULL DEFAULT 0,
      locked INTEGER NOT NULL DEFAULT 0,
      color TEXT NOT NULL DEFAULT '#FFFFFF',
      font_size INTEGER NOT NULL DEFAULT 18,
      bold INTEGER NOT NULL DEFAULT 0,
      italic INTEGER NOT NULL DEFAULT 0,
      text_color TEXT NOT NULL DEFAULT '#AUTO',
      reminder_at INTEGER,
      attachments TEXT NOT NULL DEFAULT '[]'
    );
    CREATE INDEX IF NOT EXISTS notes_owner_updated ON notes(owner_id, updated_at DESC);
    CREATE INDEX IF NOT EXISTS notes_notebook ON notes(owner_id, notebook_id);
    CREATE TABLE IF NOT EXISTS preferences (
      owner_id TEXT NOT NULL,
      key TEXT NOT NULL,
      value TEXT NOT NULL,
      PRIMARY KEY(owner_id, key)
    );
  `);
  const noteColumns = new Set((await database.getAllAsync<{ name: string }>("PRAGMA table_info(notes)")).map(column => column.name));
  for (const [name, definition] of [["font_size", "INTEGER NOT NULL DEFAULT 18"], ["bold", "INTEGER NOT NULL DEFAULT 0"], ["italic", "INTEGER NOT NULL DEFAULT 0"], ["text_color", "TEXT NOT NULL DEFAULT '#AUTO'"]] as const) {
    if (!noteColumns.has(name)) await database.execAsync(`ALTER TABLE notes ADD COLUMN ${name} ${definition}`);
  }
  return database;
}

type NotebookRow = { id: string; owner_id: string; parent_id: string | null; title: string; cover_uri: string | null; sort_order: number; created_at: number };
type NoteRow = { id: string; owner_id: string; notebook_id: string | null; title: string; content: string; updated_at: number; pinned: number; favorite: number; archived: number; trashed: number; locked: number; color: string; font_size: number; bold: number; italic: number; text_color: string; reminder_at: number | null; attachments: string };
const notebookFromRow = (r: NotebookRow): Notebook => ({ id: r.id, ownerId: r.owner_id, parentId: r.parent_id, title: r.title, coverUri: r.cover_uri, sortOrder: r.sort_order, createdAt: r.created_at });
const noteFromRow = (r: NoteRow): Note => ({ id: r.id, ownerId: r.owner_id, notebookId: r.notebook_id, title: r.title, content: r.content, updatedAt: r.updated_at, pinned: !!r.pinned, favorite: !!r.favorite, archived: !!r.archived, trashed: !!r.trashed, locked: !!r.locked, color: r.color, fontSize: r.font_size || 18, bold: !!r.bold, italic: !!r.italic, textColor: r.text_color || "#AUTO", reminderAt: r.reminder_at, attachments: safeJson(r.attachments, []) });
function safeJson<T>(value: string | null | undefined, fallback: T): T { try { return value ? JSON.parse(value) as T : fallback; } catch { return fallback; } }

export async function listNotebooks(ownerId = "device", parentId: string | null = null): Promise<Notebook[]> {
  const database = await db();
  const rows = parentId === null
    ? await database.getAllAsync<NotebookRow>("SELECT * FROM notebooks WHERE owner_id = ? AND parent_id IS NULL ORDER BY sort_order, created_at", ownerId)
    : await database.getAllAsync<NotebookRow>("SELECT * FROM notebooks WHERE owner_id = ? AND parent_id = ? ORDER BY sort_order, created_at", ownerId, parentId);
  return rows.map(notebookFromRow);
}
export async function allNotebooks(ownerId = "device"): Promise<Notebook[]> {
  const database = await db();
  return (await database.getAllAsync<NotebookRow>("SELECT * FROM notebooks WHERE owner_id = ? ORDER BY sort_order, created_at", ownerId)).map(notebookFromRow);
}
export async function createNotebook(title: string, parentId: string | null, ownerId = "device", coverUri: string | null = null): Promise<Notebook> {
  const database = await db();
  const id = createId();
  const siblings = await listNotebooks(ownerId, parentId);
  const createdAt = Date.now();
  await database.runAsync("INSERT INTO notebooks (id, owner_id, parent_id, title, cover_uri, sort_order, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)", id, ownerId, parentId, title.trim() || "Caderno sem título", coverUri, siblings.length, createdAt);
  return { id, ownerId, parentId, title: title.trim() || "Caderno sem título", coverUri, sortOrder: siblings.length, createdAt };
}
export async function updateNotebook(notebook: Notebook) {
  const database = await db();
  await database.runAsync("UPDATE notebooks SET title = ?, cover_uri = ?, parent_id = ?, sort_order = ? WHERE id = ? AND owner_id = ?", notebook.title, notebook.coverUri, notebook.parentId, notebook.sortOrder, notebook.id, notebook.ownerId);
}
export async function reorderNotebooks(ownerId: string, parentId: string | null, orderedIds: string[]) {
  const database = await db();
  await database.withTransactionAsync(async () => {
    for (let i = 0; i < orderedIds.length; i++) await database.runAsync("UPDATE notebooks SET sort_order = ? WHERE id = ? AND owner_id = ? AND parent_id IS ?", i, orderedIds[i], ownerId, parentId);
  });
}
export async function deleteNotebookTree(notebookId: string, ownerId: string) {
  const database = await db();
  const rows = await allNotebooks(ownerId);
  const remove = new Set<string>([notebookId]);
  let changed = true;
  while (changed) { changed = false; for (const item of rows) if (item.parentId && remove.has(item.parentId) && !remove.has(item.id)) { remove.add(item.id); changed = true; } }
  await database.withTransactionAsync(async () => {
    for (const id of remove) { await database.runAsync("DELETE FROM notes WHERE notebook_id = ? AND owner_id = ?", id, ownerId); await database.runAsync("DELETE FROM notebooks WHERE id = ? AND owner_id = ?", id, ownerId); }
  });
}
export async function duplicateNotebookTree(notebookId: string, ownerId: string): Promise<string> {
  const database = await db();
  const notebooks = await allNotebooks(ownerId);
  const allNotes = await listNotes(ownerId, { includeArchived: true, includeTrashed: true });
  const root = notebooks.find(n => n.id === notebookId);
  if (!root) throw new Error("Caderno não encontrado");
  const subtree: Notebook[] = [];
  const queue = [root];
  while (queue.length) { const n = queue.shift()!; subtree.push(n); queue.push(...notebooks.filter(x => x.parentId === n.id)); }
  const map = new Map<string, string>();
  for (const n of subtree) map.set(n.id, createId());
  await database.withTransactionAsync(async () => {
    for (const n of subtree) await database.runAsync("INSERT INTO notebooks (id, owner_id, parent_id, title, cover_uri, sort_order, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)", map.get(n.id)!, ownerId, n.id === root.id ? root.parentId : map.get(n.parentId!)!, `${n.title} (cópia)`, n.coverUri, n.sortOrder + 1, Date.now());
    for (const note of allNotes.filter(n => n.notebookId && map.has(n.notebookId))) await writeNote({ ...note, id: createId(), notebookId: map.get(note.notebookId!)!, updatedAt: Date.now() });
  });
  return map.get(root.id)!;
}
export async function listNotes(ownerId = "device", options: { notebookId?: string | null; includeArchived?: boolean; includeTrashed?: boolean } = {}): Promise<Note[]> {
  const database = await db();
  const clauses = ["owner_id = ?"];
  const params: (string | number | null)[] = [ownerId];
  if (options.notebookId !== undefined) { clauses.push(options.notebookId === null ? "notebook_id IS NULL" : "notebook_id = ?"); if (options.notebookId !== null) params.push(options.notebookId); }
  if (!options.includeArchived) clauses.push("archived = 0");
  if (!options.includeTrashed) clauses.push("trashed = 0");
  const rows = await database.getAllAsync<NoteRow>(`SELECT * FROM notes WHERE ${clauses.join(" AND ")} ORDER BY pinned DESC, updated_at DESC`, ...params);
  return rows.map(noteFromRow);
}
export async function writeNote(note: Note) {
  const database = await db();
  await database.runAsync(`INSERT OR REPLACE INTO notes (id, owner_id, notebook_id, title, content, updated_at, pinned, favorite, archived, trashed, locked, color, font_size, bold, italic, text_color, reminder_at, attachments) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, note.id, note.ownerId, note.notebookId, note.title, note.content, note.updatedAt, +note.pinned, +note.favorite, +note.archived, +note.trashed, +note.locked, note.color, note.fontSize ?? 18, +(note.bold ?? false), +(note.italic ?? false), note.textColor ?? "#AUTO", note.reminderAt, JSON.stringify(note.attachments));
}
export function emptyNote(ownerId: string, notebookId: string | null): Note { return { id: createId(), ownerId, notebookId, title: "", content: "", updatedAt: Date.now(), pinned: false, favorite: false, archived: false, trashed: false, locked: false, color: "#FFFFFF", fontSize: 18, bold: false, italic: false, textColor: "#AUTO", reminderAt: null, attachments: [] }; }
export async function deleteNotePermanently(noteId: string, ownerId: string) { const database = await db(); await database.runAsync("DELETE FROM notes WHERE id = ? AND owner_id = ?", noteId, ownerId); }
export async function readSettings(ownerId = "device"): Promise<AppSettings> {
  const database = await db();
  const rows = await database.getAllAsync<{ key: string; value: string }>("SELECT key, value FROM preferences WHERE owner_id = ?", ownerId);
  const values = Object.fromEntries(rows.map(r => [r.key, safeJson(r.value, r.value)]));
  return { ...DEFAULT_SETTINGS, ...values, ownerId } as AppSettings;
}
export async function saveSettings(settings: AppSettings) {
  const database = await db();
  await database.withTransactionAsync(async () => { for (const [key, value] of Object.entries(settings)) await database.runAsync("INSERT OR REPLACE INTO preferences (owner_id, key, value) VALUES (?, ?, ?)", settings.ownerId, key, JSON.stringify(value)); });
}
export async function mergeSnapshotData(ownerId: string, notebooks: Notebook[], notes: Note[], settings?: AppSettings) {
  const database = await db();
  await database.withTransactionAsync(async () => {
    for (const notebook of notebooks) await database.runAsync("INSERT OR REPLACE INTO notebooks (id, owner_id, parent_id, title, cover_uri, sort_order, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)", notebook.id, ownerId, notebook.parentId, notebook.title, notebook.coverUri, notebook.sortOrder, notebook.createdAt);
    for (const note of notes) await database.runAsync("INSERT OR REPLACE INTO notes (id, owner_id, notebook_id, title, content, updated_at, pinned, favorite, archived, trashed, locked, color, font_size, bold, italic, text_color, reminder_at, attachments) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)", note.id, ownerId, note.notebookId, note.title, note.content, note.updatedAt, +note.pinned, +note.favorite, +note.archived, +note.trashed, +note.locked, note.color, note.fontSize ?? 18, +(note.bold ?? false), +(note.italic ?? false), note.textColor ?? "#AUTO", note.reminderAt, JSON.stringify(note.attachments ?? []));
    if (settings) for (const [key, value] of Object.entries({ ...settings, ownerId })) await database.runAsync("INSERT OR REPLACE INTO preferences (owner_id, key, value) VALUES (?, ?, ?)", ownerId, key, JSON.stringify(value));
  });
}
export async function noteCount(ownerId = "device"): Promise<number> { const database = await db(); const result = await database.getFirstAsync<{ count: number }>("SELECT COUNT(*) AS count FROM notes WHERE owner_id = ? AND trashed = 0", ownerId); return result?.count ?? 0; }
