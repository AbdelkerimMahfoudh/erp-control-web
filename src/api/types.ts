/** Response shapes, as the API sends them (docs/68). The site renders these and derives none of them. */

/**
 * The three trial states (2026-10-13) are computed by the server from the trial's own facts, like every other state:
 * `trial_available` — a self-registered business that may claim its one free trial and has not; `trial_active` — the
 * seven days are running; `trial_expired` — they ended and no paid access started (read-only, no grace).
 */
export type EntitlementState =
  | 'pending'
  | 'active'
  | 'grace'
  | 'expired'
  | 'complimentary'
  | 'suspended'
  | 'cancelled'
  | 'rejected'
  | 'trial_available'
  | 'trial_active'
  | 'trial_expired';

/**
 * The free trial as the server tells it: its instants are UTC values the server recorded at the claim (null while it
 * is only available), and `timeZone` is the business's configured zone, the one every trial date is shown in. The
 * site renders these; it never adds the seven days itself.
 */
export interface TrialView {
  status: 'available' | 'active' | 'expired';
  durationHours: number;
  durationDays: number;
  claimedAt: string | null;
  startedAt: string | null;
  endsAt: string | null;
  timeZone: string;
}

export type TrialContact = 'email' | 'phone';

/**
 * What a claim made now would record (GET platform/my-subscription/trial): the terms version, and the start and end
 * the server would set — refreshed while shown, so the end stays honest. `available: false` with a `reason` is a
 * business that could claim once something is fixed (a contact to verify, a suspension lifted).
 */
export interface TrialOffer {
  available: boolean;
  reason: TrialRefusalCode | null;
  termsVersion: string;
  durationHours: number;
  wouldStartAt: string;
  wouldEndAt: string;
  timeZone: string;
  requiredContacts: TrialContact[];
  missingContacts: TrialContact[];
}

/**
 * The setup instructions sent automatically once the Owner's contacts are verified, and their resend from this
 * website only. `destinations` are the Owner's verified contacts, masked by the server; the site never sees one whole.
 * `history` is the business's last attempts, newest first — an honest record, never a condition for claiming.
 */
export interface TrialSetup {
  /** `sending`: a link went out less than a minute ago and its providers have not all answered yet (C1). */
  delivery: 'waiting_for_contact' | 'sending' | 'not_sent' | 'sent' | 'failed' | 'unavailable';
  sentTo: TrialChannel[];
  destinations: { channel: TrialChannel; masked: string }[];
  lastAttemptAt: string | null;
  canResendNow: boolean;
  /**
   * Why a send again is not possible now — null exactly when `canResendNow`: `throttle` (only the limit stands in the
   * way, until `resendAvailableAt`), `unavailable` (no verified contact's channel can carry it now: nothing to count
   * down to), `contact_unverified` (a required contact is not verified; it outranks the others).
   */
  resendBlockedBy: 'throttle' | 'unavailable' | 'contact_unverified' | null;
  /** The earliest instant the limit allows, or null when it allows now — whatever else may stand in the way. */
  resendAvailableAt: string | null;
  history: TrialSetupAttempt[];
}

export type TrialChannel = 'email' | 'whatsapp';

/**
 * What one channel did with one attempt: `accepted` — its provider took the message; `failed` — the provider refused
 * or erred; `unavailable` — a verified contact whose channel could not carry it; `not_applicable` — not a verified
 * contact of the Owner, so nothing was tried there.
 */
export type TrialSetupOutcome = 'accepted' | 'failed' | 'unavailable' | 'not_applicable';

/** One attempt: the server's instant, what started it (the send after verification, or the Owner's), each channel's outcome. */
export interface TrialSetupAttempt {
  at: string;
  trigger: 'automatic' | 'resend';
  email: TrialSetupOutcome;
  whatsapp: TrialSetupOutcome;
}

/** GET platform/my-subscription/trial — the Owner's only (anyone else is refused 403 `owner_only`). */
export interface TrialStatus {
  state: EntitlementState;
  trial: TrialView | null;
  offer: TrialOffer | null;
  /** Present only while the state is `trial_available`. */
  setup: TrialSetup | null;
  calculatedAt: string;
}

