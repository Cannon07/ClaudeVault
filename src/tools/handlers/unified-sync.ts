import {
  checkUnifiedSyncSetup,
  saveNoteToVaultAndSync,
  pullLatestChanges,
  commitAndPushChanges,
  fullUnifiedSync,
  getUnifiedSyncStatus,
  getAllNotesFromVault,
  findNoteByIdInVault,
} from "../../utils/unified-sync.js";

export function handleUnifiedSync(args: any): Promise<string> {
  const { operation = "full", message, noteId } = args;

  try {
    switch (operation) {
      case "status":
        return handleUnifiedStatus();

      case "pull":
        return handlePullOnly();

      case "push":
        return handlePushOnly(message);

      case "save-and-push":
        return handleSaveAndPush(noteId, message);

      case "full":
      default:
        return handleFullUnifiedSync();
    }
  } catch (error: any) {
    return Promise.resolve(`❌ Unified sync failed: ${error.message}`);
  }
}

async function handleUnifiedStatus(): Promise<string> {
  const result = await getUnifiedSyncStatus();

  if (result.success) {
    return result.message;
  } else {
    return `❌ **Status Check Failed**

${result.message}

**Details:**
${result.details}

💡 **Fix:** Make sure your Obsidian vault is properly configured with Git.`;
  }
}

async function handlePullOnly(): Promise<string> {
  const result = await pullLatestChanges();

  if (result.success) {
    return `⬇️ **Pull Completed Successfully**

${result.message}

**Details:**
${result.details || "Repository is up to date"}

🎯 **Next:** Your vault now has the latest changes from all devices!`;
  } else {
    return `❌ **Pull Failed**

${result.message}

**Details:**
${result.details}

💡 **Troubleshoot:** Check your internet connection and Git configuration.`;
  }
}

async function handlePushOnly(customMessage?: string): Promise<string> {
  const commitMessage =
    customMessage || "Update notes via ClaudeVault unified sync";
  const result = await commitAndPushChanges(commitMessage);

  if (result.success) {
    return `⬆️ **Push Completed Successfully**

${result.message}

**Details:**
${result.details}

🌐 **Result:** Your changes are now available on all devices!`;
  } else {
    return `❌ **Push Failed**

${result.message}

**Details:**
${result.details}

💡 **Note:** Changes are saved locally. Try pulling latest changes first.`;
  }
}

async function handleSaveAndPush(
  noteId?: string,
  customMessage?: string,
): Promise<string> {
  if (!noteId) {
    return `❌ **Note ID Required**

Usage: unified sync operation='save-and-push' noteId='note-1234567890'

This operation saves a specific note to the vault and immediately pushes to Git.`;
  }

  const note = findNoteByIdInVault(noteId);
  if (!note) {
    return `❌ **Note Not Found**

No note found with ID: ${noteId}

Use search_notes to find the correct note ID.`;
  }

  const allNotes = getAllNotesFromVault();
  const result = await saveNoteToVaultAndSync(note, allNotes, true);

  if (result.success) {
    return `🚀 **Note Saved and Synced!**

✅ ${result.message}

**Note:** "${note.title}"
**Connections:** ${result.connectionsCreated || 0} related notes linked
**Details:** ${result.details}

📱 **Available everywhere:** This note is now accessible on all your devices!`;
  } else {
    return `❌ **Save and Sync Failed**

${result.message}

**Details:**
${result.details}`;
  }
}

async function handleFullUnifiedSync(): Promise<string> {
  const notes = getAllNotesFromVault();

  if (notes.length === 0) {
    return `📝 **No Notes to Sync**

You don't have any notes yet. Add some notes first, then run unified sync!

💡 **Try:** "Add a note about unified sync testing"`;
  }

  // Check setup first
  const setupCheck = await checkUnifiedSyncSetup();
  if (!setupCheck.success) {
    return `🔧 **Setup Required**

${setupCheck.message}

**Details:**
${setupCheck.details}

💡 **Fix:** Configure your Obsidian vault with Git integration.`;
  }

  const result = await fullUnifiedSync(notes);

  if (result.success) {
    return `🚀 **Unified Sync Complete!**

✅ ${result.message}

**Summary:**
- 📝 Notes synced: ${result.notesAffected}
- 🔗 Connections created: ${result.connectionsCreated}
- 🎯 Operation details:

${result.details}

🌟 **ClaudeVault v2.0:**
- ⚡ Single repository workflow
- 🔗 Enhanced smart linking
- 📱 Faster cross-device sync
- 🎯 Simplified architecture

📱 **Next Steps:**
1. Check your Obsidian vault for updated notes
2. Open Graph View to see new connections
3. Pull changes on other devices to get updates

💡 **Pro tip:** Changes propagate automatically across all your devices!`;
  } else {
    return `⚠️ **Unified Sync Partially Failed**

${result.message}

**Details:**
${result.details}

🔧 **Troubleshoot:** Check your Git configuration and network connection.`;
  }
}
