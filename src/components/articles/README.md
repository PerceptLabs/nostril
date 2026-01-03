# Article Components

Article publishing components for Nostril based on the NIP-23 specification.

## Components

### 1. ArticleCard

Card preview component for displaying articles in listings and feeds.

**Usage:**
```tsx
import { ArticleCard } from '@/components/articles';

<ArticleCard
  article={article}
  onClick={() => navigate(`/article/${article.dTag}`)}
  authorName={author?.name}
  authorPicture={author?.picture}
/>
```

**Props:**
- `article`: Article - The article to display (from `@/lib/article`)
- `onClick?`: () => void - Optional click handler
- `className?`: string - Additional CSS classes
- `authorName?`: string - Author's display name
- `authorPicture?`: string - Author's profile picture URL

**Features:**
- Cover image with gradient fallback
- Article title and summary
- Tags with links to topic pages
- Paywall badge if enabled
- Author avatar and name
- Reading time and publish date
- Responsive design with hover effects

---

### 2. ArticleHeader

Header component for the article reading view.

**Usage:**
```tsx
import { ArticleHeader } from '@/components/articles';

<ArticleHeader
  article={article}
  author={{
    name: authorProfile?.name,
    picture: authorProfile?.picture,
    npub: authorProfile?.npub,
  }}
  onBack={() => navigate(-1)}
/>
```

**Props:**
- `article`: Article - The article to display
- `author?`: Object - Author profile information
  - `name?`: string - Display name
  - `picture?`: string - Profile picture URL
  - `npub?`: string - Nostr public key (npub format)
- `onBack?`: () => void - Back button handler
- `className?`: string - Additional CSS classes

**Features:**
- Full-width cover image with gradient overlay
- Article title and summary
- Topic tags
- Author info with avatar
- Publishing date and reading time
- Paywall indicator
- Share and bookmark buttons
- Back navigation button

---

### 3. PaywallGate

Paywall unlock component that displays payment options.

**Usage:**
```tsx
import { PaywallGate } from '@/components/articles';

<PaywallGate
  article={article}
  onUnlock={() => {
    setIsUnlocked(true);
    // Refresh content
  }}
  userPubkey={currentUser?.pubkey}
/>
```

**Props:**
- `article`: Article - Article with paywall configuration
- `onUnlock`: () => void - Callback when payment succeeds
- `className?`: string - Additional CSS classes
- `userPubkey?`: string - Current user's public key

**Features:**
- Displays price in sats with USD conversion
- Gradient fade effect above paywall
- Payment dialog with tabs for Lightning/Cashu
- Cashu token input and validation
- Lightning support (coming soon)
- Error handling and loading states
- Requires user to be logged in

**Payment Flow:**
1. User clicks "Unlock Article"
2. Payment dialog opens with payment method tabs
3. User pastes Cashu token (or pays Lightning invoice)
4. Token is validated and processed
5. Unlock record saved to IndexedDB
6. `onUnlock()` callback fires
7. Full content becomes visible

---

### 4. PublishDialog

Dialog for configuring and publishing articles.

**Usage:**
```tsx
import { PublishDialog, type PublishSettings } from '@/components/articles';

const [showPublish, setShowPublish] = useState(false);

const handlePublish = async (settings: PublishSettings) => {
  // Update article with settings
  await updateArticle({
    ...article,
    paywallEnabled: settings.paywallEnabled,
    paywallPrice: settings.paywallPrice,
    // ... other settings
  });

  // Publish to Nostr
  await publishToNostr(article);

  setShowPublish(false);
};

<PublishDialog
  article={article}
  open={showPublish}
  onOpenChange={setShowPublish}
  onPublish={handlePublish}
  isPublishing={isPublishing}
/>
```

**Props:**
- `article`: LocalArticle - The article to publish
- `open`: boolean - Dialog open state
- `onOpenChange`: (open: boolean) => void - Dialog state handler
- `onPublish`: (settings: PublishSettings) => void | Promise<void> - Publish handler
- `isPublishing?`: boolean - Loading state

**PublishSettings Type:**
```tsx
interface PublishSettings {
  paywallEnabled: boolean;
  paywallPrice?: number;
  paywallPreviewLength?: number;
  paywallMintUrl?: string;
  scheduledFor?: number; // Unix timestamp
}
```

**Features:**
- **Paywall Configuration:**
  - Enable/disable toggle
  - Price input (sats) with USD conversion
  - Preview length selector (1-8 paragraphs)
  - Cashu mint URL input

- **Schedule Publishing:**
  - Enable/disable scheduled publish
  - Date picker
  - Time picker
  - Validates future dates only

- **UI States:**
  - Loading state during publish
  - Validation for required fields
  - Cancel and publish buttons
  - Conditional button text (Publish Now vs Schedule)

---

## Integration Example

Here's a complete example of using these components in an article reading page:

```tsx
import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import {
  ArticleHeader,
  PaywallGate,
} from '@/components/articles';
import { checkArticleUnlock, getPaywalledContent } from '@/lib/paywall';
import { useCurrentUser } from '@/hooks/useCurrentUser';

export function ArticleReaderPage() {
  const { dTag } = useParams();
  const { user } = useCurrentUser();
  const [article, setArticle] = useState<Article | null>(null);
  const [isUnlocked, setIsUnlocked] = useState(false);

  // Check if user has unlocked this article
  useEffect(() => {
    async function checkUnlock() {
      if (user && article?.paywall) {
        const unlocked = await checkArticleUnlock(article.dTag, user.pubkey);
        setIsUnlocked(unlocked);
      }
    }
    checkUnlock();
  }, [user, article]);

  // Get paywalled content
  const { preview, premium, isComplete } = getPaywalledContent(
    article?.content || '',
    article?.paywall!,
    isUnlocked || !article?.paywall
  );

  return (
    <div>
      <ArticleHeader
        article={article}
        author={authorProfile}
        onBack={() => history.back()}
      />

      <div className="container max-w-2xl mx-auto px-4">
        {/* Free preview */}
        <div dangerouslySetInnerHTML={{ __html: renderMarkdown(preview) }} />

        {/* Paywall gate */}
        {!isComplete && (
          <PaywallGate
            article={article}
            onUnlock={() => setIsUnlocked(true)}
            userPubkey={user?.pubkey}
          />
        )}

        {/* Premium content (if unlocked) */}
        {isUnlocked && premium && (
          <div dangerouslySetInnerHTML={{ __html: renderMarkdown(premium) }} />
        )}
      </div>
    </div>
  );
}
```

## Dependencies

These components use:
- **shadcn/ui components**: Card, Avatar, Badge, Dialog, Button, Input, Switch, Tabs, Select
- **Library functions**:
  - `@/lib/article` - Article types and utilities
  - `@/lib/paywall` - Payment and unlock functions
  - `@/lib/storage` - LocalArticle type
  - `@/lib/utils` - cn() utility
- **External libraries**:
  - `react-router-dom` - Navigation and links
  - `date-fns` - Date formatting
  - `lucide-react` - Icons

## Related Files

- `/home/user/nostril/src/lib/article.ts` - Article types and NIP-23 functions
- `/home/user/nostril/src/lib/paywall.ts` - Paywall and payment logic
- `/home/user/nostril/src/lib/storage.ts` - Database schema and types
- `/home/user/nostril/docs/nostril-articles-spec.md` - Full specification
