/**
 * The three release verdicts (the owner's brief of 2026-10-17; docs/96), from one environment. Pure: the verdict
 * script (`scripts/release-verdicts.mjs`) and the tests call it.
 *
 * - `PUBLIC_WEBSITE`: the pre-launch corporate website, a public build. What this repository can decide is decided
 *   here (inputs, origin, approved pre-launch texts, nothing forbidden); the built site's headers, links, accessibility
 *   and absence of portal or API code are checked on the build itself (the script's `--dist`, CI's browser run).
 * - `PORTAL`: a full build, plus what only a running backend can show. It stays NO-GO until those are proven.
 * - `APP_STORE`: the service's texts approved with no blocker, a deletion channel declared, plus what only the backend,
 *   the app and App Store Connect can show (WhatsApp deletion working end to end, the mobile release check, docs/94).
 *   It stays NO-GO until those are proven. Nothing here loosens a check of the app, the backend or the portal.
 */
import { readInputs, releaseProblems, type Gate, type ReleaseProblem } from './schema';
import { publishedBlockers, publishedDrafts, publishedPlaceholders } from '../content';

export interface Verdict {
  gate: Gate;
  go: boolean;
  problems: ReleaseProblem[];
}

/** What must be proven outside this repository before the gate can open; never assumed. */
export const EXTERNAL_CONDITIONS: Record<'PORTAL' | 'APP_STORE', readonly string[]> = {
  PORTAL: [
    'The Dukan ERP backend runs in production at VITE_API_BASE, migrated with its matching API and configured (docs/78)',
    'Its operational channels are configured and proven: the email provider and WhatsApp delivery (D166)',
  ],
  APP_STORE: [
    'Account deletion works end to end by WhatsApp in production: the signed delivery proof (`npm run whatsapp:prove`) and a real deletion completed (F01 / O-A7)',
    'The mobile release check passes on the store build (erp-mobile: production origins, bundle audit, no development tools)',
    'Every App Store gate of docs/94 passes (identity, logo, privacy labels, demo account, export compliance, device checks)',
  ],
};

const external = (gate: 'PORTAL' | 'APP_STORE'): ReleaseProblem[] => EXTERNAL_CONDITIONS[gate].map((detail) => ({ problem: 'external', detail: `not proven here: ${detail}` }));

function contentState(surface: 'public' | 'full') {
  return { blockers: publishedBlockers(surface), drafts: publishedDrafts(surface), placeholders: publishedPlaceholders(surface) };
}

export function releaseVerdicts(env: Record<string, string | undefined>): Verdict[] {
  const pub = contentState('public');
  const svc = contentState('full');
  const publicProblems = releaseProblems({ ...env, VITE_SITE_SURFACE: 'public' }, pub.blockers, pub);
  const portalProblems = [...releaseProblems({ ...env, VITE_SITE_SURFACE: 'full' }, svc.blockers, svc), ...external('PORTAL')];

  const app: ReleaseProblem[] = [];
  for (const b of svc.blockers) app.push({ problem: 'legal_blocker', detail: `${b.id}: ${b.summary}` });
  for (const d of svc.drafts) app.push({ problem: 'legal_draft', detail: `${d}: the service text the app opens is still marked DRAFT — REQUIRES TSX-MR APPROVAL` });
  for (const t of svc.placeholders) app.push({ problem: 'placeholder', detail: `a published text is a placeholder: “${t.slice(0, 80)}”` });
  const { deletionChannel } = readInputs(env, 'production').inputs;
  if (deletionChannel !== 'whatsapp') app.push({ env: 'VITE_ACCOUNT_DELETION_CHANNEL', problem: deletionChannel ? 'malformed' : 'missing', detail: 'the deletion channel the app relies on (whatsapp), once working end to end in production' });
  app.push(...external('APP_STORE'));

  return [
    { gate: 'PUBLIC_WEBSITE', go: publicProblems.length === 0, problems: publicProblems },
    { gate: 'PORTAL', go: false, problems: portalProblems },
    { gate: 'APP_STORE', go: false, problems: app },
  ];
}
