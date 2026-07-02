import { ActivationStat, ClientActivationStatus, AccountInformation } from "@my-app/contract";
import type {
  ActivatorDashboardDTO,
  ActiveRequestDTO,
  PendingActivationDTO,
  ActivatorHistoryItemDTO,
  RecentActivationDTO,
  KeyVerificationDTO,
} from "@my-app/contract";

export const MOCK_USERS = [
  { username: "ahmed", password: "ahmed123", display_name: "Ahmed Benali" },
  { username: "sara", password: "sara123", display_name: "Sara Mehdaoui" },
];

// Public key-flow mock, shaped as KeyVerificationDTO. `key` is not part of the DTO
// (the client already knows it — they typed it) but is kept alongside for lookup/display.
export interface MockKeyRecord extends KeyVerificationDTO {
  key: string;
}

const daysAgo = (n: number) => new Date(Date.now() - n * 24 * 60 * 60 * 1000).toISOString();

export const MOCK_KEYS: MockKeyRecord[] = [
  { key: "SV-2026-AAAA-1111", status: ClientActivationStatus.READY },
  {
    key: "SV-2026-BBBB-2222",
    status: ClientActivationStatus.PROCESSING,
    submittedFields: [
      { fieldLabel: "Full Name", value: "Youcef Khedim" },
      { fieldLabel: "Phone Number", value: "0551234567" },
      { fieldLabel: "Snapchat Username", value: "youcef_snap" },
      { fieldLabel: "Snapchat Email", value: "youcef@gmail.com" },
      { fieldLabel: "Snapchat Phone", value: "0551234567" },
    ],
  },
  {
    key: "SV-2026-CCCC-3333",
    status: ClientActivationStatus.NEEDS_CORRECTION,
    flaggedFields: [
      { field: AccountInformation.USERNAME, label: "Snapchat Username" },
      { field: AccountInformation.PASSWORD, label: "Password" },
    ],
  },
  { key: "SV-2026-DDDD-4444", status: ClientActivationStatus.NEEDS_OTP },
  { key: "SV-2026-EEEE-5555", status: ClientActivationStatus.ACTIVATED, accountUsername: "fatima_z" },
  { key: "SV-2026-FFFF-6666", status: ClientActivationStatus.ACTIVATED, accountUsername: "nadia_b" },
  { key: "SV-2026-GGGG-7777", status: ClientActivationStatus.FAILED },
];

export function lookupKey(input: string): MockKeyRecord {
  const found = MOCK_KEYS.find((k) => k.key.toUpperCase() === input.trim().toUpperCase());
  if (found) return found;
  return { key: input, status: ClientActivationStatus.INVALID };
}

export const MOCK_DASHBOARD: ActivatorDashboardDTO = {
  totalEarnings: 18500,
  earningsTrendPercent: 12,
  creditsBalance: 0,
  totalActivations: 47,
  activationsToday: 5,
  avgActivationTimeSeconds: 204,
  activeSlotsUsed: 2,
  weekly: [
    { date: daysAgo(6), count: 8 },
    { date: daysAgo(5), count: 6 },
    { date: daysAgo(4), count: 9 },
    { date: daysAgo(3), count: 5 },
    { date: daysAgo(2), count: 7 },
    { date: daysAgo(1), count: 4 },
    { date: daysAgo(0), count: 8 },
  ],
};

