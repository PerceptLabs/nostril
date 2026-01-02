# Nostril - Decentralized Read-Later & Knowledge Capture for Nostr

[![Edit with Shakespeare](https://shakespeare.diy/badge.svg)](https://shakespeare.diy/clone?url=https%3A%2F%2Fgithub.com%2FPerceptLabs%2Fnostril)

A privacy-first, decentralized read-later and knowledge capture app built on Nostr. Save links, images, PDFs, and notes as cryptographically-signed events that are portable, verifiable, and shareable.

## 🚀 What is Nostril?

Nostril combines Pocket/Raindrop-style bookmarking with Nostr's decentralized identity and provenance. Everything you capture is stored as signed Nostr events, giving you:

- **True ownership** - Your data lives across relays, not locked in a service
- **Cryptographic attribution** - Everything is signed and verifiable
- **Ultimate portability** - Access your library from any Nostr client
- **Social discovery** - Follow what your network is reading and capturing
- **Privacy-first** - Built on cryptographic primitives, not surveillance

## 📋 Features

### 📚 **Capture Everything**
- **Links** - Save articles with auto-extracted metadata
- **Images** - Screenshot and save images with Blossom blobs
- **PDFs** - Store documents with text extraction
- **Quick Notes** - Capture thoughts and ideas with markdown
- **Share target** - Capture from any app via PWA share

### 🎨 **Beautiful Reading Experience**
- **Markdown editor** - CodeMirror 6 with syntax highlighting
- **Split view** - Edit while previewing in real-time
- **Slash commands** - `/` for quick formatting
- **Wikilinks** - `[[page]]` to link saves together
- **Backlinks** - See what other saves reference this one

### 🔍 **Powerful Discovery**
- **Full-text search** across titles, content, tags
- **Smart filtering** by content type, tags, date
- **Multiple view modes** - Grid, list, headlines
- **Tag-based organization** with color coded badges
- **Collections** - NIP-51 lists that follow you

### 🚀 **Nostr Native**
- **Decentralized identity** - Sign in with Nostr keys
- **Cryptographic attribution** - Every save is signed
- **Relay freedom** - Use your preferred relays
- **Portable data** - Access from any Nostr client
- **Social features** - Share collections, follow reading

## 🛠️ Tech Stack

- **Frontend**: React 18 + Vite + TypeScript
- **UI**: shadcn/ui components with TailwindCSS
- **Editor**: CodeMirror 6 with markdown support
- **Nostr**: @nostrify for events, NIP-07 signing
- **Storage**: Blossom for blobs (images/PDFs)
- **PWA**: Service worker for offline access
- **Template**: Shakespeare MKStack

## 📱 Try It Now

1. **Clone & Edit**: Click the "Edit with Shakespeare" button above to clone this repo and edit it directly on shakespeare.diy
2. **Try it**: The app will open with Nostr login ready to use
3. **Deploy**: When ready, deploy to your preferred hosting provider

## 🏗️ Architecture

### Event Kinds (NIP-78)

**Kind 30078: Save Event**
```json
{
  "kind": 30078,
  "content": "My notes about this save...",
  "tags": [
    ["d", "unique-save-id"],
    ["r", "https://example.com/article"],
    ["title", "Article Title"],
    ["description", "Brief excerpt"],
    ["image", "thumbnail-url"],
    ["content-type", "link|image|pdf|note"],
    ["t", "reading"],
    ["t", "tech"]
  ]
}
```

**Kind 30079: Annotation Event**
```json
{
  "kind": 30079,
  "content": "Important insight about this...",
  "tags": [
    ["d", "unique-annotation-id"],
    ["e", "parent-save-event-id"],
    ["context", "quoted text"],
    ["range", "start:end"]
  ]
}
```

### Collections (NIP-51)

Uses kind 30001 for replaceable lists of save IDs:
```json
{
  "kind": 30001,
  "tags": [
    ["d", "reading-list"],
    ["title", "My Reading List"]
  ]
}
```

## 🧪 Development

```bash
npm install
npm run dev          # Start dev server
npm run build        # Build for production
npm run test         # Run tests
```

## 📦 Features In Progress

**Phase 2 - Coming Soon:**
- Wikilinks between saves
- Graph view of save connections
- Annotations on saved content
- Collections drag-drop

**Phase 3 - Future:**
- Cashu tipping for saves
- Paywalled collections
- WoT discovery feed
- Blossom archival fees

## 🔧 Custom Events

This project uses custom Nostr event kinds for saves and annotations. See [NIP.md](NIP.md) for the complete specification.

## 🌐 Deploy Your Own

1. Clone this repo
2. Update relay configuration in [src/App.tsx](src/App.tsx)
3. Configure your Blossom storage server
4. `npm run build` to create production build
5. Deploy the `dist/` folder to your hosting provider

## 🚧 Troubleshooting

**Preview Issues**: If the preview pane shows "Welcome to your blank app", try:
- Hard refresh (Ctrl+Shift+R)
- Clear browser cache
- Use private/incognito mode
- The app code is correct, this appears to be a platform-level caching issue

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details.

## 🤝 Contributing

Contributions welcome! This is a community project for the Nostr ecosystem. Open an issue to discuss new features or improvements.

---

**Vibed with [Shakespeare](https://shakespeare.diy) and built on [MKStack](https://soapbox.pub/mkstack)**