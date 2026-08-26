# mcp-artsmia

Minneapolis Institute of Art (Mia) collection MCP.

Part of [Pipeworx](https://pipeworx.io) — an MCP gateway connecting AI agents to 1476+ live data sources.

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

### What this endpoint actually serves

`tools/list` at `https://gateway.pipeworx.io/artsmia/mcp` returns the tools in the table
above **plus the shared Pipeworx meta-tools** — `ask_pipeworx`,
`discover_tools`, `search_within`, `remember`/`recall` and the rest of the
gateway-wide set. So the tool count you see is larger than this table: a
single-pack endpoint currently lists roughly 30 shared tools alongside the
pack's own. The connection's `initialize` response states its exact scope, and
is the authoritative answer for a given day.

This is deliberate, not multiplexing by accident. The meta-tools are what let a
scoped connection answer a question this pack does not cover — via
`ask_pipeworx`, which routes across the whole catalog — without you adding a
second MCP server. There is currently no way to mount a pack endpoint without
them; if the extra schemas cost you more context than the routing is worth,
connect to the full gateway once rather than to several pack endpoints.

Or connect to the full Pipeworx gateway to get every pack's tools listed
directly, instead of just this one's:

```json
{
  "mcpServers": {
    "pipeworx": {
      "url": "https://gateway.pipeworx.io/mcp"
    }
  }
}
```

Both URLs reach the same gateway and the same 1476+ data sources. The
only difference is which pack's tools are listed **directly**; `ask_pipeworx`
reaches all of them from either one.

## Using with ask_pipeworx

Instead of calling tools directly, you can ask questions in plain English —
this works on the pack endpoint above as well as on the full gateway:

```
ask_pipeworx({ question: "your question about Artsmia data" })
```

The gateway picks the right tool and fills the arguments automatically.

## More

- [Docs and guides](https://pipeworx.io/docs)
- [pipeworx.io](https://pipeworx.io)

## License

MIT
