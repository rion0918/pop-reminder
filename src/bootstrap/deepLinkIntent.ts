export type DeepLinkIntent = { action: 'add' } | { action: 'view'; id: string };

export function parseDeepLinkIntent(url: string): DeepLinkIntent | null {
  const queryStart = url.indexOf('?');
  if (queryStart < 0) return null;

  const params = new URLSearchParams(url.slice(queryStart + 1));
  const action = params.get('action');
  if (action === 'add') return { action };

  const id = params.get('id');
  if (action === 'view' && id) return { action, id };
  return null;
}

export function createDeepLinkIntentBuffer() {
  let pending: DeepLinkIntent | null = null;
  let lastUrl: string | null = null;

  return {
    receive(url: string) {
      const intent = parseDeepLinkIntent(url);
      if (!intent || url === lastUrl) return false;
      lastUrl = url;
      pending = intent;
      return true;
    },
    consume() {
      const intent = pending;
      pending = null;
      lastUrl = null;
      return intent;
    },
  };
}
