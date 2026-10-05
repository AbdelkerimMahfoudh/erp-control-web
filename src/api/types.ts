/** Response shapes, as the API sends them (docs/68). The site renders these and derives none of them. */

export type EntitlementState = 'pending' | 'active' | 'grace' | 'expired' | 'complimentary' | 'suspended' | 'cancelled' | 'rejected';

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

export interface PlanVersion {
  id?: string;
  version: number;
  branchMonthly: number;
  includedStaffPerBranch: number;
  extraStaffMonthly: number;
  effectiveFrom: string;
  reason?: string;
  createdBy?: string;
  state?: 'in_force' | 'scheduled';
}

export interface PublicPlan {
  version: number;
  branchMonthly: number;
  includedSeatsPerStore: number;
  extraSeatMonthly: number;
  currency: 'MRU';
  effectiveFrom: string;
  upcoming: { version: number; branchMonthly: number; includedSeatsPerStore: number; extraSeatMonthly: number; effectiveFrom: string } | null;
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

export interface MySubscription {
  business: { name: string; city: string | null; createdAt: string; branches: { name: string; type: string }[] };
  owner: { name: string; email: string | null; phone: string | null; emailVerified: boolean; phoneVerified: boolean } | null;
  entitlement: Entitlement;
  pricing: Pricing;
  events: TimelineEvent[];
  payments: PaymentRow[];
}

export type SeatRequestStatus = 'pending_payment' | 'paid' | 'granted' | 'released' | 'refused';

export interface SeatRequest {
  id: string;
  kind: 'seat' | 'store';
  status: SeatRequestStatus;
  store: { id: string; name: string } | null;
  person: { id: string; name: string } | null;
  label: string | null;
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
  branches: { id: string; name: string; type: string }[];
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
