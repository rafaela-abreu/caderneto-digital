import { allNotebooks, listNotes, mergeSnapshotData, readSettings } from "./database";
import type { AppSettings, Note, Notebook } from "./types";
import { readPrivateMediaBase64, restorePrivateMedia } from "./media";

const DRIVE_API = "https://www.googleapis.com/drive/v3";
const DRIVE_UPLOAD = "https://www.googleapis.com/upload/drive/v3";
export type BackupSnapshot = { format: "caderneto-backup"; version: 1; email: string; savedAt: number; notebooks: Notebook[]; notes: Note[]; settings: AppSettings; media?: Record<string, string> };

async function driveRequest(path: string, token: string, init: RequestInit = {}) {
  const response = await fetch(`${DRIVE_API}${path}`, { ...init, headers: { Authorization: `Bearer ${token}`, ...(init.headers ?? {}) } });
  if (!response.ok) throw new Error(`Google Drive respondeu ${response.status}`);
  return response;
}

export async function uploadPrivateBackup(token: string, snapshot: BackupSnapshot) {
  const listResponse = await driveRequest(`/files?spaces=appDataFolder&q=name%3D%27caderneto-backup.json%27%20and%20trashed%3Dfalse&fields=files(id,name,modifiedTime)`, token);
  const list = await listResponse.json() as { files?: { id: string }[] };
  const existingId = list.files?.[0]?.id;
  const metadata = existingId ? undefined : { name: "caderneto-backup.json", parents: ["appDataFolder"], mimeType: "application/json" };
  const boundary = `caderneto_${Date.now()}`;
  const body = [
    `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(metadata ?? {})}`,
    `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(snapshot)}`,
    `--${boundary}--`,
  ].join("\r\n");
  const endpoint = existingId ? `${DRIVE_UPLOAD}/files/${existingId}?uploadType=multipart` : `${DRIVE_UPLOAD}/files?uploadType=multipart`;
  const response = await fetch(endpoint, { method: existingId ? "PATCH" : "POST", headers: { Authorization: `Bearer ${token}`, "Content-Type": `multipart/related; boundary=${boundary}` }, body });
  if (!response.ok) throw new Error(`Falha ao enviar backup ao Drive (${response.status})`);
  return response.json();
}

export async function downloadPrivateBackup(token: string): Promise<BackupSnapshot | null> {
  const listResponse = await driveRequest(`/files?spaces=appDataFolder&q=name%3D%27caderneto-backup.json%27%20and%20trashed%3Dfalse&orderBy=modifiedTime%20desc&fields=files(id,name,modifiedTime)`, token);
  const list = await listResponse.json() as { files?: { id: string }[] };
  const id = list.files?.[0]?.id;
  if (!id) return null;
  const response = await driveRequest(`/files/${id}?alt=media`, token);
  const snapshot = await response.json() as BackupSnapshot;
  if (snapshot.format !== "caderneto-backup" || snapshot.version !== 1 || !Array.isArray(snapshot.notes) || !Array.isArray(snapshot.notebooks)) throw new Error("O arquivo encontrado não é um backup válido do Caderneto Digital.");
  return snapshot;
}

export async function buildSnapshot(ownerId: string, email: string): Promise<BackupSnapshot> {
  const [notebooks, notes, settings] = await Promise.all([
    allNotebooks(ownerId),
    listNotes(ownerId, { includeArchived: true, includeTrashed: true }),
    readSettings(ownerId),
  ]);
  const mediaUris = new Set<string>();
  for (const notebook of notebooks) if (notebook.coverUri) mediaUris.add(notebook.coverUri);
  for (const note of notes) for (const attachment of note.attachments) mediaUris.add(attachment.uri);
  const media: Record<string, string> = {};
  for (const uri of mediaUris) {
    const item = await readPrivateMediaBase64(uri);
    if (item) media[uri] = item.base64;
  }
  return { format: "caderneto-backup", version: 1, email, savedAt: Date.now(), notebooks, notes, settings, media };
}

export async function restoreSnapshot(snapshot: BackupSnapshot, ownerId: string) {
  const mediaMap = new Map<string, string>();
  for (const [uri, base64] of Object.entries(snapshot.media ?? {})) mediaMap.set(uri, await restorePrivateMedia(uri, base64));
  const notebooks = snapshot.notebooks.map(notebook => ({ ...notebook, ownerId, coverUri: notebook.coverUri ? mediaMap.get(notebook.coverUri) ?? notebook.coverUri : null }));
  const notes = snapshot.notes.map(note => ({ ...note, ownerId, fontSize: note.fontSize ?? 18, bold: note.bold ?? false, italic: note.italic ?? false, textColor: note.textColor ?? "#AUTO", attachments: (note.attachments ?? []).map(item => ({ ...item, uri: mediaMap.get(item.uri) ?? item.uri })) }));
  await mergeSnapshotData(ownerId, notebooks, notes, snapshot.settings ? { ...snapshot.settings, ownerId } : undefined);
}
