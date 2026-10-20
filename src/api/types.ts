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
  /**
   * Access approved during the trial, waiting for its end (C6): a paid billing period, or the platform's grant, that
   * starts at `startsAt` — the trial's own end. Null when none is (the business turns read-only at the end) and while
   * the trial is only available. Absent from an API older than it.
   */
  accessAfterTrial?: { kind: 'paid' | 'granted'; startsAt: string } | null;
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
 * The portal instructions (0099; docs/101 §5): one message, sent automatically once the Owner's WhatsApp number is
 * verified, naming the portal's one address — no link of its own, no token — and sent again only from this portal, by
 * the Owner signed in. WhatsApp first; email only for a reason the server records. `destinations` are the Owner's
 * verified contacts, masked by the server; the site never sees one whole. `history` is the business's latest requests,
 * newest first — an honest record, never a condition for claiming.
 */
export interface TrialSetup {
  /**
   * `waiting_for_contact` — the WhatsApp number is not verified yet; `sending` — asked for, not yet handed to a
   * provider; `sent` — a provider accepted it; `failed` — nothing could carry it (`failureReason`); `not_sent` — never
   * asked for.
   */
  delivery: 'waiting_for_contact' | 'sending' | 'not_sent' | 'sent' | 'failed';
  /** The channel the newest instructions went, or were to go, by. */
  channel: TrialChannel | null;
  /** That channel's destination, masked by the server; null when none was chosen. */
  destination: string | null;
  /** Why they went by email: WhatsApp could not carry them. */
  fallbackReason: FallbackReason | null;
  /** Why nothing carried them. */
  failureReason: FailureReason | null;
  /** UTC: when the newest instructions were asked for. */
  lastAttemptAt: string | null;
  /** UTC: when instructions were last accepted by a provider, whatever happened since. */
  lastSentAt: string | null;
  destinations: { channel: TrialChannel; masked: string }[];
  canResendNow: boolean;
  /**
   * Why a send again is not possible now — null exactly when `canResendNow`: `throttle` (only the limit stands in the
   * way, until `resendAvailableAt`), `unavailable` (nothing can carry them now: nothing to count down to),
   * `contact_unverified` (the WhatsApp number is not verified; it outranks the others).
   */
  resendBlockedBy: 'throttle' | 'unavailable' | 'contact_unverified' | null;
  /** The earliest instant the limit allows, or null when it allows now — whatever else may stand in the way. */
  resendAvailableAt: string | null;
  history: TrialSetupAttempt[];
}

export type TrialChannel = 'email' | 'whatsapp';

/**
 * Why a message went by email instead of WhatsApp — the only reasons there are (the owner's brief of 2026-10-18):
 * WhatsApp switched off, its approved template unavailable, the number not verified or undeliverable, the provider's
 * refusal, the retries used up, or a failure WhatsApp reported later.
 */
export type FallbackReason =
  /** D213: no operational WhatsApp consent in force for the number. */
  | 'consent_missing'
  /** D213: the Owner withdrew WhatsApp — email is a separate channel. */
  | 'consent_withdrawn'
  | 'whatsapp_disabled'
  | 'template_unavailable'
  | 'number_unverified'
  | 'number_undeliverable'
  | 'provider_refused'
  | 'retries_exhausted'
  | 'async_failed';

/**
 * Why nothing carried a message: WhatsApp could not and email could not either. `opted_out` and `no_consent` are kept
 * for messages decided before D213's correction, when a missing or withdrawn consent was never carried by email.
 */
export type FailureReason = 'opted_out' | 'no_consent' | 'no_email' | 'email_unavailable' | 'email_failed' | 'no_recipient';

