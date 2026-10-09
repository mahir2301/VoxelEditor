export function download(
  data: BlobPart,
  filename: string,
  type = 'application/octet-stream'
): void {
  const url = URL.createObjectURL(new Blob([data], { type })),
    link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export function safeFilename(name: string): string {
  return name.replace(/[^a-z0-9_.-]/gi, '_') || 'tower';
}