/** POST platform/my-subscription/trial/link — what the setup link is worth for the signed-in Owner. Never consumes it. */
export type TrialLinkOutcome = 'valid' | 'expired' | 'used' | 'revoked' | 'invalid' | 'other_account';

export interface TrialLinkCheck {
  link: TrialLinkOutcome;
  offer: TrialOffer | null;
  trial: TrialView | null;
  state: EntitlementState;
}

/** POST platform/my-subscription/trial/claim — 201 the first time, 200 when the same attempt is replayed. */
export interface TrialClaimResult {
  claimed: true;
  replayed: boolean;
  state: 'trial_active';
  trial: TrialView;
  subscriptionVersion: number;
}

/** Every refusal of the claim, by its code; the page says each one in words. */
export type TrialRefusalCode =
  | 'owner_only'
  | 'idempotency_conflict'
  | 'trial_already_claimed'
  | 'business_closed'
  | 'business_suspended'
  | 'business_refused'
  | 'trial_not_available'
  | 'terms_changed'
  | 'contact_unverified'
  | 'link_invalid'
  | 'link_expired'
  | 'link_used'
  | 'link_revoked'
  | 'link_other_account';

/**
 * What a branch is subscribed to do (D154, docs/73 §3): the electronics store,
 * the money services agent counter, or both. Every field that carries one is
 * optional here because an API older than the activity does not send it, and
 * the site then shows nothing rather than a guess.
 */
export type Activity = 'electronics' | 'money_agent' | 'both';

export interface BranchSeats {
  branchId: string;
  name: string;
  seatsUsed: number;
  paidSeats: number;
  grantedSeats: number;
  includedSeats: number;
  seatLimit: number;
  seatsAvailable: number;
  overLimit: boolean;
  activity?: Activity;
  /** A change waiting for the next renewal, or null. */
  activityNext?: Activity | null;
}

export interface Entitlement {
  state: EntitlementState;
  periodEnd: string | null;
  graceEnd: string | null;
  daysRemaining: number | null;
  graceHoursRemaining: number;
  subscribedBranchCount: number;
  activeBranchCount: number;
  includedSeats: number;
  additionalSeats: number;
  seatLimit: number;
  seatsUsed: number;
  overLimit: boolean;
  seatsByStore: BranchSeats[];
  canRead: boolean;
  canWrite: boolean;
  isComplimentary: boolean;
  /** The platform's grant with its own dates (docs/73 §11.5). Absent from an API older than 2026-10-10. */
  complimentary?: ComplimentaryGrant;
  /** The free trial, when the business has or may claim one. Absent from an API older than the trial. */
  trial?: TrialView | null;
  status: string;
  calculatedAt: string;
}

/**
 * A platform grant as the server tells it: never a paid period's date in its place. `ended` — it ran out and access
 * follows the paid period; `superseded` — a paid period now runs past it (`paidUntil`); `indefinite` — no end recorded.
 */
export interface ComplimentaryGrant {
  status: 'none' | 'active' | 'ended' | 'superseded' | 'indefinite';
  until: string | null;
  paidUntil: string | null;
}

export interface QuoteLine {
  branchId: string | null;
  name: string;
  activity?: Activity;
  /** What this branch's activity costs per month, priced by the server. */
  activityFee?: number;
  staffCount: number;
  includedSeats: number;
  paidSeats: number;
  grantedSeats: number;
  seatLimit: number;
  seatsAvailable: number;
  overLimit: boolean;
  seatFee: number;
}

export interface Quote {
  branchMonthly: number;
  agentMonthly?: number;
  bothMonthly?: number;
  extraStaffMonthly: number;
  includedSeatsPerStore: number;
  activeBranchCount: number;
  activeStaffCount: number;
  includedStaffCount: number;
  paidSeatCount: number;
  grantedSeatCount: number;
  chargeableStaffCount: number;
  branchFee: number;
  staffFee: number;
  monthlyTotal: number;
  currency: 'MRU';
  lines: QuoteLine[];
}

