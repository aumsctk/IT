export type MockEmployee = {
  id: string;
  emp_code: string;
  full_name: string;
  nickname?: string;
  email: string;
  phone?: string;
  department: string;
  position: string;
  branch: string;
  seat_label?: string;
  seat_id?: string;
  asset_tag?: string;
  asset_name?: string;
  avatar_url?: string;
  status: "active" | "inactive" | "on_leave";
  start_date: string;
};

export const MOCK_EMPLOYEES: MockEmployee[] = [
  {
    id: "emp001",
    emp_code: "EMP-001",
    full_name: "สมชาย ใจดี",
    nickname: "ชาย",
    email: "somchai@company.co.th",
    phone: "081-234-5678",
    department: "Information Technology",
    position: "IT Manager",
    branch: "สำนักงานใหญ่",
    seat_label: "A-01",
    seat_id: "seat001",
    asset_tag: "IT-NB-001",
    asset_name: "Dell Latitude 5540",
    status: "active",
    start_date: "2019-03-01",
  },
  {
    id: "emp002",
    emp_code: "EMP-002",
    full_name: "สมหญิง รักษ์ดี",
    nickname: "หญิง",
    email: "somying@company.co.th",
    phone: "082-345-6789",
    department: "Human Resources",
    position: "HR Specialist",
    branch: "สำนักงานใหญ่",
    seat_label: "B-03",
    seat_id: "seat002",
    asset_tag: "IT-PC-005",
    asset_name: "HP EliteDesk 800",
    status: "active",
    start_date: "2020-07-15",
  },
  {
    id: "emp003",
    emp_code: "EMP-003",
    full_name: "วิชัย ประสงค์ดี",
    nickname: "ชัย",
    email: "wichai@company.co.th",
    phone: "083-456-7890",
    department: "Finance",
    position: "Senior Accountant",
    branch: "สำนักงานใหญ่",
    seat_label: "C-07",
    seat_id: "seat003",
    asset_tag: "IT-NB-008",
    asset_name: "Lenovo ThinkPad E14",
    status: "active",
    start_date: "2018-01-10",
  },
  {
    id: "emp004",
    emp_code: "EMP-004",
    full_name: "นภา สวรรค์",
    nickname: "ต้อม",
    email: "napa@company.co.th",
    phone: "084-567-8901",
    department: "Marketing",
    position: "Marketing Executive",
    branch: "สาขาเชียงใหม่",
    seat_label: "A-02",
    seat_id: "seat004",
    status: "active",
    start_date: "2021-05-20",
  },
  {
    id: "emp005",
    emp_code: "EMP-005",
    full_name: "ธนวัฒน์ เจริญสุข",
    nickname: "เก่ง",
    email: "tanawat@company.co.th",
    phone: "085-678-9012",
    department: "Operations",
    position: "Operations Supervisor",
    branch: "สาขาเชียงใหม่",
    seat_label: "B-01",
    seat_id: "seat005",
    asset_tag: "IT-PC-012",
    asset_name: "Dell OptiPlex 3090",
    status: "active",
    start_date: "2022-02-28",
  },
  {
    id: "emp006",
    emp_code: "EMP-006",
    full_name: "อรณี ทองคำ",
    nickname: "อ้อย",
    email: "oranee@company.co.th",
    department: "Procurement",
    position: "Procurement Officer",
    branch: "สำนักงานใหญ่",
    status: "on_leave",
    start_date: "2020-11-01",
  },
  {
    id: "emp007",
    emp_code: "EMP-007",
    full_name: "ประสิทธิ์ แสงทอง",
    nickname: "อ้วน",
    email: "prasit@company.co.th",
    phone: "087-890-1234",
    department: "Information Technology",
    position: "IT Support",
    branch: "สำนักงานใหญ่",
    seat_label: "A-05",
    seat_id: "seat007",
    asset_tag: "IT-NB-015",
    asset_name: "HP ProBook 450",
    status: "active",
    start_date: "2023-01-15",
  },
  {
    id: "emp008",
    emp_code: "EMP-008",
    full_name: "ขวัญใจ พิทักษ์",
    nickname: "ขวัญ",
    email: "kwanjai@company.co.th",
    department: "Legal",
    position: "Legal Counsel",
    branch: "สาขาภูเก็ต",
    seat_label: "C-02",
    seat_id: "seat008",
    status: "active",
    start_date: "2017-09-01",
  },
  {
    id: "emp009",
    emp_code: "EMP-009",
    full_name: "จักรกฤษณ์ มีสุข",
    nickname: "จักร",
    email: "jakkrit@company.co.th",
    department: "Sales",
    position: "Sales Representative",
    branch: "สาขาภูเก็ต",
    status: "inactive",
    start_date: "2022-06-01",
  },
  {
    id: "emp010",
    emp_code: "EMP-010",
    full_name: "ปรียา วงษ์สุวรรณ",
    nickname: "ปุ้ม",
    email: "preeya@company.co.th",
    phone: "090-012-3456",
    department: "Information Technology",
    position: "System Administrator",
    branch: "สำนักงานใหญ่",
    seat_label: "A-06",
    seat_id: "seat010",
    asset_tag: "IT-NB-022",
    asset_name: "MacBook Pro 14",
    status: "active",
    start_date: "2021-08-01",
  },
];

export const DEFAULT_DEPARTMENTS = [
  "เทคโนโลยีสารสนเทศ",
  "ทรัพยากรบุคคล",
  "การเงิน-บัญชี",
  "การตลาด",
  "ปฏิบัติการ",
  "จัดซื้อ",
  "นิติกรรม",
  "ขาย",
];

export function getDepartments(): string[] {
  if (typeof window === "undefined") return DEFAULT_DEPARTMENTS;
  try {
    const stored = localStorage.getItem("itam_departments");
    return stored ? JSON.parse(stored) : DEFAULT_DEPARTMENTS;
  } catch { return DEFAULT_DEPARTMENTS; }
}

export function saveDepartments(list: string[]): void {
  try { localStorage.setItem("itam_departments", JSON.stringify(list)); } catch {}
}

// Keep for backward compat
export const DEPARTMENTS = DEFAULT_DEPARTMENTS;

export const BRANCHES = ["ศูนย์ฯนครราชสีมา"];
