# ClaudeVault

A powerful TypeScript-based Model Context Protocol (MCP) server that enables intelligent note-taking with Obsidian Vault integration and Git synchronization. Built for seamless integration with Claude Desktop and cross-device knowledge management workflows.

## 🌟 Features

### 📝 Complete Note Management
- **Create, Read, Update, Delete** notes with rich metadata
- **Smart search** across titles, content, tags, projects, and categories
- **Flexible organization** with tags, projects, and categories
- **Preview and confirmation** system for safe updates and deletions
- **Unique ID generation** with timestamp-based identification

### 🗂️ Obsidian Vault Integration
- **Markdown file storage** in your Obsidian vault
- **Smart note linking** with automatic relationship detection
- **Cross-note connections** for enhanced knowledge graphs
- **Subfolder organization** for clean vault structure
- **Direct Obsidian compatibility** for seamless editing

### 🔄 Unified Git Synchronization (v2.0)
- **Single repository workflow** with direct vault integration
- **Enhanced smart linking** between related notes
- **Faster cross-device sync** with optimized Git operations
- **Multiple sync strategies**: full, status, pull, push, save-and-push
- **Conflict-free operations** with proper Git workflow
- **Batch operations** for efficient bulk syncing
- **Emergency sync** for conflict resolution

### ⚙️ Professional Configuration
- **Environment variable support** for flexible deployment
- **Configurable vault paths** and Git settings
- **Clean modular architecture** with separated concerns
- **TypeScript implementation** with full type safety
- **Production-ready error handling** and logging

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ 
- Git configured with remote repository access
- Obsidian vault (local directory)
- Claude Desktop application

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/Cannon07/ClaudeVault.git
   cd ClaudeVault
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment**
   ```bash
   cp .env.example .env
   # Edit .env with your Obsidian vault path
   ```

4. **Set up your Obsidian vault with Git**
   ```bash
   # Navigate to your Obsidian vault
   cd /path/to/your/obsidian-vault
   
   # Initialize Git if not already done
   git init
   git remote add origin https://github.com/yourusername/your-vault-repo.git
   
   # Create initial commit
   git add .
   git commit -m "Initial vault setup"
   git push -u origin main
   ```

5. **Build the project**
   ```bash
   npm run build
   ```

6. **Configure Claude Desktop**
   
   Add to your Claude Desktop configuration file:
   ```json
   {
     "mcpServers": {
       "claudevault": {
         "command": "node",
         "args": ["/path/to/ClaudeVault/dist/index.js"],
         "env": {
           "OBSIDIAN_VAULT_PATH": "/path/to/your/obsidian-vault"
         }
       }
     }
   }
   ```

7. **Restart Claude Desktop** and start taking smart notes!

## 📁 Project Structure

```
src/
├── index.ts                # Main MCP server
├── types/
│   └── note.ts             # Note interface and types
├── tools/
│   ├── index.ts            # Tools API exports
│   ├── definitions.ts      # MCP tool definitions
│   └── handlers/           # Individual tool handlers
│       ├── add-note.ts
│       ├── search-notes.ts
│       ├── list-notes.ts
│       ├── update-note.ts
│       ├── delete-note.ts
│       └── unified-sync.ts
└── utils/
    ├── unified-sync.ts     # Main sync orchestration
    ├── vault/              # Obsidian vault operations
    │   ├── vault-operations.ts
    │   ├── markdown-parser.ts
    │   └── note-linking.ts
    └── git/                # Git synchronization
        ├── git-operations.ts
        └── sync-strategies.ts
```

## 🛠️ Configuration

### Environment Variables (.env)

```bash
# Obsidian Vault Configuration
OBSIDIAN_VAULT_PATH=/path/to/your/obsidian-vault
OBSIDIAN_SUBFOLDER=ClaudeVault

# Git Configuration
DEFAULT_BRANCH=main
AUTO_SYNC_ON_SAVE=false
GIT_TIMEOUT=15000
```

### Note Structure

Notes are stored as Markdown files in your Obsidian vault with the following metadata:

```markdown
# Note Title

Tags: #tag1 #tag2  
Project: project-name  
Category: category-name  

Your note content here with full Markdown support...

## Related Notes
- [[Related Note 1]]
- [[Related Note 2]]
```

Each note includes:
- **Unique ID**: Generated timestamp-based identifier
- **Title**: Human-readable note title
- **Content**: Full Markdown content with Obsidian features
- **Tags**: Flexible tagging system for organization
- **Project**: Optional project association
- **Category**: Optional categorization
- **Related Notes**: Auto-generated cross-references

## 💬 Usage Examples

### Basic Note Operations

```
# Add a new note
"Add a note titled 'API Design Patterns' with content 'REST vs GraphQL comparison' and tags 'api, design, architecture'"

# Search notes
"Search for notes about 'database optimization'"

# List recent notes
"List my last 5 notes"

# Update a note
"Update note note-1234567890123 to add tag 'important'"

# Delete a note
"Delete note about 'old project requirements'"
```

### Unified Git Synchronization (v2.0)

