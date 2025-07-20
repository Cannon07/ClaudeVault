import { Tool } from "@modelcontextprotocol/sdk/types.js";

export const addNoteTool: Tool = {
  name: "add_note",
  description:
    "Add a new note with title, content, and optional tags/project/category",
  inputSchema: {
    type: "object",
    properties: {
      title: { type: "string", description: "Note title" },
      content: { type: "string", description: "Note content" },
      tags: {
        type: "array",
        items: { type: "string" },
        description: "Optional tags",
      },
      project: { type: "string", description: "Optional project name" },
      category: { type: "string", description: "Optional category" },
    },
    required: ["title", "content"],
  },
};

export const searchNotesTool: Tool = {
  name: "search_notes",
  description:
    "Search through all notes by title, content, tags, project, or category",
  inputSchema: {
    type: "object",
    properties: {
      query: { type: "string", description: "Search query" },
    },
    required: ["query"],
  },
};

export const listNotesTool: Tool = {
  name: "list_notes",
  description: "List all notes, optionally limited to recent ones",
  inputSchema: {
    type: "object",
    properties: {
      limit: {
        type: "number",
        description: "Maximum number of notes to return",
      },
    },
    required: [],
  },
};

export const updateNoteTool: Tool = {
  name: "update_note",
  description: "Update an existing Note by ID or search term",
  inputSchema: {
    type: "object",
    properties: {
      identifier: {
        type: "string",
        description: "Note ID or search term to find the note",
      },
      title: { type: "string", description: "New title" },
      content: { type: "string", description: "New content" },
      tags: {
        type: "array",
        items: { type: "string" },
        description: "New tags (replaces existing)",
      },
      add_tags: {
        type: "array",
        items: { type: "string" },
        description: "Tags to add to existing tags",
      },
      remove_tags: {
        type: "array",
        items: { type: "string" },
        description: "Tags to remove from existing tags",
      },
      project: { type: "string", description: "New project name" },
      category: { type: "string", description: "New category" },
      confirm: {
        type: "boolean",
        description: "Skip preview and confirm update",
      },
    },
    required: ["identifier"],
  },
};

export const deleteNoteTool: Tool = {
  name: "delete_note",
  description: "Delete an existing Note by ID or search term",
  inputSchema: {
    type: "object",
    properties: {
      identifier: {
        type: "string",
        description: "Note ID or search term to find the note",
      },
      confirm: {
        type: "boolean",
        description: "Skip preview and confirm delete",
      },
    },
    required: ["identifier"],
  },
};

export const syncNotesTool: Tool = {
  name: "sync_notes",
  description:
    "Sync notes with GitHub repository (pull, commit, push operations)",
  inputSchema: {
    type: "object",
    properties: {
      operation: {
        type: "string",
        description:
          "Sync operation: 'full' (default), 'status', 'pull', 'commit', 'push'",
        enum: ["full", "status", "pull", "commit", "push"],
      },
      message: {
        type: "string",
        description:
          "Custom commit message (only used with 'commit' or 'full' operations)",
      },
    },
    required: [],
  },
};

export const syncObsidianTool: Tool = {
  name: "sync_obsidian",
  description: "Sync notes with Obsidian knowledge management app",
  inputSchema: {
    type: "object",
    properties: {
      operation: {
        type: "string",
        description:
          "Sync operation: 'sync-all', 'sync-note', 'status', 'stats'",
        enum: ["sync-all", "sync-note", "status", "stats"],
      },
      noteId: {
        type: "string",
        description: "Specific note ID to sync (for sync-note operation)",
      },
    },
    required: [],
  },
};

export const unifiedSyncTool: Tool = {
  name: "unified_sync",
  description:
    "Unified sync for ClaudeVault notes with direct Git integration (v2.0)",
  inputSchema: {
    type: "object",
    properties: {
      operation: {
        type: "string",
        description:
          "Sync operation: 'full', 'status', 'pull', 'push', 'save-and-push'",
        enum: ["full", "status", "pull", "push", "save-and-push"],
      },
      message: {
        type: "string",
        description: "Custom commit message (for push operations)",
      },
      noteId: {
        type: "string",
        description: "Specific note ID (for save-and-push operation)",
      },
    },
    required: [],
  },
};
