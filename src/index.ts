interface McpToolDefinition {
  name: string;
  description: string;
  inputSchema: {
    type: 'object';
    properties: Record<string, unknown>;
    required?: string[];
  };
}

interface McpToolExport {
  tools: McpToolDefinition[];
  callTool: (name: string, args: Record<string, unknown>) => Promise<unknown>;
  meter?: { credits: number };
  cost?: Record<string, unknown>;
  provider?: string;
}

/**
 * Minneapolis Institute of Art (Mia) collection MCP.
 *
 * Open-access search over Mia's ~90,000-object collection via the museum's
 * public Elasticsearch front at search.artsmia.org. Supports free-text and
 * ES query-string field syntax (artist:"Van Gogh", country:"China", room:G3*).
 * Keyless.
 */


const BASE = 'https://search.artsmia.org';
const UA = 'pipeworx/1.0 (+https://pipeworx.io)';
const NOT_ON_VIEW = 'Not on View';

const tools: McpToolExport['tools'] = [
  {
    name: 'search_artworks',
    description:
      'Search the Minneapolis Institute of Art collection (~90k objects). Accepts free text ("monet water lilies") or Elasticsearch field syntax: artist:"Van Gogh", country:"China", department:"Asian Art", room:G3* — combinable with free text. Returns artist, date, medium, gallery location (on-view status), and image URL. Keyless.',
    inputSchema: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description:
            'Free text or ES query-string field syntax. Examples: "monet", \'artist:"Van Gogh"\', \'horse country:"China"\', \'department:"European Art"\'.',
        },
        limit: { type: 'number', description: 'Max results (default 10, max 25).' },
        on_view_only: {
          type: 'boolean',
          description: 'If true, only return artworks currently on view in a gallery.',
        },
      },
      required: ['query'],
    },
  },
  {
    name: 'get_artwork',
    description:
      'Get full details for one Minneapolis Institute of Art object by its numeric collection id — title, artist, date, medium, dimensions, credit line, department, gallery location, curatorial text, and image URL. Keyless.',
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'number', description: 'Mia object id, e.g. 1218 (Van Gogh, Olive Trees).' },
      },
      required: ['id'],
    },
  },
  {
    name: 'department_highlights',
    description:
      'Browse artworks from a Minneapolis Institute of Art curatorial department, with imaged objects ranked first. Departments include "European Art", "Asian Art", "Decorative Arts, Textiles and Sculpture", "Photography and New Media", "Arts of the Americas", "Art of Africa and the Americas". Keyless.',
    inputSchema: {
      type: 'object',
      properties: {
        department: {
          type: 'string',
          description: 'Department name, e.g. "European Art", "Asian Art", "Photography and New Media".',
        },
        limit: { type: 'number', description: 'Max results (default 10, max 25).' },
      },
      required: ['department'],
    },
  },
];

async function callTool(name: string, args: Record<string, unknown>): Promise<unknown> {
  try {
    switch (name) {
      case 'search_artworks':
        return searchArtworks(args);
      case 'get_artwork':
        return getArtwork(args);
      case 'department_highlights':
        return departmentHighlights(args);
      default:
        return { error: `Unknown tool: ${name}` };
    }
  } catch (e) {
    return { error: e instanceof Error ? e.message : String(e) };
  }
}

type Source = Record<string, unknown>;

interface EsResponse {
  hits?: {
    total?: number | { value?: number };
    hits?: Array<{ _source?: Source }>;
  };
}

function totalCount(total: number | { value?: number } | undefined): number {
  if (typeof total === 'number') return total;
  if (total && typeof total === 'object' && typeof total.value === 'number') return total.value;
  return 0;
}

function clampLimit(raw: unknown, fallback = 10, max = 25): number {
  const n = typeof raw === 'number' && Number.isFinite(raw) ? Math.floor(raw) : fallback;
  return Math.min(Math.max(n, 1), max);
}

function truncate(value: unknown, len: number): string | null {
  if (typeof value !== 'string' || !value.trim()) return null;
  const s = value.trim();
  return s.length > len ? `${s.slice(0, len)}…` : s;
}

function imageUrl(source: Source): string | null {
  if (source.image !== 'valid' || source.id == null) return null;
  return `https://api.artsmia.org/images/${source.id}/400/medium.jpg`;
}

