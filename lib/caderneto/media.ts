import { Directory, File, Paths } from "expo-file-system";
import { createId } from "./types";

const directory = new Directory(Paths.document, "caderneto-media");
function ensureMediaDirectory() {
  if (!directory.exists) directory.create({ intermediates: true, idempotent: true });
}

export async function keepPrivateFile(sourceUri: string, prefix = "anexo") {
  const source = new File(sourceUri);
  if (!source.exists) throw new Error("O arquivo escolhido não está mais disponível.");
  ensureMediaDirectory();
  const ext = source.extension || ".bin";
  const destination = new File(directory, `${prefix}-${createId()}${ext}`);
  await source.copy(destination);
  return destination.uri;
}

export async function readPrivateMediaBase64(uri: string) {
  if (!uri.startsWith("file://")) return null;
  const file = new File(uri);
  if (!file.exists) throw new Error("Um anexo deste caderno não está disponível para backup.");
  return { base64: await file.base64(), extension: file.extension || ".bin" };
}

export async function restorePrivateMedia(uri: string, base64: string) {
  ensureMediaDirectory();
  const extension = /\.[a-zA-Z0-9]{1,8}$/.exec(uri)?.[0] || ".bin";
  const destination = new File(directory, `restaurado-${createId()}${extension}`);
  destination.create({ intermediates: true, overwrite: true });
  destination.write(base64, { encoding: "base64" });
  return destination.uri;
}
