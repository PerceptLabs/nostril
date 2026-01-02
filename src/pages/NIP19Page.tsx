import { nip19 } from 'nostr-tools';
import { useParams, Navigate } from 'react-router-dom';
import NotFound from './NotFound';

// Known paths that should not be treated as NIP-19 identifiers
const KNOWN_PATHS = ['', 'inbox', 'library', 'collections', 'search', 'settings', 'about', 'login', 'signup'];

export function NIP19Page() {
  const { nip19: identifier } = useParams<{ nip19: string }>();

  // If no identifier, return NotFound
  if (!identifier) {
    return <NotFound />;
  }

  // If it's a known path, redirect to the proper route
  if (KNOWN_PATHS.includes(identifier)) {
    return <Navigate to={`/${identifier}`} replace />;
  }

  // Try to decode as NIP-19 identifier
  let decoded;
  try {
    decoded = nip19.decode(identifier);
  } catch {
    return <NotFound />;
  }

  const { type } = decoded;

  switch (type) {
    case 'npub':
    case 'nprofile':
      // AI agent should implement profile view here
      return <div>Profile placeholder</div>;

    case 'note':
      // AI agent should implement note view here
      return <div>Note placeholder</div>;

    case 'nevent':
      // AI agent should implement event view here
      return <div>Event placeholder</div>;

    case 'naddr':
      // AI agent should implement addressable event view here
      return <div>Addressable event placeholder</div>;

    default:
      return <NotFound />;
  }
}