/** The three monthly prices a plan version carries; `branchMonthly` stays the electronics store's. */
export interface ActivityPrices {
  branchMonthly: number;
  agentMonthly?: number;
  bothMonthly?: number;
}

export interface PlanVersion extends ActivityPrices {
  id?: string;
  version: number;
  includedStaffPerBranch: number;
  extraStaffMonthly: number;
  effectiveFrom: string;
  reason?: string;
  createdBy?: string;
  state?: 'in_force' | 'scheduled';
}

export interface PublicPlan extends ActivityPrices {
  version: number;
  includedSeatsPerStore: number;
  extraSeatMonthly: number;
  currency: 'MRU';
  effectiveFrom: string;
  upcoming: (ActivityPrices & { version: number; includedSeatsPerStore: number; extraSeatMonthly: number; effectiveFrom: string }) | null;
}

export interface Pricing {
  plan: PlanVersion;
  upcomingPlan: PlanVersion | null;
  quote: Quote;
  currentPeriod: {
    periodStart: string | null;
    assessedBranchFee: number;
    assessedStaffFee: number;
    assessedTotal: number;
    adjustments: number;
    available: boolean;
  };
  nextRenewalEstimate: Quote;
  currency: 'MRU';
}

export interface TimelineEvent {
  id: string;
  kind: string;
  note: string | null;
  actor: string | null;
  periodEndAfter: string | null;
  createdAt: string;
}

export interface PaymentRow {
  id: string;
  amount: string;
  currency: string;
  channel: string;
  reference: string | null;
  note: string | null;
  paidAt: string;
  recordedBy: string;
  confirmedBy: string | null;
  confirmedAt: string | null;
  providerVerified: false;
}

/** One of the business's active branches, as `GET platform/my-subscription` lists it. */
export interface SubscriptionBranch {
  /** The UUID an activity request names the branch by. Absent from an older API. */
  id?: string;
  name: string;
  type: string;
  activity?: Activity;
  activityNext?: Activity | null;
  activityChangedAt?: string | null;
}

export interface MySubscription {
  business: { name: string; city: string | null; createdAt: string; branches: SubscriptionBranch[] };
  owner: { name: string; email: string | null; phone: string | null; emailVerified: boolean; phoneVerified: boolean } | null;
  entitlement: Entitlement;
  pricing: Pricing;
  events: TimelineEvent[];
  payments: PaymentRow[];
}

export type SeatRequestStatus = 'pending_payment' | 'paid' | 'granted' | 'released' | 'refused';

export interface SeatRequest {
  id: string;
  kind: 'seat' | 'store' | 'activity';
  status: SeatRequestStatus;
  store: { id: string; name: string } | null;
  person: { id: string; name: string } | null;
  label: string | null;
  branchId?: string | null;
  branchName?: string | null;
  /** An activity change: what the branch does and what was asked. A store request carries the new store's activity in `activityTo`. */
  activityFrom?: Activity | null;
  activityTo?: Activity | null;
  /** `now` once the difference is paid; `renewal` for a change that waits for the next renewal. */
  activityEffective?: 'now' | 'renewal' | null;
  /**
   * Per month for a seat or a store; for an activity change, the difference for this month. A store that replaces one
   * closed this paid month (`replaces`, D158) carries this period's difference instead — 0 when nothing more is due —
   * and the full monthly price from the renewal.
   */
  monthlyAmount: number;
  /** The store a store request replaces, and what this period already paid for it. Absent from an older API. */
  replaces?: { branchId: string; name: string; credit: number } | null;
  currency: string;
  requestedBy: string;
  requestedAt: string;
  confirmedBy: string | null;
  confirmedAt: string | null;
  closedAt: string | null;
  closedBy: string | null;
  reason: string | null;
  payment: { id: string; amount: string; reference: string | null; paidAt: string; channel: string } | null;
  version: number;
  providerVerified: false;
  business?: { id: string; name: string; publicStoreId: string };
}

/** The answer to every Owner request (seat, store, activity): the row, and whether this call created it. */
export interface RequestResult {
  allocation: SeatRequest;
  created: boolean;
}

