import { useEffect, useRef, useState, type FormEvent } from 'react';
import type { PaymentInstructions, PaymentProof, SeatRequest } from '../../api/types';
import { ownerRequest } from '../../auth/owner';
import { ErrorNotice, Money, Notice } from '../../components/ui';
import { useI18n, type Key } from '../../i18n';
import { formatDate } from '../../lib/format';

const MAX_BYTES = 5 * 1024 * 1024;
const MONTHS = [1, 3, 12] as const;
const monthsKey = (m: number): Key => (m === 1 ? 'portal.plans.months.1' : m === 3 ? 'portal.plans.months.3' : 'portal.plans.months.12');
/** What the server accepts as the number paid from: digits with an optional +, spaces, dots and dashes dropped. */
export const payerPhoneValid = (raw: string) => /^\+?\d{6,20}$/.test(raw.trim().replace(/[\s.-]/g, ''));

/** The open proof (sent, not yet decided) that pays for this waiting store, if any. */
export function openProofFor(storeId: string, proofs: PaymentProof[] | null): PaymentProof | null {
  return proofs?.find((p) => (p.status === 'submitted' || p.status === 'under_review') && p.lines?.some((l) => l.branchId.toLowerCase() === storeId.toLowerCase())) ?? null;
}