```
# Check sync status
"Sync notes with operation 'status'"

# Full unified synchronization
"Sync notes with operation 'full'"

# Pull latest changes only
"Sync notes with operation 'pull'"

# Commit and push with custom message
"Sync notes with operation 'push' and message 'Daily standup notes'"

# Save specific note and push
"Sync notes with operation 'save-and-push' and noteId 'note-1234567890123'"
```

### Advanced Operations

```
# Health check
"Sync notes with operation 'status'" # Shows vault health and Git status

# Get vault information
"List my last 5 notes"              # Shows vault statistics in output

# Find related notes (automatic in note creation)
# ClaudeVault automatically detects and links related notes when creating/updating
```

### Available Tools

- **`add_note`**: Create new notes with metadata and automatic linking
- **`search_notes`**: Intelligent search across all note content and metadata  
- **`list_notes`**: List notes with optional limits
- **`update_note`**: Modify existing notes with preview/confirmation
- **`delete_note`**: Remove notes with safety confirmations
- **`unified_sync`**: Advanced Git synchronization with multiple strategies

## 🔄 Multi-Device Workflow

### Obsidian + ClaudeVault Integration

1. **Primary Setup**: Configure ClaudeVault with your main Obsidian vault
2. **Git Integration**: Your vault is backed by a Git repository
3. **Smart Linking**: ClaudeVault automatically creates connections between related notes
4. **Cross-Device Sync**: 
   - Start work session: `sync notes operation='pull'`
   - Use ClaudeVault for intelligent note creation and management
   - Use Obsidian for advanced editing, graph view, and plugins
   - End session: `sync notes operation='full'` (unified sync)

### Workflow Benefits

- **Best of Both Worlds**: AI-powered note management + Obsidian's powerful features
- **Automatic Linking**: ClaudeVault intelligently connects related concepts
- **Git Backup**: Full version control and cross-device synchronization
- **Markdown Files**: Human-readable, future-proof storage format
- **Graph View**: Visualize knowledge connections in Obsidian

## 🏗️ Architecture

### MCP Integration
- Uses Anthropic's Model Context Protocol for Claude integration
- Implements standard MCP tool definitions and handlers
- Supports both synchronous and asynchronous operations

### Obsidian Vault Layer
- **Markdown file storage** in structured Obsidian vault
- **Smart note linking** with automatic relationship detection
- **Vault operations** for reading, writing, and organizing notes
- **Configurable subfolder** structure for clean organization

### Unified Git Synchronization (v2.0)
- **Single repository workflow** with direct vault integration
- **Enhanced sync strategies**: full, pull, push, save-and-push
- **Intelligent conflict resolution** and emergency sync
- **Batch operations** for efficient bulk synchronization
- **Cross-device compatibility** with automatic Git operations

### Key Components
- **Unified Sync Engine**: Central orchestration of all sync operations
- **Vault Operations**: Direct Obsidian vault file management
- **Git Strategies**: Multiple sync approaches for different use cases
- **Note Linking**: Automatic relationship detection and cross-referencing
- **Markdown Parser**: Bidirectional conversion between notes and Markdown

## 🚀 Development

### Available Scripts

```bash
npm run build    # Compile TypeScript to JavaScript
npm run dev      # Run server in development mode with tsx
npm start        # Run compiled server
```

### Adding New Tools

1. Create handler in `src/tools/handlers/`
2. Add tool definition in `src/tools/definitions.ts`
3. Export from `src/tools/index.ts`
4. Add case in main server switch statement
5. Build and test

### Architecture Overview

- **Unified Sync**: Central sync orchestration in `utils/unified-sync.ts`
- **Vault Operations**: Obsidian file management in `utils/vault/`
- **Git Strategies**: Multiple sync approaches in `utils/git/`
- **Tool Handlers**: Individual MCP tool implementations in `tools/handlers/`

### Development Notes

**Current Known Issues:**
- TypeScript configuration needs updates for Node.js types and MCP SDK imports
- Build requires proper tsconfig.json with Node.js lib support

**Utility Functions Available (not exposed as tools):**
- `healthCheck()`: System health verification
- `getVaultInfo()`: Vault configuration and statistics
- `findRelatedNotes()`: Automatic note relationship detection

## 🔒 Security & Privacy

- **Private Obsidian vault**: Keep personal notes in your local Obsidian vault
- **Environment-based configuration**: No sensitive data in source code
- **Git authentication**: Uses your existing Git authentication
- **Local-first**: Notes stored locally in Markdown with optional cloud backup
- **Open format**: Human-readable Markdown files, never locked in proprietary formats

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 🙏 Acknowledgments

- [Anthropic](https://anthropic.com) for the Model Context Protocol
- [Claude Desktop](https://claude.ai) for MCP integration
- The open-source community for TypeScript and Node.js ecosystem

## 📞 Support

- Create an issue for bug reports or feature requests
- Check existing issues before creating new ones
- Provide detailed information for better assistance

---

**ClaudeVault v2.0** - Built with ❤️ for developers who love taking smart notes in Obsidian
