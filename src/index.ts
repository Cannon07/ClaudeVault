import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  ListToolsRequestSchema,
  CallToolRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import {
  addNoteTool,
  searchNotesTool,
  listNotesTool,
  updateNoteTool,
  deleteNoteTool,
  handleAddNote,
  handleSearchNotes,
  handleListNotes,
  handleUpdateNote,
  handleDeleteNote,
  handleSyncNotes,
  syncNotesTool,
} from "./tools/index.js";

console.error("Starting MCP server...");

const server = new Server(
  {
    name: "note-taking-mcp",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
    },
  },
);

console.error("Server instance created...");

server.setRequestHandler(ListToolsRequestSchema, async () => {
  console.error("Tools list requested");
  return {
    tools: [
      addNoteTool,
      searchNotesTool,
      listNotesTool,
      updateNoteTool,
      deleteNoteTool,
      syncNotesTool,
    ],
  };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  console.error(`Tool called: ${request.params.name}`);
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      case "add_note":
        return {
          content: [
            {
              type: "text",
              text: handleAddNote(args || {}),
            },
          ],
        };

      case "search_notes":
        return {
          content: [
            {
              type: "text",
              text: handleSearchNotes(args || {}),
            },
          ],
        };

      case "list_notes":
        return {
          content: [
            {
              type: "text",
              text: handleListNotes(args || {}),
            },
          ],
        };

      case "update_note":
        return {
          content: [
            {
              type: "text",
              text: handleUpdateNote(args || {}),
            },
          ],
        };

      case "delete_note":
        return {
          content: [
            {
              type: "text",
              text: handleDeleteNote(args || {}),
            },
          ],
        };

      case "sync_notes":
        const syncResult = await handleSyncNotes(args || {});
        return { content: [{ type: "text", text: syncResult }] };

      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  } catch (error) {
    console.error(`Error in tool ${name}:`, error);
    return {
      content: [
        {
          type: "text",
          text: `Error: ${error instanceof Error ? error.message : "Unknown error"}`,
        },
      ],
    };
  }
});

console.error("Request handlers set...");

// Start the server
async function main() {
  try {
    console.error("Creating transport...");
    const transport = new StdioServerTransport();
    console.error("Connecting server...");
    await server.connect(transport);
    console.error("Note-taking MCP server running on stdio");
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
}

main().catch((error) => {
  console.error("Main function error:", error);
  process.exit(1);
});
