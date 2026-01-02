# NIP-78: Nostril Save Events

This NIP defines custom event kinds for the Nostril read-later and knowledge capture application.

## Kind 30078: Save Event

A save event represents a captured item (link, image, PDF, or note) stored in the user's library.

### Tags

| Tag | Required | Description |
|-----|----------|-------------|
| `d` | Yes | Unique identifier for this save (generated UUID or URL-based) |
| `r` | No | Original URL of the captured content |
| `x` | No | SHA256 hash of the archived content |
| `blossom` | No | Blossom server URL where the blob is stored |
| `t` | No | Tags/categories (repeatable) |
| `title` | No | Extracted title of the content |
| `description` | No | Brief description or excerpt |
| `image` | No | Preview/thumbnail image URL |
| `content-type` | No | Type of content: `link`, `image`, `pdf`, `note` |
| `ref` | No | References to other saves via wikilinks (repeatable) |
| `published-at` | No | Human-readable publication date |

### Example

```json
{
  "kind": 30078,
  "content": "My notes about this article...",
  "tags": [
    ["d", "nostril-abc123-def456"],
    ["r", "https://example.com/article"],
    ["title", "Example Article"],
    ["description", "A great article about..."],
    ["image", "https://example.com/image.jpg"],
    ["content-type", "link"],
    ["t", "reading"],
    ["t", "tech"],
    ["ref", "nostril-xyz789"]
  ],
  "created_at": 1699012345
}
```

## Kind 30079: Annotation Event

An annotation event represents an annotation or highlight on a saved item.

### Tags

| Tag | Required | Description |
|-----|----------|-------------|
| `d` | Yes | Unique identifier for this annotation |
| `e` | Yes | Event ID of the parent save event |
| `context` | No | The quoted/selected text being annotated |
| `range` | No | Character or page range (format: `start:end` or `page:start:end`) |
| `rect` | No | Rectangle coordinates for image/PDF annotations (format: `x,y,w,h`) |

### Example

```json
{
  "kind": 30079,
  "content": "This is an important insight that relates to...",
  "tags": [
    ["d", "annotation-abc123"],
    ["e", "event-id-of-parent-save"],
    ["context", "The quoted text from the original content"],
    ["range", "123:456"]
  ],
  "created_at": 1699012345
}
```

## Wikilinks

Nostril supports wikilinks (`[[page]]`) for linking saves together. When a wikilink is detected in save content:

1. The linked save's `d` tag is added to the `ref` tag of the current save
2. The current save appears in the backlinks panel of the linked save

### Example

Save A content:
```
This relates to [[my-other-save]]
```

Save A tags will include:
```json
["ref", "nostril-my-other-save-id"]
```

Save B will show Save A in its backlinks panel.

## Collections via NIP-51

Collections are managed using NIP-51 (Mute/Kind Lists) events:

- Kind 30001: Replaceable list of saved item IDs
- Kind 30002: Replaceable list of blocked/hidden items
- Kind 10001: Ephemeral list of cached/synced items

Each collection is a NIP-51 list with custom app metadata in the content field.

## Backlinks

Backlinks are queried by filtering events where:
- `kind = 30078`
- `#ref` contains the current save's `d` tag

## Relays

Recommended relays for Nostril:
- `wss://relay.ditto.pub`
- `wss://relay.nostr.band`
- `wss://relay.damus.io`

## Privacy Considerations

- All saves are signed events, providing cryptographic provenance
- Users can choose to make collections public or private via NIP-51
- Blossom servers may have their own privacy policies for blob storage