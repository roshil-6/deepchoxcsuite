export type OauthReturnIntent = {
  openNameVenture: boolean;
};

const WORKSPACE_KEY = 'deepchox-workspace';
const PENDING_NAME_VENTURE_KEY = 'deepchox-pending-name-venture';

export function persistEnterWorkspace(opts?: Pick<OauthReturnIntent, 'openNameVenture'>): void {
  try {
    sessionStorage.setItem(WORKSPACE_KEY, '1');
    if (opts?.openNameVenture) {
      sessionStorage.setItem(PENDING_NAME_VENTURE_KEY, '1');
    }
  } catch {
    /* ignore */
  }
}

/** For `useState` initializer — survives React Strict Mode remounts after OAuth redirect. */
export function readPersistedWorkspaceStarted(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return sessionStorage.getItem(WORKSPACE_KEY) === '1';
  } catch {
    return false;
  }
}

export function consumePendingNameVenture(): boolean {
  try {
    if (sessionStorage.getItem(PENDING_NAME_VENTURE_KEY) !== '1') return false;
    sessionStorage.removeItem(PENDING_NAME_VENTURE_KEY);
    return true;
  } catch {
    return false;
  }
}

export function clearWorkspacePersistence(): void {
  try {
    sessionStorage.removeItem(WORKSPACE_KEY);
    sessionStorage.removeItem(PENDING_NAME_VENTURE_KEY);
  } catch {
    /* ignore */
  }
}
