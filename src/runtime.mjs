import { resolve, relative, isAbsolute } from 'node:path';
import { homedir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { BrainStore } from './store.mjs';
import { makeMacAdapters, sourcePaths } from './mac-sources.mjs';
import { AdapterError, normalizePluginPage } from './adapters.mjs';
import { ConfidantEngine } from './engine.mjs';
import { ActionService } from './signals.mjs';

export const defaultBrainDirectory = () => resolve(homedir(), 'Library/Application Support/Confidant MVP/brain');
export function createAssistedContext(directory, { paths, now = () => new Date().toISOString(), resetDeleted = false, pluginPage } = {}) {
  const repository = fileURLToPath(new URL('..', import.meta.url));
  const rel = relative(repository, resolve(directory));
  if (!rel.startsWith('..') && !isAbsolute(rel)) throw new Error('A real brain must be outside the installer repository. Choose a dedicated private directory on your Mac.');
  const store = new BrainStore(directory, { mode: 'assisted-local', resetDeleted });
  try {
    const configuredPaths = paths ?? store.get('sourcePaths') ?? (id => sourcePaths(homedir(), id)[id]);
    const authorized = id => store.source(id)?.authorized === true && !store.source(id)?.disabled && !store.get('profile', {}).exclusions?.sources?.includes(id) && !store.get('paused', false);
    const adapters = makeMacAdapters({ paths: configuredPaths, authorized });
    for (const id of ['gmail', 'outlook', 'fathom', 'fireflies']) adapters[id] = { id, kind: 'cloud', fixture: false, async readPage(request) {
      if (!authorized(id)) throw new AdapterError('permission_denied', 'Cloud source consent is required.');
      const source = store.source(id);
      if (!source.cloudExposureConsent && !source.queryFilteringVerified) throw new AdapterError('permission_denied', 'Cloud exposure approval or verified pre-read filtering is required before reading the supplied plugin page.');
      if (!pluginPage) throw new AdapterError('provider_proof_required', 'Connected plugin enumeration and provider-specific history/privacy proof are required. This worker cannot call an account API.');
      const envelope = typeof pluginPage === 'function' ? pluginPage(id) : pluginPage;
      if (!envelope || envelope.source !== id) throw new AdapterError('provider_proof_required', 'The page belongs to a different or unknown provider.');
      if (envelope.expectedCursor !== request.cursor) throw new AdapterError('stale_cursor', 'The plugin page does not match the saved cursor.');
      return normalizePluginPage({ source: id, page: envelope.page, mode: 'live', providerProof: envelope.providerProof });
    } };
    const engine = new ConfidantEngine(store, adapters, { mode: 'assisted-local', now });
    return { store, engine, actions: new ActionService(engine) };
  } catch (error) { store.close(); throw error; }
}
