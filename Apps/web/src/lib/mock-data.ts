export type KeyStatus =
  | "ACTIVE"
  | "PENDING"
  | "INFORMATION_ERROR"
  | "OTP_REQUIRED"
  | "COMPLETED"
  | "USED"
  | "DISABLED"
  | "NOT_FOUND";

export interface ClientData {
  full_name: string;
  phone: string;
  snap_username: string;
  snap_email: string;
  snap_phone?: string;
}

export interface MockKey {
  key: string;
  status: KeyStatus;
  client_data?: ClientData;
  error_fields?: string[];
  snap_username?: string;
}

export const MOCK_USERS = [
  { username: "ahmed", password: "ahmed123", display_name: "Ahmed Benali" },
  { username: "sara", password: "sara123", display_name: "Sara Mehdaoui" },
];

export const MOCK_KEYS: MockKey[] = [
  { key: "SV-2026-AAAA-1111", status: "ACTIVE" },
  {
    key: "SV-2026-BBBB-2222",
    status: "PENDING",
    client_data: {
      full_name: "Youcef Khedim",
      phone: "0551234567",
      snap_username: "youcef_snap",
      snap_email: "youcef@gmail.com",
      snap_phone: "0551234567",
    },
  },
  {
    key: "SV-2026-CCCC-3333",
    status: "INFORMATION_ERROR",
    client_data: {
      full_name: "Amina Boudjemaa",
      phone: "0661234567",
      snap_username: "amina_bou",
      snap_email: "amina@gmail.com",
      snap_phone: "0661234567",
    },
    error_fields: ["snap_username", "password"],
  },
  {
    key: "SV-2026-DDDD-4444",
    status: "OTP_REQUIRED",
    client_data: {
      full_name: "Karim Rahmani",
      phone: "0771234567",
      snap_username: "karim_r",
      snap_email: "karim@gmail.com",
    },
  },
  { key: "SV-2026-EEEE-5555", status: "COMPLETED", snap_username: "fatima_z" },
  { key: "SV-2026-FFFF-6666", status: "USED" },
  { key: "SV-2026-GGGG-7777", status: "DISABLED" },
];

export const MOCK_STATS = {
  total_earnings: 18500,
  earnings_trend: 12,
  total_activations: 47,
  activations_today: 5,
  avg_activation_time: 204,
  active_slots_used: 2,
  weekly_chart: [
    { day: "Mon", count: 8 },
    { day: "Tue", count: 6 },
    { day: "Wed", count: 9 },
    { day: "Thu", count: 5 },
    { day: "Fri", count: 7 },
    { day: "Sat", count: 4 },
    { day: "Sun", count: 8 },
  ],
};

export const MOCK_GLOBAL_RECENT = [
  { activator: "Ahmed Benali", subscription: "Snapchat+ 1 Month", key: "SV-…-A1B2", email: "client1@gmail.com" },
  { activator: "Sara Mehdaoui", subscription: "Snapchat+ 3 Months", key: "SV-…-C3D4", email: "client2@gmail.com" },
  { activator: "Ahmed Benali", subscription: "Snapchat+ 1 Month", key: "SV-…-E5F6", email: "client3@gmail.com" },
  { activator: "Sara Mehdaoui", subscription: "Snapchat+ 1 Month", key: "SV-…-G7H8", email: "client4@gmail.com" },
  { activator: "Ahmed Benali", subscription: "Snapchat+ 1 Year", key: "SV-…-I9J0", email: "client5@gmail.com" },
  { activator: "Sara Mehdaoui", subscription: "Snapchat+ 1 Month", key: "SV-…-K1L2", email: "client6@gmail.com" },
  { activator: "Ahmed Benali", subscription: "Snapchat+ 3 Months", key: "SV-…-M3N4", email: "client7@gmail.com" },
  { activator: "Sara Mehdaoui", subscription: "Snapchat+ 1 Month", key: "SV-…-O5P6", email: "client8@gmail.com" },
  { activator: "Ahmed Benali", subscription: "Snapchat+ 1 Month", key: "SV-…-Q7R8", email: "client9@gmail.com" },
  { activator: "Sara Mehdaoui", subscription: "Snapchat+ 1 Year", key: "SV-…-S9T0", email: "client10@gmail.com" },
];

