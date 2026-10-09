/** Response shapes, as the API sends them (docs/68). The site renders these and derives none of them. */

export type EntitlementState = 'pending' | 'active' | 'grace' | 'expired' | 'complimentary' | 'suspended' | 'cancelled' | 'rejected';

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
  status: string;
  calculatedAt: string;
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
  /** Per month for a seat or a store; for an activity change, the difference for this month. */
  monthlyAmount: number;
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
  newStore: { activity: Activity; monthly: number }[];
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
