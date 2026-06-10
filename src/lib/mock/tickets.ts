export type MockTicket = {
  id: string;
  ticket_number: string;
  type: "withdraw" | "return" | "repair" | "relocation" | "other";
  status: "open" | "in_progress" | "pending_approval" | "resolved" | "closed" | "rejected";
  priority: "low" | "medium" | "high" | "critical";
  title: string;
  description: string;
  reporter_name: string;
  reporter_email: string;
  assignee_name?: string;
  asset_tag?: string;
  asset_name?: string;
  branch: string;
  created_at: string;
  updated_at: string;
};

export const MOCK_TICKETS: MockTicket[] = [
  {
    id: "tkt001",
    ticket_number: "TKT-2024-0001",
    type: "repair",
    status: "in_progress",
    priority: "high",
    title: "Laptop หน้าจอมีเส้นดำ",
    description: "หน้าจอ Dell Latitude มีเส้นดำแนวตั้งปรากฏขึ้น ใช้งานไม่ได้",
    reporter_name: "สมหญิง รักษ์ดี",
    reporter_email: "somying@company.co.th",
    assignee_name: "ประสิทธิ์ แสงทอง",
    asset_tag: "IT-NB-001",
    asset_name: "Dell Latitude 5540",
    branch: "สำนักงานใหญ่",
    created_at: "2024-11-20T09:00:00Z",
    updated_at: "2024-11-21T10:30:00Z",
  },
  {
    id: "tkt002",
    ticket_number: "TKT-2024-0002",
    type: "withdraw",
    status: "pending_approval",
    priority: "medium",
    title: "ขอเบิก Monitor 27 นิ้ว",
    description: "ต้องการ Monitor เพิ่มสำหรับทีม Finance จำนวน 2 เครื่อง",
    reporter_name: "วิชัย ประสงค์ดี",
    reporter_email: "wichai@company.co.th",
    branch: "สำนักงานใหญ่",
    created_at: "2024-11-19T14:00:00Z",
    updated_at: "2024-11-19T14:00:00Z",
  },
  {
    id: "tkt003",
    ticket_number: "TKT-2024-0003",
    type: "relocation",
    status: "open",
    priority: "low",
    title: "ย้ายอุปกรณ์จากห้อง A ไป B",
    description: "ย้าย PC พร้อม Monitor จากที่นั่ง A-03 ไปยัง B-07",
    reporter_name: "ธนวัฒน์ เจริญสุข",
    reporter_email: "tanawat@company.co.th",
    asset_tag: "IT-PC-005",
    asset_name: "HP EliteDesk 800",
    branch: "สาขาเชียงใหม่",
    created_at: "2024-11-18T11:00:00Z",
    updated_at: "2024-11-18T11:00:00Z",
  },
  {
    id: "tkt004",
    ticket_number: "TKT-2024-0004",
    type: "repair",
    status: "resolved",
    priority: "critical",
    title: "Server UPS แบตเตอรี่เสีย",
    description: "UPS ในห้อง Server ไม่สำรองไฟ เมื่อไฟดับเครื่องดับทันที",
    reporter_name: "ปรียา วงษ์สุวรรณ",
    reporter_email: "preeya@company.co.th",
    assignee_name: "สมชาย ใจดี",
    asset_tag: "IT-UPS-001",
    asset_name: "APC Smart-UPS 1500VA",
    branch: "สำนักงานใหญ่",
    created_at: "2024-11-15T08:00:00Z",
    updated_at: "2024-11-17T16:00:00Z",
  },
  {
    id: "tkt005",
    ticket_number: "TKT-2024-0005",
    type: "return",
    status: "closed",
    priority: "low",
    title: "คืน Notebook หลังลาออก",
    description: "พนักงานลาออกแล้ว คืนอุปกรณ์ครบชุด",
    reporter_name: "สมชาย ใจดี",
    reporter_email: "somchai@company.co.th",
    assignee_name: "สมชาย ใจดี",
    asset_tag: "IT-NB-009",
    asset_name: "Lenovo ThinkPad L14",
    branch: "สำนักงานใหญ่",
    created_at: "2024-11-10T09:00:00Z",
    updated_at: "2024-11-10T15:00:00Z",
  },
  {
    id: "tkt006",
    ticket_number: "TKT-2024-0006",
    type: "repair",
    status: "open",
    priority: "medium",
    title: "Printer กระดาษติด บ่อยมาก",
    description: "HP LaserJet ชั้น 3 กระดาษติดทุกวัน พิมพ์ไม่ได้",
    reporter_name: "อรณี ทองคำ",
    reporter_email: "oranee@company.co.th",
    asset_tag: "IT-PRN-003",
    asset_name: "HP LaserJet Pro M404",
    branch: "สำนักงานใหญ่",
    created_at: "2024-11-22T13:00:00Z",
    updated_at: "2024-11-22T13:00:00Z",
  },
  {
    id: "tkt007",
    ticket_number: "TKT-2024-0007",
    type: "withdraw",
    status: "rejected",
    priority: "low",
    title: "ขอเบิก iPad สำหรับนำเสนองาน",
    description: "ต้องการ iPad สำหรับใช้ในห้องประชุม",
    reporter_name: "นภา สวรรค์",
    reporter_email: "napa@company.co.th",
    branch: "สาขาเชียงใหม่",
    created_at: "2024-11-08T10:00:00Z",
    updated_at: "2024-11-09T09:00:00Z",
  },
];
