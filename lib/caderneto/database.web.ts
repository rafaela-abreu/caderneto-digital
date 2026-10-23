import { createId, DEFAULT_SETTINGS, type AppSettings, type Note, type Notebook } from "./types";

type WebStore = { notebooks: Notebook[]; notes: Note[]; settings: Record<string, AppSettings> };
const STORAGE_KEY = "caderneto.web-data.v1";
let cache: WebStore | null = null;
function emptyStore(): WebStore { return { notebooks: [], notes: [], settings: {} }; }
function readStore(): WebStore {
  if (cache) return cache;
  if (typeof window === "undefined") return (cache = emptyStore());
  try {
    const parsed = JSON.parse(window.localStorage.getItem(STORAGE_KEY) || "null") as Partial<WebStore> | null;
    cache = { notebooks: parsed?.notebooks ?? [], notes: (parsed?.notes ?? []).map(note => ({ ...note, fontSize: note.fontSize ?? 18, bold: note.bold ?? false, italic: note.italic ?? false, textColor: note.textColor ?? "#AUTO" })), settings: parsed?.settings ?? {} };
  } catch { cache = emptyStore(); }
  return cache;
}
function writeStore(store: WebStore) {
  cache = store;
  if (typeof window !== "undefined") window.localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
}

export async function listNotebooks(ownerId = "device", parentId: string | null = null): Promise<Notebook[]> {
  return readStore().notebooks.filter(item => item.ownerId === ownerId && item.parentId === parentId).sort((a, b) => a.sortOrder - b.sortOrder || a.createdAt - b.createdAt);
}
export async function allNotebooks(ownerId = "device"): Promise<Notebook[]> {
  return readStore().notebooks.filter(item => item.ownerId === ownerId).sort((a, b) => a.sortOrder - b.sortOrder || a.createdAt - b.createdAt);
}
export async function createNotebook(title: string, parentId: string | null, ownerId = "device", coverUri: string | null = null): Promise<Notebook> {
  const store = readStore();
  const siblings = store.notebooks.filter(item => item.ownerId === ownerId && item.parentId === parentId);
  const notebook: Notebook = { id: createId(), ownerId, parentId, title: title.trim() || "Caderno sem título", coverUri, sortOrder: siblings.length, createdAt: Date.now() };
  writeStore({ ...store, notebooks: [...store.notebooks, notebook] });
  return notebook;
}
export async function updateNotebook(notebook: Notebook) {
  const store = readStore();
  writeStore({ ...store, notebooks: store.notebooks.map(item => item.id === notebook.id && item.ownerId === notebook.ownerId ? notebook : item) });
}
export async function reorderNotebooks(ownerId: string, parentId: string | null, orderedIds: string[]) {
  const order = new Map(orderedIds.map((id, index) => [id, index]));
  const store = readStore();
  writeStore({ ...store, notebooks: store.notebooks.map(item => item.ownerId === ownerId && item.parentId === parentId && order.has(item.id) ? { ...item, sortOrder: order.get(item.id)! } : item) });
}
export async function deleteNotebookTree(notebookId: string, ownerId: string) {
  const store = readStore();
  const owned = store.notebooks.filter(item => item.ownerId === ownerId);
  const removed = new Set([notebookId]);
  let changed = true;
  while (changed) { changed = false; for (const item of owned) if (item.parentId && removed.has(item.parentId) && !removed.has(item.id)) { removed.add(item.id); changed = true; } }
  writeStore({ ...store, notebooks: store.notebooks.filter(item => !(item.ownerId === ownerId && removed.has(item.id))), notes: store.notes.filter(item => !(item.ownerId === ownerId && item.notebookId && removed.has(item.notebookId))) });
}
export async function duplicateNotebookTree(notebookId: string, ownerId: string): Promise<string> {
  const store = readStore();
  const root = store.notebooks.find(item => item.id === notebookId && item.ownerId === ownerId);
  if (!root) throw new Error("Caderno não encontrado");
  const subtree: Notebook[] = [];
  const queue = [root];
  while (queue.length) { const item = queue.shift()!; subtree.push(item); queue.push(...store.notebooks.filter(child => child.ownerId === ownerId && child.parentId === item.id)); }
  const ids = new Map(subtree.map(item => [item.id, createId()]));
  const copies = subtree.map(item => ({ ...item, id: ids.get(item.id)!, parentId: item.id === root.id ? root.parentId : ids.get(item.parentId!)!, title: `${item.title} (cópia)`, sortOrder: item.sortOrder + 1, createdAt: Date.now() }));
  const copiedNotes = store.notes.filter(note => note.ownerId === ownerId && !!note.notebookId && ids.has(note.notebookId)).map(note => ({ ...note, id: createId(), notebookId: ids.get(note.notebookId!)!, updatedAt: Date.now() }));
  writeStore({ ...store, notebooks: [...store.notebooks, ...copies], notes: [...store.notes, ...copiedNotes] });
  return ids.get(root.id)!;
}
export async function listNotes(ownerId = "device", options: { notebookId?: string | null; includeArchived?: boolean; includeTrashed?: boolean } = {}): Promise<Note[]> {
  return readStore().notes.filter(note => note.ownerId === ownerId && (options.notebookId === undefined || note.notebookId === options.notebookId) && (options.includeArchived || !note.archived) && (options.includeTrashed || !note.trashed)).sort((a, b) => Number(b.pinned) - Number(a.pinned) || b.updatedAt - a.updatedAt);
}
export async function writeNote(note: Note) {
  const store = readStore();
  writeStore({ ...store, notes: [...store.notes.filter(item => !(item.id === note.id && item.ownerId === note.ownerId)), note] });
}
export function emptyNote(ownerId: string, notebookId: string | null): Note { return { id: createId(), ownerId, notebookId, title: "", content: "", updatedAt: Date.now(), pinned: false, favorite: false, archived: false, trashed: false, locked: false, color: "#FFFFFF", fontSize: 18, bold: false, italic: false, textColor: "#AUTO", reminderAt: null, attachments: [] }; }
export async function deleteNotePermanently(noteId: string, ownerId: string) {
  const store = readStore();
  writeStore({ ...store, notes: store.notes.filter(item => !(item.id === noteId && item.ownerId === ownerId)) });
}
export async function readSettings(ownerId = "device"): Promise<AppSettings> { return { ...DEFAULT_SETTINGS, ...(readStore().settings[ownerId] ?? {}), ownerId }; }
export async function saveSettings(settings: AppSettings) { const store = readStore(); writeStore({ ...store, settings: { ...store.settings, [settings.ownerId]: settings } }); }
export async function mergeSnapshotData(ownerId: string, notebooks: Notebook[], notes: Note[], settings?: AppSettings) {
  const store = readStore();
  const byNotebook = new Map(store.notebooks.map(item => [`${item.ownerId}:${item.id}`, item]));
  for (const item of notebooks) byNotebook.set(`${ownerId}:${item.id}`, { ...item, ownerId });
  const byNote = new Map(store.notes.map(item => [`${item.ownerId}:${item.id}`, item]));
  for (const item of notes) byNote.set(`${ownerId}:${item.id}`, { ...item, ownerId, fontSize: item.fontSize ?? 18, bold: item.bold ?? false, italic: item.italic ?? false, textColor: item.textColor ?? "#AUTO" });
  writeStore({ notebooks: [...byNotebook.values()], notes: [...byNote.values()], settings: settings ? { ...store.settings, [ownerId]: { ...settings, ownerId } } : store.settings });
}
export async function noteCount(ownerId = "device"): Promise<number> { return readStore().notes.filter(note => note.ownerId === ownerId && !note.trashed).length; }