export const MOCK_GLOBAL_RECENT: RecentActivationDTO[] = [
  { id: "rec-1", subscriptionLabel: "Snapchat+ 1 Month", keyMasked: "SV-…-A1B2", completedAt: daysAgo(0), state: ActivationStat.ACTIVATED },
  { id: "rec-2", subscriptionLabel: "Snapchat+ 3 Months", keyMasked: "SV-…-C3D4", completedAt: daysAgo(0), state: ActivationStat.ACTIVATED },
  { id: "rec-3", subscriptionLabel: "Snapchat+ 1 Month", keyMasked: "SV-…-E5F6", completedAt: daysAgo(0), state: ActivationStat.ACTIVATED },
  { id: "rec-4", subscriptionLabel: "Snapchat+ 1 Month", keyMasked: "SV-…-G7H8", completedAt: daysAgo(1), state: ActivationStat.ACTIVATED_BY_ADMIN },
  { id: "rec-5", subscriptionLabel: "Snapchat+ 1 Year", keyMasked: "SV-…-I9J0", completedAt: daysAgo(1), state: ActivationStat.ACTIVATED },
  { id: "rec-6", subscriptionLabel: "Snapchat+ 1 Month", keyMasked: "SV-…-K1L2", completedAt: daysAgo(1), state: ActivationStat.ACTIVATED },
  { id: "rec-7", subscriptionLabel: "Snapchat+ 3 Months", keyMasked: "SV-…-M3N4", completedAt: daysAgo(2), state: ActivationStat.ACTIVATED },
  { id: "rec-8", subscriptionLabel: "Snapchat+ 1 Month", keyMasked: "SV-…-O5P6", completedAt: daysAgo(2), state: ActivationStat.ACTIVATED },
  { id: "rec-9", subscriptionLabel: "Snapchat+ 1 Month", keyMasked: "SV-…-Q7R8", completedAt: daysAgo(2), state: ActivationStat.ACTIVATED },
  { id: "rec-10", subscriptionLabel: "Snapchat+ 1 Year", keyMasked: "SV-…-S9T0", completedAt: daysAgo(3), state: ActivationStat.ACTIVATED },
];

export const MOCK_PERSONAL_HISTORY: ActivatorHistoryItemDTO[] = [
  { id: "hist-1", subscriptionLabel: "Snapchat+ 1 Month", key: "SV-2026-AAAA-1111", state: ActivationStat.ACTIVATED, requestedAt: daysAgo(3), takenAt: daysAgo(3), completedAt: daysAgo(3), durationSeconds: 195, earning: 350, client: { fullName: "Youcef Khedim", phone: "0551234567" } },
  { id: "hist-2", subscriptionLabel: "Snapchat+ 3 Months", key: "SV-2026-BBBB-2222", state: ActivationStat.ACTIVATED, requestedAt: daysAgo(3), takenAt: daysAgo(3), completedAt: daysAgo(3), durationSeconds: 240, earning: 800, client: { fullName: "Amina Boudjemaa", phone: "0661234567" } },
  { id: "hist-3", subscriptionLabel: "Snapchat+ 1 Month", key: "SV-2026-CCCC-3333", state: ActivationStat.CANCELLED_BY_ACTIVATOR, requestedAt: daysAgo(4), takenAt: daysAgo(4), completedAt: null, durationSeconds: null, earning: null, client: { fullName: "Karim Rahmani", phone: "0771234567" } },
  { id: "hist-4", subscriptionLabel: "Snapchat+ 1 Month", key: "SV-2026-DDDD-4444", state: ActivationStat.ACTIVATED, requestedAt: daysAgo(4), takenAt: daysAgo(4), completedAt: daysAgo(4), durationSeconds: 180, earning: 350, client: { fullName: "Fatima Zerrouki", phone: "0551239999" } },
  { id: "hist-5", subscriptionLabel: "Snapchat+ 1 Year", key: "SV-2026-EEEE-5555", state: ActivationStat.WRONG_INFORMATION, requestedAt: daysAgo(5), takenAt: daysAgo(5), completedAt: null, durationSeconds: null, earning: null, client: { fullName: "Mohamed Saidi", phone: "0661230000" } },
  { id: "hist-6", subscriptionLabel: "Snapchat+ 1 Month", key: "SV-2026-FFFF-6666", state: ActivationStat.ACTIVATED, requestedAt: daysAgo(5), takenAt: daysAgo(5), completedAt: daysAgo(5), durationSeconds: 310, earning: 350, client: { fullName: "Nadia Belkacem", phone: "0771230001" } },
  { id: "hist-7", subscriptionLabel: "Snapchat+ 3 Months", key: "SV-2026-GGGG-7777", state: ActivationStat.ACTIVATED, requestedAt: daysAgo(6), takenAt: daysAgo(6), completedAt: daysAgo(6), durationSeconds: 205, earning: 800, client: { fullName: "Rachid Hamdi", phone: "0551230002" } },
  { id: "hist-8", subscriptionLabel: "Snapchat+ 1 Month", key: "SV-2026-HHHH-8888", state: ActivationStat.REMOVED_FROM_ACTIVATOR, requestedAt: daysAgo(6), takenAt: daysAgo(6), completedAt: null, durationSeconds: null, earning: null, client: { fullName: "Samia Touati", phone: "0661230003" } },
  { id: "hist-9", subscriptionLabel: "Snapchat+ 1 Month", key: "SV-2026-IIII-9999", state: ActivationStat.ACTIVATED, requestedAt: daysAgo(7), takenAt: daysAgo(7), completedAt: daysAgo(7), durationSeconds: 175, earning: 350, client: { fullName: "Omar Benslimane", phone: "0771230004" } },
  { id: "hist-10", subscriptionLabel: "Snapchat+ 3 Months", key: "SV-2026-JJJJ-0000", state: ActivationStat.ACTIVATED, requestedAt: daysAgo(7), takenAt: daysAgo(7), completedAt: daysAgo(7), durationSeconds: 260, earning: 800, client: { fullName: "Lina Messaoudi", phone: "0551230005" } },
  { id: "hist-11", subscriptionLabel: "Snapchat+ 1 Month", key: "SV-2026-KKKK-1112", state: ActivationStat.ACTIVATED, requestedAt: daysAgo(8), takenAt: daysAgo(8), completedAt: daysAgo(8), durationSeconds: 190, earning: 350, client: { fullName: "Ali Ferhat", phone: "0661230006" } },
  { id: "hist-12", subscriptionLabel: "Snapchat+ 1 Year", key: "SV-2026-LLLL-2223", state: ActivationStat.ACTIVATED, requestedAt: daysAgo(9), takenAt: daysAgo(9), completedAt: daysAgo(9), durationSeconds: 420, earning: 2000, client: { fullName: "Houda Larbi", phone: "0771230007" } },
];

