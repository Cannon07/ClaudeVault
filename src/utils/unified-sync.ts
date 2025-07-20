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

// Re-export the main interface
export { UnifiedSyncResult };

/**
 * Main Unified Sync API - Simplified orchestrator
 */
export class UnifiedSync {
  /**
   * Check if the unified sync system is properly configured
   */
  static async checkSetup(): Promise<UnifiedSyncResult> {
    return await checkUnifiedSyncSetup();
  }

  /**
   * Get current sync status with detailed information
   */
  static async getStatus(): Promise<UnifiedSyncResult> {
    return await getUnifiedSyncStatus();
  }

  /**
   * Pull latest changes from remote repository
   */
  static async pull(): Promise<UnifiedSyncResult> {
    return await pullLatestChanges();
  }

  /**
   * Commit and push current changes
   */
  static async push(message?: string): Promise<UnifiedSyncResult> {
    return await commitAndPushChanges(message);
  }

  /**
   * Full sync operation - pull, save all notes, and push
   */
  static async fullSync(notes: Note[]): Promise<UnifiedSyncResult> {
    return await fullUnifiedSync(notes);
  }

  /**
   * Smart sync - only sync if changes are detected
   */
  static async smartSync(
    notes: Note[],
    force?: boolean,
  ): Promise<UnifiedSyncResult> {
    return await smartSync(notes, force);
  }

  /**
   * Save single note to vault with optional auto-sync
   */
  static async saveNote(
    note: Note,
    allNotes: Note[],
    autoSync?: boolean,
  ): Promise<UnifiedSyncResult> {
    return await saveNoteToVaultAndSync(note, allNotes, autoSync);
  }

  /**
   * Delete note from vault with optional auto-sync
   */
  static async deleteNote(
    note: Note,
    autoSync?: boolean,
  ): Promise<UnifiedSyncResult> {
    return await deleteNoteFromVaultAndSync(note, autoSync);
  }

  /**
   * Batch sync multiple notes efficiently
   */
  static async batchSync(
    notes: Note[],
    commitMessage?: string,
  ): Promise<UnifiedSyncResult> {
    return await batchSyncNotes(notes, commitMessage);
  }

  /**
   * Emergency sync with conflict resolution
   */
  static async emergencySync(notes: Note[]): Promise<UnifiedSyncResult> {
    return await emergencySync(notes);
  }

  /**
   * Load all notes from the Obsidian vault
   */
  static getAllNotesFromVault(): Note[] {
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
  static findNoteByIdInVault(id: string): Note | null {
    const allNotes = UnifiedSync.getAllNotesFromVault();
    return allNotes.find((note) => note.id === id) || null;
  }

  /**
   * Search notes in vault
   */
  static searchNotesInVault(query: string): Note[] {
    const allNotes = UnifiedSync.getAllNotesFromVault();
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
  static async addNoteToVault(
    noteData: Omit<Note, "id" | "timestamp">,
  ): Promise<UnifiedSyncResult> {
    const note: Note = {
      id: `note-${Date.now()}`,
      timestamp: new Date().toISOString(),
      ...noteData,
    };

    const allNotes = UnifiedSync.getAllNotesFromVault();
    return await UnifiedSync.saveNote(note, [...allNotes, note]);
  }

  /**
   * Update existing note in vault
   */
  static async updateNoteInVault(
    id: string,
    updates: Partial<Note>,
  ): Promise<UnifiedSyncResult> {
    const existingNote = UnifiedSync.findNoteByIdInVault(id);
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

    const allNotes = UnifiedSync.getAllNotesFromVault();
    const updatedNotes = allNotes.map((note) =>
      note.id === id ? updatedNote : note,
    );

    return await UnifiedSync.saveNote(updatedNote, updatedNotes);
  }

  /**
   * Delete note from vault by ID
   */
  static async deleteNoteFromVault(id: string): Promise<UnifiedSyncResult> {
    const existingNote = UnifiedSync.findNoteByIdInVault(id);
    if (!existingNote) {
      return {
        success: false,
        message: "Note not found",
        details: `No note found with ID: ${id}`,
      };
    }

    return await UnifiedSync.deleteNote(existingNote);
  }

  /**
   * Get related notes for a specific note
   */
  static getRelatedNotes(noteId: string): Note[] {
    const allNotes = UnifiedSync.getAllNotesFromVault();
    const targetNote = allNotes.find((note) => note.id === noteId);

    if (!targetNote) return [];

    const relatedWithScoring = findRelatedNotesWithScoring(
      targetNote,
      allNotes,
    );
    return relatedWithScoring.map((related) => related.note);
  }

  /**
   * Get vault configuration information
   */
  static getVaultInfo(): {
    vaultPath: string;
    notesFolder: string;
    totalNotes: number;
  } {
    try {
      const config = getVaultConfig();
      const allNotes = UnifiedSync.getAllNotesFromVault();

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
  static async healthCheck(): Promise<UnifiedSyncResult> {
    try {
      // Check setup
      const setupResult = await UnifiedSync.checkSetup();
      if (!setupResult.success) {
        return setupResult;
      }

      // Check vault access
      const vaultInfo = UnifiedSync.getVaultInfo();
      if (vaultInfo.vaultPath === "Not configured") {
        return {
          success: false,
          message: "Vault not properly configured",
          details: "OBSIDIAN_VAULT_PATH environment variable not set",
        };
      }

      // Check note loading
      const notes = UnifiedSync.getAllNotesFromVault();

      // Get status
      const statusResult = await UnifiedSync.getStatus();

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
}

// Legacy function exports for backward compatibility
export {
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

// Additional exports for storage compatibility
export const getAllNotesFromVault = UnifiedSync.getAllNotesFromVault;
export const findNoteByIdInVault = UnifiedSync.findNoteByIdInVault;
export const searchNotesInVault = UnifiedSync.searchNotesInVault;
export const addNoteToVault = UnifiedSync.addNoteToVault;
export const updateNoteInVault = UnifiedSync.updateNoteInVault;
export const deleteNoteFromVault = UnifiedSync.deleteNoteFromVault;

// Default export
export default UnifiedSync;
