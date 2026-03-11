import { BLOB_URL } from "./config";
import { wordList as fallbackWords } from "./words";

export async function loadWords() {
  try {
    const res = await fetch(BLOB_URL, { cache: "no-store" });
    if (!res.ok) throw new Error("fetch failed");
    const data = await res.json();
    if (Array.isArray(data) && data.length >= 4) return data;
  } catch (_) {}
  return fallbackWords;
}

export async function saveWords(words) {
  try {
    await fetch(BLOB_URL, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(words),
    });
  } catch (_) {}
}
