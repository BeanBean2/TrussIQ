/**
 * Classroom privacy controls — models stay on-device by default;
 * cloud share / AI require explicit consent.
 */

import { removeStoredValue, readStoredValue, writeStoredValue } from './storage';

const PREFS_KEY = 'trussiq-privacy-prefs';

/** Prefs that are safe to keep after “clear private data” (UI chrome only). */
const UI_PREF_KEYS = new Set([
  'trussiq-theme',
  'trussiq-ui-scale',
  'trussiq-ui-sounds',
  'trussiq-sidebar-open',
  'trussiq-toolbar-open',
  'trussiq-toolbar-width',
  'trussiq-inspector-width',
  'trussiq-inspector-height',
  'trussiq-force-labels',
  'trussiq-auto-solve',
  'trussiq-display-units',
  'trussiq-result-palette',
  'trussiq-guide-dismissed',
  'trussiq-onboarding-complete',
  PREFS_KEY,
]);

export interface PrivacyPrefs {
  /** When true, never autosave models / briefs / library to localStorage. */
  privateSession: boolean;
  /** User acknowledged that share links encode the full model in the URL. */
  allowShareLinks: boolean;
  /** User consented to sending model context to Google Gemini. */
  allowCloudCoach: boolean;
  /** Include student/team/course fields on worksheets and review packets. */
  includePersonalFields: boolean;
}

const DEFAULT_PREFS: PrivacyPrefs = {
  privateSession: false,
  allowShareLinks: false,
  allowCloudCoach: false,
  includePersonalFields: false,
};

export function getPrivacyPrefs(): PrivacyPrefs {
  try {
    const raw = readStoredValue(PREFS_KEY);
    if (!raw) return { ...DEFAULT_PREFS };
    const parsed = JSON.parse(raw) as Partial<PrivacyPrefs>;
    return {
      privateSession: Boolean(parsed.privateSession),
      allowShareLinks: Boolean(parsed.allowShareLinks),
      allowCloudCoach: Boolean(parsed.allowCloudCoach),
      includePersonalFields: Boolean(parsed.includePersonalFields),
    };
  } catch {
    return { ...DEFAULT_PREFS };
  }
}

export function setPrivacyPrefs(patch: Partial<PrivacyPrefs>): PrivacyPrefs {
  const next = { ...getPrivacyPrefs(), ...patch };
  writeStoredValue(PREFS_KEY, JSON.stringify(next));
  return next;
}

/** Remove models, briefs, comments, API keys, and named projects from this browser. */
export function clearPrivateLocalData(): { removed: number } {
  const keepPrivateSession = getPrivacyPrefs().privateSession;
  let removed = 0;
  try {
    const keys: string[] = [];
    for (let i = 0; i < window.localStorage.length; i++) {
      const key = window.localStorage.key(i);
      if (key) keys.push(key);
    }
    for (const key of keys) {
      if (key.startsWith('trussiq-') && !UI_PREF_KEYS.has(key)) {
        window.localStorage.removeItem(key);
        removed += 1;
      }
    }
  } catch {
    // Storage may be blocked
  }
  removeStoredValue('trussiq-gemini-api-key');
  setPrivacyPrefs({
    ...DEFAULT_PREFS,
    privateSession: keepPrivateSession,
  });
  return { removed };
}

export function privacyStatusSummary(prefs: PrivacyPrefs = getPrivacyPrefs()): string {
  return [
    prefs.privateSession ? 'Private session on' : 'Local drafts on',
    prefs.allowShareLinks ? 'Share links allowed' : 'Share links locked',
    prefs.allowCloudCoach ? 'Cloud coach allowed' : 'Local coach only',
    prefs.includePersonalFields ? 'Names on exports' : 'Names omitted',
  ].join(' · ');
}