function mapArt(source: Source): Record<string, unknown> {
  const room = typeof source.room === 'string' ? source.room : null;
  return {
    id: source.id ?? null,
    title: source.title ?? null,
    artist: source.artist ?? null,
    date: source.dated ?? null,
    medium: source.medium ?? null,
    department: source.department ?? null,
    culture: source.culture ?? null,
    country: source.country ?? null,
    on_view: room !== null && room !== NOT_ON_VIEW,
    room,
    accession_number: source.accession_number ?? null,
    image_url: imageUrl(source),
    description: truncate(source.description, 300),
  };
}

async function esSearch(query: string, size: number): Promise<EsResponse> {
  const res = await fetch(`${BASE}/${encodeURIComponent(query)}?size=${size}`, {
    headers: { Accept: 'application/json', 'User-Agent': UA },
  });
  if (!res.ok) throw new Error(`artsmia: ${res.status} ${(await res.text()).slice(0, 200)}`);
  return (await res.json()) as EsResponse;
}

async function searchArtworks(args: Record<string, unknown>): Promise<unknown> {
  const query = typeof args.query === 'string' ? args.query.trim() : '';
  if (!query) return { error: 'provide a query', query: args.query ?? null };
  const limit = clampLimit(args.limit);
  const onViewOnly = args.on_view_only === true;

  // Over-fetch when filtering client-side so on-view hits aren't starved.
  const data = await esSearch(query, onViewOnly ? 25 : limit);
  const hits = data.hits?.hits ?? [];

  let artworks = hits.map((h) => mapArt(h._source ?? {}));
  if (onViewOnly) artworks = artworks.filter((a) => a.on_view === true).slice(0, limit);

  return {
    total: totalCount(data.hits?.total),
    count: artworks.length,
    artworks,
  };
}

async function getArtwork(args: Record<string, unknown>): Promise<unknown> {
  const id = typeof args.id === 'number' && Number.isFinite(args.id) ? Math.floor(args.id) : NaN;
  if (Number.isNaN(id)) return { error: 'provide a numeric object id', id: args.id ?? null };

  const res = await fetch(`${BASE}/id/${id}`, {
    headers: { Accept: 'application/json', 'User-Agent': UA },
  });
  if (res.status === 404) return { error: 'artwork not found', id };
  if (!res.ok) return { error: `artsmia: ${res.status} ${(await res.text()).slice(0, 200)}` };

  // /id/:id returns the bare _source object, or null for unknown ids.
  const source = (await res.json()) as Source | null;
  if (!source || typeof source !== 'object') return { error: 'artwork not found', id };

  const room = typeof source.room === 'string' ? source.room : null;
  return {
    id: source.id ?? id,
    title: source.title ?? null,
    artist: source.artist ?? null,
    artist_life_date: source.life_date ?? null,
    date: source.dated ?? null,
    medium: source.medium ?? null,
    dimensions: source.dimensions ?? source.dimension ?? null,
    creditline: source.creditline ?? null,
    accession_number: source.accession_number ?? null,
    department: source.department ?? null,
    culture: source.culture ?? null,
    country: source.country ?? null,
    style: source.style ?? null,
    on_view: room !== null && room !== NOT_ON_VIEW,
    room,
    image_url: imageUrl(source),
    description: truncate(source.description, 300),
    text: truncate(source.text, 800),
  };
}

async function departmentHighlights(args: Record<string, unknown>): Promise<unknown> {
  const department = typeof args.department === 'string' ? args.department.trim() : '';
  if (!department) return { error: 'provide a department name', department: args.department ?? null };
  const limit = clampLimit(args.limit);

  const data = await esSearch(`department:"${department}"`, 25);
  const hits = data.hits?.hits ?? [];

  const sources = hits.map((h) => h._source ?? {});
  const withImage = sources.filter((s) => s.image === 'valid');
  const withoutImage = sources.filter((s) => s.image !== 'valid');
  const artworks = [...withImage, ...withoutImage].slice(0, limit).map(mapArt);

  return {
    department,
    total: totalCount(data.hits?.total),
    count: artworks.length,
    artworks,
  };
}

export default { tools, callTool, meter: { credits: 1 } } satisfies McpToolExport;