/**
 * One activity a store could be asked to take, as the server would answer the request now (D154): `dueNow` is what
 * the request would put awaiting payment, `monthlyAfter` what the store pays per month once the next paid period
 * opens. A refused one names the request standing in its way.
 */
export type ActivityOption =
  | { activity: Activity; outcome: 'now' | 'renewal' | 'keep' | 'requested'; dueNow: number; monthlyAfter: number }
  | { activity: Activity; outcome: 'refused'; code: 'activity_request_pending'; blockedBy: Activity; dueNow: 0; monthlyAfter: null };

/** GET platform/my-subscription/activity-options: every store's options, and what a new store would be charged. */
export interface ActivityOptions {
  running: boolean;
  stores: { branchId: string; name: string; activity: Activity; activityNext: Activity | null; options: ActivityOption[] }[];
  newStore: NewStoreOption[];
}

/**
 * What a new store of one activity would cost, as the request would decide it now (D158): `monthly` its full price,
 * `dueNow` what the request would put awaiting payment, and `replaces` the store closed during this paid month whose
 * month it takes over — then `dueNow` is only the difference, or nothing.
 */
export interface NewStoreOption {
  activity: Activity;
  monthly: number;
  dueNow?: number;
  replaces?: { branchId: string; name: string; credit: number } | null;
}

export interface Dashboard {
  byState: Record<EntitlementState, number>;
  businesses: number;
  branches: number;
  activeUsers: number;
  pendingSeatRequests: number;
  pendingStaff: number;
  revenue: null;
  calculatedAt: string;
}

export interface PendingApplication {
  id: string;
  companyId: string | null;
  businessName: string;
  ownerName: string;
  city: string | null;
  email: string | null;
  phone: string | null;
  language: string;
  registeredAt: string;
  status: string;
}

export interface BusinessRow {
  id: string;
  name: string;
  publicStoreId: string;
  city: string | null;
  createdAt: string;
  branches: number;
  users: number;
  state: EntitlementState;
  status: string;
  periodEnd: string | null;
  /** The grant with its own dates (docs/73 §11.5). Absent from an API older than 2026-10-10. */
  complimentary?: ComplimentaryGrant | null;
  version: number;
}

export interface BusinessList {
  rows: BusinessRow[];
  total: number;
  page: number;
  pageSize: number;
}

export interface Person {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  emailVerified: boolean;
  phoneVerified: boolean;
  isActive: boolean;
  status: 'active' | 'pending' | 'inactive';
  lastLoginAt: string | null;
}

export interface BusinessDetail {
  id: string;
  name: string;
  publicStoreId: string;
  city: string | null;
  createdAt: string;
  branches: { id: string; name: string; type: string; activity?: Activity; activityNext?: Activity | null }[];
  people: Person[];
  entitlement: Entitlement | null;
  pricing: Pricing | null;
  version: number;
  events: TimelineEvent[];
  payments: PaymentRow[];
  /** The trial's recorded facts, for the console only. Absent from an API older than the trial. */
  trial?: BusinessTrial | null;
}

/**
 * A business's trial as recorded: the eligibility written when it registered itself (closed once paid access, a grant,
 * a refusal or a cancellation is decided), and the claim — immutable, its end recorded once it passed. Both null for a
 * business created from the console or before the trial existed. `timeZone` is the business's, for the dates.
 */
export interface BusinessTrial {
  eligibility: {
    registrationMethod: 'email' | 'phone' | 'both';
    createdAt: string;
    closedAt: string | null;
    closedReason: 'approved' | 'granted' | 'paid_period' | 'refused' | 'cancelled' | null;
  } | null;
  claim: {
    claimedAt: string;
    startedAt: string;
    endsAt: string;
    expiryRecordedAt: string | null;
  } | null;
  timeZone?: string;
}

export interface AuditEvent {
  id: string;
  actor: string;
  action: string;
  targetType: string;
  targetLabel: string | null;
  reason: string | null;
  createdAt: string;
}

export interface AdminIdentity {
  id: string;
  email: string;
  name: string;
}
