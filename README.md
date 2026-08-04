# mcp-artsmia

Minneapolis Institute of Art (Mia) collection MCP.

Part of [Pipeworx](https://pipeworx.io) — an MCP gateway connecting AI agents to 1394+ live data sources.

## Tools

| Tool | Description |
|------|-------------|
| `search_artworks` | Search the Minneapolis Institute of Art collection (~90k objects). Accepts free text ("monet water lilies") or Elasticsearch field syntax: artist:"Van Gogh", country:"China", department:"Asian Art", room:G3* — combinable with free text. Returns artist, date, medium, gallery location (on-view status), and image URL. Keyless. |
| `get_artwork` | Get full details for one Minneapolis Institute of Art object by its numeric collection id — title, artist, date, medium, dimensions, credit line, department, gallery location, curatorial text, and image URL. Keyless. |
| `department_highlights` | Browse artworks from a Minneapolis Institute of Art curatorial department, with imaged objects ranked first. Departments include "European Art", "Asian Art", "Decorative Arts, Textiles and Sculpture", "Photography and New Media", "Arts of the Americas", "Art of Africa and the Americas". Keyless. |

## Quick Start

Add to your MCP client (Claude Desktop, Cursor, Windsurf, etc.):

```json
{
  "mcpServers": {
    "artsmia": {
      "url": "https://gateway.pipeworx.io/artsmia/mcp"
    }
  }
}
```

Or connect to the full Pipeworx gateway for access to all 1394+ data sources:

```json
{
  "mcpServers": {
    "pipeworx": {
      "url": "https://gateway.pipeworx.io/mcp"
    }
  }
}
```

## Using with ask_pipeworx

Instead of calling tools directly, you can ask questions in plain English:

```
ask_pipeworx({ question: "your question about Artsmia data" })
```

The gateway picks the right tool and fills the arguments automatically.

## More

- [Docs and guides](https://pipeworx.io/docs)
- [pipeworx.io](https://pipeworx.io)

## License

MIT
