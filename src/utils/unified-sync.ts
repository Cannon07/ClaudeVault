import { Note } from "../types/note.js";
import {
  readVaultFiles,
  readVaultFile,
  getVaultConfig,
} from "./vault/vault-operations.js";
import { parseMarkdownToNote } from "./vault/markdown-parser.js";
import { findRelatedNotesWithScoring } from "./vault/note-linking.js";
import {
  checkUnifiedSyncSetup,
  saveNoteToVaultAndSync,
  deleteNoteFromVaultAndSync,
  pullLatestChanges,
  commitAndPushChanges,
  fullUnifiedSync,
  getUnifiedSyncStatus,
  smartSync,
  batchSyncNotes,
  emergencySync,
  UnifiedSyncResult,
} from "./git/sync-strategies.js";

// Re-export main interface and sync functions
export {
  UnifiedSyncResult,
  checkUnifiedSyncSetup,
  saveNoteToVaultAndSync,
  deleteNoteFromVaultAndSync,
  pullLatestChanges,
  commitAndPushChanges,
  fullUnifiedSync,
  getUnifiedSyncStatus,
  smartSync,
  batchSyncNotes,
  emergencySync,
};

// Re-export Note type
export { Note };

/**
 * Load all notes from the Obsidian vault
 */
export function getAllNotesFromVault(): Note[] {
  try {
    const filePaths = readVaultFiles();
    const notes: Note[] = [];

    for (const filePath of filePaths) {
      const content = readVaultFile(filePath);
      if (content) {
        const note = parseMarkdownToNote(content);
        if (note) {
          notes.push(note);
        }
      }
    }

    // Sort by timestamp (newest first)
    return notes.sort(
      (a, b) =>
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
    );
  } catch (error) {
    console.error("Error loading notes from vault:", error);
    return [];
  }
}

/**
 * Find note by ID from vault
 */
export function findNoteByIdInVault(id: string): Note | null {
  const allNotes = getAllNotesFromVault();
  return allNotes.find((note) => note.id === id) || null;
}

/**
 * Search notes in vault
 */
export function searchNotesInVault(query: string): Note[] {
  const allNotes = getAllNotesFromVault();
  const lowerQuery = query.toLowerCase();

  return allNotes.filter(
    (note) =>
      note.title.toLowerCase().includes(lowerQuery) ||
      note.content.toLowerCase().includes(lowerQuery) ||
      note.tags.some((tag) => tag.toLowerCase().includes(lowerQuery)) ||
      note.project?.toLowerCase().includes(lowerQuery) ||
      note.category?.toLowerCase().includes(lowerQuery),
  );
}

/**
 * Add new note to vault and sync
 */
export async function addNoteToVault(
  noteData: Omit<Note, "id" | "timestamp">,
): Promise<UnifiedSyncResult> {
  const note: Note = {
    id: `note-${Date.now()}`,
    timestamp: new Date().toISOString(),
    ...noteData,
  };

  const allNotes = getAllNotesFromVault();
  return await saveNoteToVaultAndSync(note, [...allNotes, note]);
}

/**
 * Update existing note in vault
 */
export async function updateNoteInVault(
  id: string,
  updates: Partial<Note>,
): Promise<UnifiedSyncResult> {
  const existingNote = findNoteByIdInVault(id);
  if (!existingNote) {
    return {
      success: false,
      message: "Note not found",
      details: `No note found with ID: ${id}`,
    };
  }

  const updatedNote: Note = {
    ...existingNote,
    ...updates,
    id: existingNote.id, // Ensure ID doesn't change
    timestamp: existingNote.timestamp, // Keep original timestamp
  };

  const allNotes = getAllNotesFromVault();
  const updatedNotes = allNotes.map((note) =>
    note.id === id ? updatedNote : note,
  );

  return await saveNoteToVaultAndSync(updatedNote, updatedNotes);
}

/**
 * Delete note from vault by ID
 */
export async function deleteNoteFromVault(
  id: string,
): Promise<UnifiedSyncResult> {
  const existingNote = findNoteByIdInVault(id);
  if (!existingNote) {
    return {
      success: false,
      message: "Note not found",
      details: `No note found with ID: ${id}`,
    };
  }

  return await deleteNoteFromVaultAndSync(existingNote);
}

/**
 * Get related notes for a specific note
 */
export function getRelatedNotes(noteId: string): Note[] {
  const allNotes = getAllNotesFromVault();
  const targetNote = allNotes.find((note) => note.id === noteId);

  if (!targetNote) return [];

  const relatedWithScoring = findRelatedNotesWithScoring(targetNote, allNotes);
  return relatedWithScoring.map((related) => related.note);
}

/**
 * Get vault configuration information
 */
export function getVaultInfo(): {
  vaultPath: string;
  notesFolder: string;
  totalNotes: number;
} {
  try {
    const config = getVaultConfig();
    const allNotes = getAllNotesFromVault();

    return {
      vaultPath: config.vaultPath,
      notesFolder: config.notesFolder,
      totalNotes: allNotes.length,
    };
  } catch (error) {
    return {
      vaultPath: "Not configured",
      notesFolder: "Not configured",
      totalNotes: 0,
    };
  }
}

/**
 * Perform health check on the entire system
 */
export async function healthCheck(): Promise<UnifiedSyncResult> {
  try {
    // Check setup
    const setupResult = await checkUnifiedSyncSetup();
    if (!setupResult.success) {
      return setupResult;
    }

    // Check vault access
    const vaultInfo = getVaultInfo();
    if (vaultInfo.vaultPath === "Not configured") {
      return {
        success: false,
        message: "Vault not properly configured",
        details: "OBSIDIAN_VAULT_PATH environment variable not set",
      };
    }

    // Check note loading
    const notes = getAllNotesFromVault();

    // Get status
    const statusResult = await getUnifiedSyncStatus();

    return {
      success: true,
      message: "System health check passed",
      details: `✅ Vault configured: ${vaultInfo.vaultPath}\n✅ Notes loaded: ${notes.length}\n✅ Git status: ${statusResult.success ? "OK" : "Warning"}\n✅ Sync ready: Yes`,
    };
  } catch (error: any) {
    return {
      success: false,
      message: "Health check failed",
      details: error.message,
    };
  }
}
