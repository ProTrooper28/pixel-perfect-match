export function allowPasteOnConstraint(_constraint: unknown, _value: unknown): boolean {
  return false;
}

export async function pasteTextFromClipboard(): Promise<string> {
  if (typeof navigator === "undefined" || !navigator.clipboard) {
    return "";
  }
  try {
    return (await navigator.clipboard.readText()) ?? "";
  } catch {
    return "";
  }
}
