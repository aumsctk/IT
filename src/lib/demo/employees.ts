/**
 * Demo data สำหรับ Employees
 */

export interface DemoEmployee {
  id:            string;
  full_name:     string;
  email:         string;
  phone:         string | null;
  employee_code: string;
  department:    string;
  job_title:     string;
  role:          "super_admin" | "it_support" | "general_user";
  is_active:     boolean;
  branch_id:     string;
  branch_name:   string;
  branch_code:   string;
  avatar_url:    string | null;
  // assigned seat
  seat_id:       string | null;
  seat_label:    string | null;
  room_name:     string | null;
  zone_name:     string | null;
  // assigned assets
  assets:        Array<{
    id: string; asset_tag: string; brand: string;
    model_name: string; category: string; status: string;
  }>;
  created_at:    string;
}

const d = (days: number) =>
  new Date(Date.now() - days * 86400000).toISOString();

export const DEMO_EMPLOYEES: DemoEmployee[] = [
  {
    id: "e001", full_name: "สมชาย ใจดี", email: "somchai@company.th",
    phone: "081-234-5678", employee_code: "EMP-001",
    department: "IT", job_title: "IT Manager",
    role: "it_support", is_active: true,
    branch_id: "b01", branch_name: "สำนักงานใหญ่ กรุงเทพ", branch_code: "BKK-HQ",
    avatar_url: null, seat_id: "s02", seat_label: "D-02",
    room_name: "IT Room", zone_name: "ชั้น 3 — เหนือ",
    assets: [
      { id: "a002", asset_tag: "IT-NB-00034", brand: "Lenovo", model_name: "ThinkPad X1 Carbon", category: "laptop",  status: "active" },
    ],
    created_at: d(730),
  },
  {
    id: "e002", full_name: "วรรณา สุขใส", email: "wanna@company.th",
    phone: "082-345-6789", employee_code: "EMP-002",
    department: "การตลาด", job_title: "Marketing Manager",
    role: "general_user", is_active: true,
    branch_id: "b01", branch_name: "สำนักงานใหญ่ กรุงเทพ", branch_code: "BKK-HQ",
    avatar_url: null, seat_id: "s03", seat_label: "D-03",
    room_name: "Open Office A", zone_name: "ชั้น 3 — เหนือ",
    assets: [
      { id: "a004", asset_tag: "IT-MN-00055", brand: "LG", model_name: "27UL600-W", category: "monitor", status: "active" },
    ],
    created_at: d(600),
  },
  {
    id: "e003", full_name: "ประภาส มั่นคง", email: "prapas@company.th",
    phone: "083-456-7890", employee_code: "EMP-003",
    department: "บัญชี", job_title: "Senior Accountant",
    role: "general_user", is_active: true,
    branch_id: "b01", branch_name: "สำนักงานใหญ่ กรุงเทพ", branch_code: "BKK-HQ",
    avatar_url: null, seat_id: "s01", seat_label: "D-01",
    room_name: "Open Office A", zone_name: "ชั้น 3 — เหนือ",
    assets: [
      { id: "a001", asset_tag: "IT-PC-00142", brand: "Dell", model_name: "OptiPlex 7090", category: "computer", status: "active" },
    ],
    created_at: d(500),
  },
  {
    id: "e004", full_name: "สุรีย์ แก้วใส", email: "suree@company.th",
    phone: "084-567-8901", employee_code: "EMP-004",
    department: "IT", job_title: "IT Support",
    role: "it_support", is_active: true,
    branch_id: "b01", branch_name: "สำนักงานใหญ่ กรุงเทพ", branch_code: "BKK-HQ",
    avatar_url: null, seat_id: "s04", seat_label: "D-04",
    room_name: "Open Office B", zone_name: "ชั้น 3 — ใต้",
    assets: [
      { id: "a005", asset_tag: "IT-PC-00201", brand: "Dell", model_name: "OptiPlex 5090", category: "computer", status: "under_repair" },
    ],
    created_at: d(450),
  },
  {
    id: "e005", full_name: "นภา ฟ้าสวย", email: "napa@company.th",
    phone: "085-678-9012", employee_code: "EMP-005",
    department: "ฝ่ายบุคคล", job_title: "HR Officer",
    role: "general_user", is_active: true,
    branch_id: "b01", branch_name: "สำนักงานใหญ่ กรุงเทพ", branch_code: "BKK-HQ",
    avatar_url: null, seat_id: null, seat_label: null,
    room_name: null, zone_name: null, assets: [],
    created_at: d(300),
  },
  {
    id: "e006", full_name: "กิตติ วงศ์ไทย", email: "kitti@company.th",
    phone: "086-789-0123", employee_code: "EMP-006",
    department: "ขาย", job_title: "Sales Executive",
    role: "general_user", is_active: true,
    branch_id: "b02", branch_name: "สาขาเชียงใหม่", branch_code: "CNX-01",
    avatar_url: null, seat_id: "s05", seat_label: "D-11",
    room_name: "Sales Room", zone_name: "ชั้น 1",
    assets: [
      { id: "a006", asset_tag: "IT-NB-00012", brand: "ASUS", model_name: "ExpertBook B9", category: "laptop", status: "active" },
    ],
    created_at: d(400),
  },
  {
    id: "e007", full_name: "มณีรัตน์ ทองดี", email: "manee@company.th",
    phone: null, employee_code: "EMP-007",
    department: "การตลาด", job_title: "Graphic Designer",
    role: "general_user", is_active: true,
    branch_id: "b01", branch_name: "สำนักงานใหญ่ กรุงเทพ", branch_code: "BKK-HQ",
    avatar_url: null, seat_id: null, seat_label: null,
    room_name: null, zone_name: null, assets: [],
    created_at: d(200),
  },
  {
    id: "e008", full_name: "อดิศักดิ์ พงษ์ดี", email: "adisak@company.th",
    phone: "088-901-2345", employee_code: "EMP-008",
    department: "บัญชี", job_title: "Finance Manager",
    role: "general_user", is_active: false,
    branch_id: "b01", branch_name: "สำนักงานใหญ่ กรุงเทพ", branch_code: "BKK-HQ",
    avatar_url: null, seat_id: null, seat_label: null,
    room_name: null, zone_name: null, assets: [],
    created_at: d(900),
  },
];

export const DEMO_DEPARTMENTS = ["IT", "การตลาด", "บัญชี", "ฝ่ายบุคคล", "ขาย"];

export function filterEmployees(
  employees: DemoEmployee[],
  opts: { search?: string; department?: string; branch_id?: string; is_active?: boolean }
) {
  let result = [...employees];
  if (opts.branch_id)            result = result.filter((e) => e.branch_id  === opts.branch_id);
  if (opts.department)           result = result.filter((e) => e.department === opts.department);
  if (opts.is_active !== undefined) result = result.filter((e) => e.is_active === opts.is_active);
  if (opts.search) {
    const q = opts.search.toLowerCase();
    result = result.filter((e) =>
      e.full_name.toLowerCase().includes(q) ||
      e.email.toLowerCase().includes(q) ||
      e.employee_code.toLowerCase().includes(q) ||
      e.department.toLowerCase().includes(q)
    );
  }
  return result;
}
