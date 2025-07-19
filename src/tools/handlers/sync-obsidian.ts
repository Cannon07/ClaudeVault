import {
  checkObsidianConnection,
  syncNoteToObsidian,
  syncAllNotesToObsidian,
  syncAllNotesToObsidianWithLinks,
  getObsidianSyncStats,
} from "../../utils/obsidian-sync.js";
import { getAllNotes, findNoteById } from "../../storage/index.js";

export function handleObsidianSync(args: any): string {
  const { operation = "sync-all", noteId } = args;

  try {
    switch (operation) {
      case "status":
        return handleObsidianStatus();

      case "sync-note":
        return handleSyncSingleNote(noteId);

      case "sync-all":
        return handleSyncAllNotes();

      case "sync-all-with-links":
        return handleSyncAllNotesWithLinks();

      case "stats":
        return handleSyncStats();

      default:
        return handleSyncAllNotes();
    }
  } catch (error: any) {
    return `❌ Obsidian sync failed: ${error.message}`;
  }
}

function handleSyncAllNotesWithLinks(): string {
  const notes = getAllNotes();

  if (notes.length === 0) {
    return `📝 **No notes to sync**

You don't have any notes yet. Add some notes first, then sync to Obsidian!`;
  }

  const result = syncAllNotesToObsidianWithLinks(notes);

  if (result.success) {
    return `🔮 **Smart Sync Complete - Notes with Auto-Links!**

✅ ${result.message}

**Sync Summary:**
${result.details}

🎯 **What's New:**
- ✨ Auto-generated connections between related notes
- 🔗 Links based on shared tags and content similarity
- 📊 Related Notes sections added to each note

🚀 **Next Steps:**
1. Open Obsidian
2. Check any note for the new "Related Notes" section
3. Open Graph View (Ctrl/Cmd + G) to see the connections!

💡 **Pro tip:** Click on the [[links]] to jump between related notes!`;
  } else {
    return `⚠️ **Partial Smart Sync Completed**

${result.message}

**Details:**
${result.details}`;
  }
}

function handleObsidianStatus(): string {
  const result = checkObsidianConnection();

  if (result.success) {
    return `🔮 **Obsidian Connection Status: CONNECTED**

✅ ${result.message}

**Details:**
${result.details}

🚀 **Ready to sync notes to Obsidian!**`;
  } else {
    return `❌ **Obsidian Connection Status: FAILED**

${result.message}

**Details:**
${result.details}

💡 **Fix:** Make sure Obsidian is installed and vault path is correctly set in .env file.`;
  }
}

function handleSyncSingleNote(noteId: string): string {
  if (!noteId) {
    return `❌ **Note ID required for single note sync**

Usage: sync obsidian operation='sync-note' noteId='note-1234567890'`;
  }

  const note = findNoteById(noteId);
  if (!note) {
    return `❌ **Note not found**

No note found with ID: ${noteId}`;
  }

  const result = syncNoteToObsidian(note);

  if (result.success) {
    return `🔮 **Note Synced to Obsidian**

✅ ${result.message}

**Note:** "${note.title}"
**File:** ${result.details}

💡 **Tip:** Check your Obsidian vault's ClaudeVault folder!`;
  } else {
    return `❌ **Sync Failed**

${result.message}

**Details:**
${result.details}`;
  }
}

function handleSyncAllNotes(): string {
  const notes = getAllNotes();

  if (notes.length === 0) {
    return `📝 **No notes to sync**

You don't have any notes yet. Add some notes first, then sync to Obsidian!`;
  }

  const result = syncAllNotesToObsidian(notes);

  if (result.success) {
    return `🔮 **All Notes Synced to Obsidian!**

✅ ${result.message}

**Sync Summary:**
${result.details}

🎯 **Next Steps:**
1. Open Obsidian
2. Navigate to the "ClaudeVault" folder
3. Explore your notes with graph view!

💡 **Pro tip:** Try linking notes with [[double brackets]] in Obsidian!`;
  } else {
    return `⚠️ **Partial Sync Completed**

${result.message}

**Details:**
${result.details}`;
  }
}

function handleSyncStats(): string {
  const result = getObsidianSyncStats();

  if (result.success) {
    return `📊 **Obsidian Sync Statistics**

${result.message}

**Details:**
${result.details}

🔮 **Obsidian Features to Try:**
- Graph view: See note connections
- Search: Find notes instantly
- Tags: Organize with #hashtags
- Links: Connect notes with [[brackets]]`;
  } else {
    return `❌ **Cannot get sync statistics**

${result.message}

**Details:**
${result.details}`;
  }
}