export type HistoryStatus = "COMPLETED" | "CANCELLED" | "INFORMATION_ERROR" | "ACTIVATION_ERROR";
export interface PersonalHistoryRow {
  subscription: string;
  client: string;
  phone: string;
  key: string;
  status: HistoryStatus;
  time: number;
  earning: number;
}
export const MOCK_PERSONAL_HISTORY: PersonalHistoryRow[] = [
  { subscription: "Snapchat+ 1 Month", client: "Youcef Khedim", phone: "0551234567", key: "SV-2026-AAAA-1111", status: "COMPLETED", time: 195, earning: 350 },
  { subscription: "Snapchat+ 3 Months", client: "Amina Boudjemaa", phone: "0661234567", key: "SV-2026-BBBB-2222", status: "COMPLETED", time: 240, earning: 800 },
  { subscription: "Snapchat+ 1 Month", client: "Karim Rahmani", phone: "0771234567", key: "SV-2026-CCCC-3333", status: "CANCELLED", time: 0, earning: 0 },
  { subscription: "Snapchat+ 1 Month", client: "Fatima Zerrouki", phone: "0551239999", key: "SV-2026-DDDD-4444", status: "COMPLETED", time: 180, earning: 350 },
  { subscription: "Snapchat+ 1 Year", client: "Mohamed Saidi", phone: "0661230000", key: "SV-2026-EEEE-5555", status: "INFORMATION_ERROR", time: 0, earning: 0 },
  { subscription: "Snapchat+ 1 Month", client: "Nadia Belkacem", phone: "0771230001", key: "SV-2026-FFFF-6666", status: "COMPLETED", time: 310, earning: 350 },
  { subscription: "Snapchat+ 3 Months", client: "Rachid Hamdi", phone: "0551230002", key: "SV-2026-GGGG-7777", status: "COMPLETED", time: 205, earning: 800 },
  { subscription: "Snapchat+ 1 Month", client: "Samia Touati", phone: "0661230003", key: "SV-2026-HHHH-8888", status: "ACTIVATION_ERROR", time: 0, earning: 0 },
  { subscription: "Snapchat+ 1 Month", client: "Omar Benslimane", phone: "0771230004", key: "SV-2026-IIII-9999", status: "COMPLETED", time: 175, earning: 350 },
  { subscription: "Snapchat+ 3 Months", client: "Lina Messaoudi", phone: "0551230005", key: "SV-2026-JJJJ-0000", status: "COMPLETED", time: 260, earning: 800 },
  { subscription: "Snapchat+ 1 Month", client: "Ali Ferhat", phone: "0661230006", key: "SV-2026-KKKK-1112", status: "COMPLETED", time: 190, earning: 350 },
  { subscription: "Snapchat+ 1 Year", client: "Houda Larbi", phone: "0771230007", key: "SV-2026-LLLL-2223", status: "COMPLETED", time: 420, earning: 2000 },
];

export type RequestSubStatus = "IN_PROGRESS" | "AWAITING_OTP" | "AWAITING_CORRECTION" | "ADMIN_REVIEW";
export interface ActiveRequest {
  id: string;
  subscription: string;
  key: string;
  taken_at: string;
  sub_status: RequestSubStatus;
  distributor: { store: string; wilaya: string; commune: string };
  client_name: string;
  client_phone: string;
  snap_username: string;
  snap_email: string;
  snap_phone: string;
  snap_password: string;
}
export const MOCK_ACTIVE_REQUESTS: ActiveRequest[] = [
  {
    id: "req-1",
    subscription: "Snapchat+ 1 Month",
    key: "SV-2026-WORK-0001",
    taken_at: new Date(Date.now() - 3 * 60 * 1000).toISOString(),
    sub_status: "IN_PROGRESS",
    distributor: { store: "TechShop Alger", wilaya: "Algiers", commune: "Bab Ezzouar" },
    client_name: "Mohamed Ali",
    client_phone: "0551234567",
    snap_username: "moh_ali_snap",
    snap_email: "mohali@gmail.com",
    snap_phone: "0551234567",
    snap_password: "MyP@ssw0rd!",
  },
  {
    id: "req-2",
    subscription: "Snapchat+ 3 Months",
    key: "SV-2026-WORK-0002",
    taken_at: new Date(Date.now() - 7 * 60 * 1000).toISOString(),
    sub_status: "AWAITING_OTP",
    distributor: { store: "DigiStore", wilaya: "Oran", commune: "Oran Centre" },
    client_name: "Amine Bouzid",
    client_phone: "0661239876",
    snap_username: "amine_bz",
    snap_email: "amine.bz@gmail.com",
    snap_phone: "0661239876",
    snap_password: "Amine2026!",
  },
];

export interface PendingRequest {
  id: string;
  subscription: string;
  key_masked: string;
  created_at: string;
}
export const MOCK_PENDING_POOL: PendingRequest[] = [
  { id: "pend-1", subscription: "Snapchat+ 1 Month", key_masked: "SV-…-X1Y2", created_at: new Date(Date.now() - 14 * 60 * 1000).toISOString() },
  { id: "pend-2", subscription: "Snapchat+ 3 Months", key_masked: "SV-…-Z3W4", created_at: new Date(Date.now() - 8 * 60 * 1000).toISOString() },
  { id: "pend-3", subscription: "Snapchat+ 1 Month", key_masked: "SV-…-A5B6", created_at: new Date(Date.now() - 3 * 60 * 1000).toISOString() },
  { id: "pend-4", subscription: "Snapchat+ 1 Year", key_masked: "SV-…-C7D8", created_at: new Date(Date.now() - 1 * 60 * 1000).toISOString() },
];

export function lookupKey(input: string): MockKey {
  const found = MOCK_KEYS.find((k) => k.key.toUpperCase() === input.trim().toUpperCase());
  if (found) return found;
  return { key: input, status: "NOT_FOUND" };
}

export function formatTime(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function formatDZD(amount: number) {
  return new Intl.NumberFormat("en-US").format(amount) + " DZD";
}