/** One request for the instructions: the server's instant, what started it, and what became of it. */
export interface TrialSetupAttempt {
  at: string;
  trigger: 'automatic' | 'resend';
  delivery: 'sending' | 'not_sent' | 'sent' | 'failed';
  channel: TrialChannel | null;
  fallbackReason: FallbackReason | null;
  failureReason: FailureReason | null;
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
  | 'contact_unverified';

/**
 * The company's grace after a paid period (0099; docs/101 §3) — three activations of 72 hours in any rolling 12
 * months, each decided once by the server and recorded. `none` — no paid period has ended into a decision; `active` —
 * the 72 hours are running; `ended` — they ran out; `unavailable` — the period ended with the three already used.
 */
export interface GraceView {
  status: 'none' | 'active' | 'ended' | 'unavailable';
  startedAt: string | null;
  endsAt: string | null;
  hoursRemaining: number;
  /** While a paid period runs: whether its end, passing unrenewed, would start 72 hours of grace. Null otherwise. */
  availableAtPeriodEnd: boolean | null;
  allowance: number;
  windowMonths: number;
  durationHours: number;
  usesInWindow: number | null;
  usesRemaining: number | null;
  /** When the oldest activation in the window stops counting. */
  nextUseRestoredAt: string | null;
}

export type NoticeKind = 'portal_instructions' | 'trial_reminder' | 'trial_expired' | 'paid_reminder' | 'paid_expired' | 'grace_reminder' | 'grace_ended';

/** What became of a message: waiting, on its way, handed to a provider, delivered, not sent, cancelled or replaced. */
export type NoticeState = 'pending' | 'sending' | 'accepted' | 'delivered' | 'failed' | 'cancelled' | 'superseded';

/** The subscription messages' timeline, as the server keeps it: the next one due, and the newest one, whatever became of it. */
export interface NoticeTimeline {
  next: { kind: NoticeKind; threshold: string; dueAt: string } | null;
  last: {
    kind: NoticeKind;
    threshold: string;
    state: NoticeState;
    channel: TrialChannel | null;
    destination: string | null;
    fallbackReason: FallbackReason | null;
    failureReason: FailureReason | null;
    at: string;
  } | null;
}

/**
 * GET platform/my-subscription/status — what the portal shows above everything, each part decided by the server:
 * `operational` (the app works), `read_only` (records stay readable, nothing new is written) or `stopped`
 * (suspended, cancelled or refused); the paid period; the grace; the messages; and what the Owner may do now.
 */
export interface PortalStatus {
  access: 'operational' | 'read_only' | 'stopped';
  state: EntitlementState;
  period: { start: string | null; end: string | null };
  grace: GraceView;
  notices: NoticeTimeline;
  actions: { claimTrial: boolean; resendInstructions: boolean; paymentInstructions: boolean };
  timeZone: string;
  calculatedAt: string;
}

/**
 * A subscription message as the console lists it (GET platform/notices, GET platform/businesses/:id/notices; 0099): its
 * kind and threshold, what became of it, the channel, the destination masked as the Owner is shown it, and each reason
 * the server recorded — why it went by email, why nothing carried it, why it was cancelled. `resend`: the portal
 * instructions sent again at the Owner's request. `business` on the cross-business list only.
 */
export interface NoticeRow {
  id: string;
  kind: NoticeKind;
  threshold: string;
  variant: string | null;
  state: NoticeState;
  channel: TrialChannel | null;
  destination: string | null;
  fallbackReason: FallbackReason | null;
  failureReason: FailureReason | null;
  cancelReason: string | null;
  attempts: number;
  resend: boolean;
  dueAt: string;
  acceptedAt: string | null;
  completedAt: string | null;
  createdAt: string;
  business?: { id: string; name: string; publicStoreId: string };
}

export interface NoticeLog {
  rows: NoticeRow[];
  total: number;
  page: number;
  pageSize: number;
  /** Every message counted by state, whatever the filter. */
  byState: Record<NoticeState, number>;
}

export interface BusinessNotices {
  timeline: NoticeTimeline;
  messages: NoticeRow[];
}

/** One paid period end's grace decision as recorded (0099): granted, or none because the allowance was used. */
export interface GraceEpisodeRow {
  id: string;
  business: { id: string; name: string; publicStoreId: string };
  decision: 'granted' | 'refused';
  periodEnd: string;
  startedAt: string;
  endsAt: string;
  /** Granted activations already counted in the 12 months before it. */
  usesBefore: number;
  recordedBy: 'evaluation' | 'sweeper' | 'lifecycle';
  recordedAt: string;
  /** Granted, within its 72 hours, and still the period's grace: not renewed past it, not stopped. */
  running: boolean;
  timeZone: string;
}

/** GET platform/grace — the grace decisions, newest first, and how they stand now. */
export interface GraceUsage {
  rules: { allowance: number; windowMonths: number; durationHours: number };
  summary: { running: number; atAllowance: number; withUse: number };
  rows: GraceEpisodeRow[];
  total: number;
  page: number;
  pageSize: number;
  calculatedAt: string;
}

/** A free trial claimed on the portal, as the console lists it. */
export interface TrialClaimRow {
  id: string;
  business: { id: string; name: string; publicStoreId: string };
  registrationMethod: 'email' | 'phone' | 'both' | null;
  status: 'active' | 'expired';
  claimedAt: string;
  endsAt: string;
  expiryRecordedAt: string | null;
  termsVersion: string;
  timeZone: string;
}

/** GET platform/trial-claims — the trials claimed, newest first, and the eligible businesses that have not claimed. */
export interface TrialClaims {
  summary: { active: number; expired: number; eligibleUnclaimed: number };
  rows: TrialClaimRow[];
  total: number;
  page: number;
  pageSize: number;
  calculatedAt: string;
}

/**
 * GET platform/payment-instructions — how to pay, once the platform offers a provider with its real code; until then
 * `available: false` with no provider and no code (never a stand-in).
 */
export interface PaymentInstructions {
  available: boolean;
  providers: { key: string; label: string; code: string }[];
  defaultProvider: string | null;
}

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
  /** The grace after the paid period, and the allowance (0099). Absent from an API older than it. */
  grace?: GraceView;
  /** The business's configured zone: every date of the entitlement is shown in it. Absent from an API older than it. */
  timeZone?: string;
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
  /**
   * The business's configured zone, checked as the trial's is: an unknown zone reads UTC (C18). The history dates the
   * trial's own rows in it when no trial view carries a zone — a business whose chance to claim closed unused. Absent
   * from an API older than it.
   */
  timeZone?: string;
}

