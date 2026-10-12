/**
 * Decisions the published texts wait for (docs/74 §7). A sentence that depends on one carries `[[blocker:id]]`; a
 * preview shows it as pending, and a production build refuses while any id below is still used in a published text.
 * Resolving one means writing the decided sentence in all three languages and removing the token — never inventing
 * the answer here.
 */
export interface Blocker {
  id: string;
  /** Who decides, and what — English, for the release message and the docs. */
  summary: string;
}

export const BLOCKERS: readonly Blocker[] = [
  { id: 'legal_review', summary: 'The privacy policy, terms and deletion page are drafts written from the code; a legal adviser must review and approve them.' },
  { id: 'retention_period', summary: 'The legal retention period for business and accounting records (Mauritanian commercial and tax law) is not decided (docs/64 §6).' },
  { id: 'processors', summary: 'Hosting, database, backup and email providers are not selected (docs/45 D4–D7); the policy must name them once contracted.' },
  { id: 'international_transfer', summary: 'Whether personal data is processed outside Mauritania depends on the hosting choice; the policy must say where.' },
  { id: 'sealed_history', summary: 'Deletion cannot edit the hash-chained audit trail, subscription and platform audit events, or append-only money-agent records, which may hold names or contacts written before 2026-10-12 (docs/24); a legal adviser must approve this disclosure.' },
  { id: 'backup_retention', summary: 'How long backups are kept is not supplied by TSX-MR: deletion removes data from active storage at once, and backups expire on that schedule. Production stays blocked until TSX-MR fixes it.' },
  { id: 'governing_law', summary: 'Governing law, jurisdiction and dispute resolution for the terms of service are not decided.' },
  { id: 'liability', summary: 'Limitation of liability and service-level wording for the terms of service are not decided.' },
];

export function blockerById(id: string): Blocker | undefined {
  return BLOCKERS.find((b) => b.id === id);
}
