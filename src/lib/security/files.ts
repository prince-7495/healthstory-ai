/**
 * Stage 11 — secure document storage.
 *
 * Files never come back to the client for validation: the server
 * derives the storage key (so a client can never point at another
 * user's file), validates name/extension/MIME/magic bytes/size, and
 * stores bytes under a per-user directory outside the web root.
 *
 * All reads resolve through {@link resolveStoragePath}, which rejects
 * absolute paths and `..` traversal.
 */

import { createHash } from "crypto";
import { mkdir, readFile, unlink, writeFile } from "fs/promises";
import path from "path";
import { LIMITS } from "./limits";

type AllowedType = {
  mime: string;
  extensions: string[];
  /** Magic bytes that must appear at the given offset. */
  magic: Array<{ offset: number; bytes: Buffer }>;
  /** `false` → the file must not contain NUL bytes (binary masquerading as text). */
  binary: boolean;
};

/** Extension → allowed document types. Anything not listed here is rejected. */
export const ALLOWED_DOCUMENT_TYPES: Record<string, AllowedType> = {
  ".pdf": {
    mime: "application/pdf",
    extensions: [".pdf"],
    magic: [{ offset: 0, bytes: Buffer.from("%PDF-", "ascii") }],
    binary: true,
  },
  ".png": {
    mime: "image/png",
    extensions: [".png"],
    magic: [{ offset: 0, bytes: Buffer.from([0x89, 0x50, 0x4e, 0x47]) }],
    binary: true,
  },
  ".jpg": {
    mime: "image/jpeg",
    extensions: [".jpg", ".jpeg"],
    magic: [{ offset: 0, bytes: Buffer.from([0xff, 0xd8, 0xff]) }],
    binary: true,
  },
  ".jpeg": {
    mime: "image/jpeg",
    extensions: [".jpg", ".jpeg"],
    magic: [{ offset: 0, bytes: Buffer.from([0xff, 0xd8, 0xff]) }],
    binary: true,
  },
  ".txt": {
    mime: "text/plain",
    extensions: [".txt"],
    magic: [],
    binary: false,
  },
};

/** Declared MIME aliases normalized to the canonical type. */
const MIME_ALIASES: Record<string, string> = {
  "image/jpg": "image/jpeg",
  "text/plain;charset=utf-8": "text/plain",
};

/** Allowed extensions, for messages. */
export const ALLOWED_EXTENSIONS = Object.keys(ALLOWED_DOCUMENT_TYPES);

export type FileCheck =
  | { ok: true; safeName: string; ext: string; checksum: string; sizeBytes: number }
  | { ok: false; reason: string };

/**
 * Strip any path components and dangerous characters. The result is
 * metadata only — storage never uses the client's name for paths.
 */
export function sanitizeFilename(raw: string): string {
  const base = raw.split(/[\\/]/).pop() ?? "file";
  const cleaned = base
    .replace(/[^A-Za-z0-9._-]/g, "_")
    .replace(/^\.+/, "")
    .slice(0, 120);
  return cleaned.length > 0 ? cleaned : "file";
}

export function sha256(bytes: Buffer): string {
  return createHash("sha256").update(bytes).digest("hex");
}

/**
 * Validate an uploaded file end to end: size, extension allow-list,
 * extension↔MIME consistency, magic bytes (and NUL bytes for text).
 */
export function checkDocumentFile(args: {
  filename: string;
  mimeType: string;
  bytes: Buffer;
}): FileCheck {
  const { filename, mimeType, bytes } = args;
  const safeName = sanitizeFilename(filename);

  if (bytes.length === 0) {
    return { ok: false, reason: "File is empty" };
  }
  if (bytes.length > LIMITS.maxFileBytes) {
    return { ok: false, reason: `File exceeds the ${Math.floor(LIMITS.maxFileBytes / (1024 * 1024))} MB limit` };
  }

  const ext = path.extname(safeName).toLowerCase();
  const type = ALLOWED_DOCUMENT_TYPES[ext];
  if (!type) {
    return { ok: false, reason: `Unsupported file type — allowed: ${ALLOWED_EXTENSIONS.join(", ")}` };
  }

  const declared = MIME_ALIASES[mimeType.toLowerCase().trim()] ?? mimeType.toLowerCase().trim();
  if (declared !== type.mime) {
    return { ok: false, reason: "File type does not match the file extension" };
  }

  for (const rule of type.magic) {
    const slice = bytes.subarray(rule.offset, rule.offset + rule.bytes.length);
    if (!slice.equals(rule.bytes)) {
      return { ok: false, reason: "File content does not match its declared type" };
    }
  }

  if (!type.binary && bytes.includes(0)) {
    return { ok: false, reason: "Binary content is not valid in a text file" };
  }

  return { ok: true, safeName, ext, checksum: sha256(bytes), sizeBytes: bytes.length };
}

/**
 * Decode base64 strictly. Node's decoder silently ignores invalid
 * characters, so a decode/re-encode round trip is used to reject
 * payloads that are not clean base64.
 */
export function decodeBase64(content: string): Buffer | null {
  const normalized = content.replace(/\s+/g, "");
  if (normalized.length === 0) return null;
  if (!/^[A-Za-z0-9+/]+={0,2}$/.test(normalized)) return null;
  if (normalized.length > Math.ceil(LIMITS.maxUploadBytes / 3) * 4) return null;

  const bytes = Buffer.from(normalized, "base64");
  if (bytes.length === 0) return null;
  const reencoded = bytes.toString("base64").replace(/=+$/, "");
  if (reencoded !== normalized.replace(/=+$/, "")) return null;
  return bytes;
}

/** Root of the private file store. Never inside `public/`. */
export function storageRoot(): string {
  // turbopackIgnore: dynamic path resolved at runtime, not bundled
  return path.resolve(/*turbopackIgnore: true*/ process.env.STORAGE_DIR || path.join(process.cwd(), "storage"));
}

/**
 * Build the storage key server-side — the client never supplies it.
 * Component ids are cuids (`[a-z0-9]`), so the key cannot contain
 * separators or traversal sequences.
 */
export function buildStorageKey(userId: string, storyId: string, docId: string, ext: string): string {
  return `users/${userId}/stories/${storyId}/${docId}${ext}`;
}

/** Resolve a storage key to disk, refusing anything outside the root. */
export function resolveStoragePath(storageKey: string): string {
  if (storageKey.includes("..") || path.isAbsolute(storageKey) || storageKey.includes("\0")) {
    throw new Error("Invalid storage key");
  }
  const root = storageRoot();
  const abs = path.resolve(root, storageKey);
  if (abs !== root && !abs.startsWith(root + path.sep)) {
    throw new Error("Invalid storage key");
  }
  return abs;
}

export async function saveDocumentBytes(storageKey: string, bytes: Buffer): Promise<void> {
  const target = resolveStoragePath(storageKey);
  await mkdir(path.dirname(target), { recursive: true });
  await writeFile(target, bytes);
}

export async function readDocumentBytes(storageKey: string): Promise<Buffer | null> {
  try {
    return await readFile(/*turbopackIgnore: true*/ resolveStoragePath(storageKey));
  } catch {
    return null;
  }
}

export async function deleteDocumentBytes(storageKey: string): Promise<void> {
  try {
    await unlink(resolveStoragePath(storageKey));
  } catch {
    /* already gone — consistency is verified by the integrity checker */
  }
}