export const MOCK_ACTIVE_REQUESTS: ActiveRequestDTO[] = [
  {
    id: "req-1",
    subscriptionLabel: "Snapchat+ 1 Month",
    key: "SV-2026-WORK-0001",
    takenAt: new Date(Date.now() - 3 * 60 * 1000).toISOString(),
    state: ActivationStat.PROCESSING,
    distributor: { storeName: "TechShop Alger", wilayaName: "Algiers", communeName: "Bab Ezzouar" },
    client: { fullName: "Mohamed Ali", phone: "0551234567" },
    accountFields: [
      { fieldLabel: "Snapchat Username", value: "moh_ali_snap" },
      { fieldLabel: "Snapchat Email", value: "mohali@gmail.com" },
      { fieldLabel: "Snapchat Phone", value: "0551234567" },
      { fieldLabel: "Password", value: "MyP@ssw0rd!" },
    ],
    otpValue: null,
    freezeReason: null,
  },
  {
    id: "req-2",
    subscriptionLabel: "Snapchat+ 3 Months",
    key: "SV-2026-WORK-0002",
    takenAt: new Date(Date.now() - 7 * 60 * 1000).toISOString(),
    state: ActivationStat.ADDITIONAL_INFORMATION,
    distributor: { storeName: "DigiStore", wilayaName: "Oran", communeName: "Oran Centre" },
    client: { fullName: "Amine Bouzid", phone: "0661239876" },
    accountFields: [
      { fieldLabel: "Snapchat Username", value: "amine_bz" },
      { fieldLabel: "Snapchat Email", value: "amine.bz@gmail.com" },
      { fieldLabel: "Snapchat Phone", value: "0661239876" },
      { fieldLabel: "Password", value: "Amine2026!" },
    ],
    otpValue: null,
    freezeReason: null,
  },
];

export const MOCK_PENDING_POOL: PendingActivationDTO[] = [
  { id: "pend-1", subscriptionLabel: "Snapchat+ 1 Month", keyMasked: "SV-…-X1Y2", requestedAt: new Date(Date.now() - 14 * 60 * 1000).toISOString() },
  { id: "pend-2", subscriptionLabel: "Snapchat+ 3 Months", keyMasked: "SV-…-Z3W4", requestedAt: new Date(Date.now() - 8 * 60 * 1000).toISOString() },
  { id: "pend-3", subscriptionLabel: "Snapchat+ 1 Month", keyMasked: "SV-…-A5B6", requestedAt: new Date(Date.now() - 3 * 60 * 1000).toISOString() },
  { id: "pend-4", subscriptionLabel: "Snapchat+ 1 Year", keyMasked: "SV-…-C7D8", requestedAt: new Date(Date.now() - 1 * 60 * 1000).toISOString() },
];

export function formatTime(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function formatDZD(amount: number) {
  return new Intl.NumberFormat("en-US").format(amount) + " DZD";
}
