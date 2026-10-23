function toDataUri(uri: string): Promise<string> {
  if (uri.startsWith("data:")) return Promise.resolve(uri);
  return fetch(uri).then(response => {
    if (!response.ok) throw new Error("O arquivo escolhido não está mais disponível.");
    return response.blob();
  }).then(blob => new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => typeof reader.result === "string" ? resolve(reader.result) : reject(new Error("Não foi possível guardar a mídia."));
    reader.onerror = () => reject(new Error("Não foi possível guardar a mídia."));
    reader.readAsDataURL(blob);
  }));
}

export async function keepPrivateFile(sourceUri: string, _prefix = "anexo") {
  return toDataUri(sourceUri);
}

export async function readPrivateMediaBase64(uri: string) {
  if (!uri.startsWith("data:")) return null;
  const match = /^data:([^;,]+)?;base64,(.*)$/s.exec(uri);
  if (!match) return null;
  return { base64: match[2], extension: match[1]?.split("/")[1] ? `.${match[1].split("/")[1]}` : ".bin" };
}

export async function restorePrivateMedia(uri: string, base64: string) {
  if (uri.startsWith("data:")) {
    const mime = uri.slice(5).split(/[;,]/)[0] || "application/octet-stream";
    return `data:${mime};base64,${base64}`;
  }
  const extension = /\.([a-zA-Z0-9]{1,8})(?:[?#].*)?$/.exec(uri)?.[1]?.toLowerCase();
  const mime = extension === "png" ? "image/png" : extension === "jpg" || extension === "jpeg" ? "image/jpeg" : extension === "webp" ? "image/webp" : extension === "mp3" ? "audio/mpeg" : extension === "m4a" ? "audio/mp4" : "application/octet-stream";
  return `data:${mime};base64,${base64}`;
}