/**
 * `scheduled` (D176, 2026-10-15): a store or seat whose payment the platform confirmed while the business's free trial
 * ran. It is paid, but in force nowhere and counted nowhere until it starts — when the trial ends, with the first paid
 * month — so it is never charged at once and again by that month. It cannot be withdrawn, refused or released.
 */
export type SeatRequestStatus = 'pending_payment' | 'paid' | 'granted' | 'released' | 'refused' | 'scheduled';

/**
 * When a scheduled store or seat starts (D176), as the server computes it: `startsAt` is its UTC instant — the end the
 * trial's claim recorded — and `timeZone` the business's zone, the one it is shown in. `waitsFor` says what it waits
 * for: `trial_end` — paid access is approved for when the trial ends, so it starts then; `paid_access` — nothing is
 * approved yet, so it starts with the first paid month, once paid access is.
 */
export interface SeatActivation {
  startsAt: string;
  timeZone: string;
  waitsFor: 'trial_end' | 'paid_access';
}

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
  /**
   * When a store or seat paid for during a free trial took effect, or will (D176): for a scheduled row, the trial's
   * end; once it started, the instant it did. Null for every other row — those took effect when they were confirmed.
   */
  effectiveAt: string | null;
  /** A scheduled row's start, as the server computes it (D176); null for every other row. */
  activation: SeatActivation | null;
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
  /** Persistent test businesses (D217): left out of every figure above. Absent from an API older than 0102. */
  testBusinesses?: number;
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
  /** The subscription's own status (`pending_activation`, …), `unknown`, or `incomplete` for an application with no business. */
  status: string;
  /** The state the server computes for the business, a free trial's included (C8). Absent from an API older than it. */
  state?: EntitlementState;
  /** The business's free trial, when it has or may claim one (C8). Absent from an API older than it. */
  trial?: TrialSummary | null;
}

/**
 * A business's free trial as a console list carries it, one way for the applications queue (C8) and the businesses
 * list (C18): its status, its end once claimed, and the business's zone — the one the row's dates are told in. Null
 * for a business with no trial it has or may claim.
 */
export interface TrialSummary {
  status: 'available' | 'active' | 'expired';
  endsAt: string | null;
  timeZone: string;
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
  /** The business's free trial, when it has or may claim one (C18). Absent from an API older than it. */
  trial?: TrialSummary | null;
  /** A persistent test business (D217). Absent from an API older than 0102. */
  isTest?: boolean;
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
  /** A persistent test business (D217). Absent from an API older than 0102. */
  isTest?: boolean;
  /** Provisioning and activation, separately (D217). Absent from an API older than 0102. */
  setup?: ProvisioningStatus | null;
}

/** Where the Owner's setup invitation stands (0075): the newest one, or none was ever issued. */
export type InvitationState = 'none' | 'active' | 'expired' | 'accepted' | 'revoked';

/** A WhatsApp number's consent, as the server reads it (D213). */
export type ConsentState = 'none' | 'pending' | 'active' | 'outdated' | 'withdrawn' | 'superseded';

/**
 * Where a business stands on two separate questions (D217): is it built and can its Owner sign in (provisioning), and
 * may it work (activation — the subscription's status). Never a credential.
 */
export interface ProvisioningStatus {
  isTest: boolean;
  testMarkedAt: string | null;
  testMarkedBy: string | null;
  customerActivation: 'open' | 'closed';
  createdBy: 'console' | 'self_service' | 'other';
  provisioning: 'awaiting_owner_setup' | 'ready';
  owner: {
    name: string;
    passwordSet: boolean | null;
    phone: { present: boolean; verified: boolean; whatsappConsent: ConsentState | null };
    email: { present: boolean; verified: boolean };
    lastLoginAt: string | null;
  } | null;
  invitation: {
    state: InvitationState;
    issuedAt: string | null;
    issuedBy: string | null;
    expiresAt: string | null;
    acceptedAt: string | null;
    revokedAt: string | null;
  };
  activation: { status: string | null; complimentaryUntil: string | null };
}

/** The Owner's setup invitation, as it is issued: the token is in this answer once, and nowhere else, ever. */
export interface IssuedInvitation {
  token: string;
  expiresAt: string;
  delivery: 'manual';
  owner: { name: string; destinationMasked: string | null };
  replaced?: number;
}

/** POST platform/businesses: the business, and its Owner's invitation when this request made it. */
export interface CreatedBusiness {
  companyId: string;
  publicStoreId: string;
  created: boolean;
  invitation: IssuedInvitation | null;
  /** The business exists but its invitation could not be issued: the console issues one from the business. */
  invitationFailed?: boolean;
  setup?: ProvisioningStatus | null;
}

/** POST platform/businesses/:id/stores (D217): granted under a test business's grant, or a customer's priced request. */
export interface ConsoleStoreResult {
  mode: 'granted' | 'requested';
  created: boolean;
  allocation: SeatRequest;
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
