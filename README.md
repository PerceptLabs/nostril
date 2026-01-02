# Nostril

A privacy-first, decentralized read-later and knowledge capture app built on Nostr. Save links, images, PDFs, and notes as cryptographically-signed events that are portable, verifiable, and shareable.

## Why Nostril?

Nostril combines Pocket/Raindrop-style bookmarking with Nostr's decentralized identity. Everything you capture is stored as signed Nostr events:

- **True ownership** - Your data lives across relays, not locked in a service
- **Cryptographic attribution** - Everything is signed and verifiable
- **Ultimate portability** - Access your library from any Nostr client
- **Social discovery** - Follow what your network is reading
- **Privacy-first** - Built on cryptographic primitives, not surveillance

## Features

### Capture Everything
- **Links** - Save articles with auto-extracted metadata
- **Images** - Store images with Blossom blobs
- **PDFs** - Documents with text extraction
- **Quick Notes** - Markdown notes and ideas
- **PWA Share** - Capture from any app

### Beautiful Editor
- CodeMirror 6 with syntax highlighting
- Split view editing with live preview
- Slash commands for quick formatting
- `[[Wikilinks]]` to connect saves
- Backlinks to see references

### Powerful Organization
- Full-text search across everything
- Filter by content type, tags, date
- Grid, list, and headline views
- Tag-based organization
- NIP-51 collections

### Nostr Native
- Sign in with your Nostr keys
- Use your preferred relays
- Portable across clients
- Shareable collections

## Tech Stack

- **Frontend**: React 18 + Vite + TypeScript
- **UI**: shadcn/ui + TailwindCSS
- **Editor**: CodeMirror 6
- **Nostr**: @nostrify
- **Storage**: Blossom for blobs
- **PWA**: Offline-capable

## Quick Start

```bash
git clone https://github.com/PerceptLabs/nostril
cd nostril
npm install
npm run dev
```

Open `http://localhost:5173` in your browser.

## Event Schema

### Kind 30078: Save Event
```json
{
  "kind": 30078,
  "content": "My notes about this save...",
  "tags": [
    ["d", "unique-save-id"],
    ["r", "https://example.com/article"],
    ["title", "Article Title"],
    ["content-type", "link|image|pdf|note"],
    ["t", "reading"],
    ["t", "tech"]
  ]
}
```

### Kind 30079: Annotation Event
```json
{
  "kind": 30079,
  "content": "Highlighted insight...",
  "tags": [
    ["d", "annotation-id"],
    ["e", "parent-save-event-id"],
    ["context", "quoted text"]
  ]
}
```

See [NIP.md](NIP.md) for the complete specification.

## Roadmap

**In Progress:**
- Graph view of save connections
- Annotations on saved content
- Collections drag-drop

**Future:**
- Cashu tipping for saves
- Paywalled collections
- Web of Trust discovery feed

## Deploy

```bash
npm run build
```

Deploy the `dist/` folder to any static host. Update relay configuration in `src/App.tsx` as needed.

## License

MIT

## Contributing

Contributions welcome! Open an issue to discuss features or improvements.
