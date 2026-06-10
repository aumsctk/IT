/**
 * Translation strings — Thai (default) & English
 * เพิ่ม key ใหม่ได้เสมอ แล้วใส่ทั้ง th และ en
 */

export type Locale = "th" | "en";

export const translations = {
  // ── Navigation ──────────────────────────────────────────────────
  nav: {
    dashboard:  { th: "หน้าหลัก",       en: "Dashboard"   },
    assets:     { th: "ทรัพย์สิน IT",    en: "Assets"      },
    employees:  { th: "พนักงาน",         en: "Employees"   },
    floorPlan:  { th: "ผังพื้นที่",       en: "Floor Plan"  },
    tickets:    { th: "แจ้งปัญหา",       en: "Tickets"     },
    audit:      { th: "ตรวจสอบสินทรัพย์",en: "Audit"       },
    settings:   { th: "ตั้งค่า",          en: "Settings"    },
    scan:       { th: "สแกน",            en: "Scan"        },
    home:       { th: "หน้าหลัก",        en: "Home"        },
    map:        { th: "ผังพื้นที่",       en: "Map"         },
  },

  // ── Common ───────────────────────────────────────────────────────
  common: {
    search:       { th: "ค้นหา",          en: "Search"         },
    searchHint:   { th: "ค้นหาสินทรัพย์ พนักงาน แจ้งปัญหา… (⌘K)", en: "Search assets, people, tickets… (⌘K)" },
    save:         { th: "บันทึก",         en: "Save"           },
    cancel:       { th: "ยกเลิก",         en: "Cancel"         },
    create:       { th: "สร้าง",          en: "Create"         },
    edit:         { th: "แก้ไข",          en: "Edit"           },
    delete:       { th: "ลบ",             en: "Delete"         },
    confirm:      { th: "ยืนยัน",         en: "Confirm"        },
    loading:      { th: "กำลังโหลด…",    en: "Loading…"       },
    noData:       { th: "ไม่พบข้อมูล",    en: "No data found"  },
    viewAll:      { th: "ดูทั้งหมด →",    en: "View all →"     },
    back:         { th: "กลับ",           en: "Back"           },
    newItem:      { th: "เพิ่มใหม่",      en: "New"            },
    filter:       { th: "กรอง",           en: "Filter"         },
    total:        { th: "ทั้งหมด",        en: "Total"          },
    signOut:      { th: "ออกจากระบบ",     en: "Sign out"       },
    myProfile:    { th: "โปรไฟล์ของฉัน",  en: "My Profile"     },
    settings:     { th: "ตั้งค่า",         en: "Settings"       },
    language:     { th: "ภาษา",           en: "Language"       },
    notifications:{ th: "การแจ้งเตือน",   en: "Notifications"  },
    demoMode:     { th: "โหมดทดสอบ",      en: "Demo Mode"      },
    allBranches:  { th: "ทุกสาขา",        en: "All Branches"   },
    branch:       { th: "สาขา",           en: "Branch"         },
  },

  // ── Dashboard ────────────────────────────────────────────────────
  dashboard: {
    greeting: {
      morning: { th: "สวัสดีตอนเช้า",  en: "Good morning"   },
      afternoon:{ th: "สวัสดีตอนบ่าย", en: "Good afternoon" },
      evening:  { th: "สวัสดีตอนเย็น", en: "Good evening"   },
    },
    subtitle:     { th: "นี่คือภาพรวม IT Infrastructure ของคุณ",  en: "Here's what's happening across your IT infrastructure." },
    kpi: {
      totalAssets:  { th: "สินทรัพย์ทั้งหมด", en: "Total Assets"      },
      idle:         { th: "ว่าง / ยังไม่ได้ใช้",en: "Idle / Unassigned" },
      openTickets:  { th: "แจ้งปัญหาที่เปิดอยู่",en: "Open Tickets"    },
      occupancy:    { th: "การใช้งานที่นั่ง",   en: "Seat Occupancy"   },
      active:       { th: "กำลังใช้งาน",        en: "active"           },
      readyDeploy:  { th: "พร้อมนำไปใช้",        en: "ready to deploy"  },
      underRepair:  { th: "ซ่อมแซม",            en: "under repair"     },
      seats:        { th: "ที่นั่ง",             en: "seats"            },
    },
    warningStrip: {
      title:      { th: "สินทรัพย์ที่การรับประกันกำลังจะหมด (ภายใน 30 วัน)", en: "assets with warranty expiring within 30 days" },
      daysAgo:    { th: "วันที่แล้ว",  en: "d ago"  },
      daysLeft:   { th: "วันที่เหลือ", en: "d left" },
    },
    charts: {
      warrantyTitle:    { th: "ไทม์ไลน์การรับประกัน",           en: "Warranty Expiry Timeline"    },
      warrantySubtitle: { th: "12 เดือนข้างหน้า — หมดแล้วและกำลังหมด", en: "Next 12 months — expired + expiring" },
      categoryTitle:    { th: "แยกตามประเภท",                   en: "By Category"                 },
      categorySubtitle: { th: "สัดส่วนสินทรัพย์",               en: "Asset distribution"          },
      statusTitle:      { th: "แยกตามสถานะ",                    en: "Status Breakdown"            },
      statusSubtitle:   { th: "สินทรัพย์ทั้งหมดตามสถานะปัจจุบัน", en: "All assets by current status" },
      expired:          { th: "หมดแล้ว",    en: "Expired"  },
      expiring:         { th: "กำลังหมด",   en: "Expiring" },
      critical:         { th: "วิกฤต",      en: "Critical" },
      assets:           { th: "สินทรัพย์",  en: "assets"   },
    },
    openTickets:  { th: "แจ้งปัญหาที่เปิดอยู่", en: "Open Tickets"         },
    warrantyList: { th: "การรับประกันที่กำลังหมด", en: "Warranty Expiring Soon" },
    allAssets:    { th: "สินทรัพย์ทั้งหมด →",    en: "All assets →"          },
    overdue:      { th: "เกินกำหนด",             en: "overdue"               },
    daysLeft:     { th: "วันที่เหลือ",            en: "d left"                },
    noTickets:    { th: "ไม่มีแจ้งปัญหาที่เปิดอยู่ 🎉", en: "No open tickets 🎉"   },
    noWarranty:   { th: "ไม่มีการรับประกันที่หมดใน 30 วัน ✓", en: "No warranties expiring in 30 days ✓" },
  },

  // ── Asset status ─────────────────────────────────────────────────
  assetStatus: {
    idle:           { th: "ว่าง",        en: "Idle"           },
    in_use:         { th: "ใช้งาน",      en: "In Use"         },
    under_repair:   { th: "แจ้งซ่อม",    en: "Under Repair"   },
    pending_return: { th: "รอส่งคืน",    en: "Pending Return" },
    returned:       { th: "ส่งคืนแล้ว",  en: "Returned"       },
  },

  // ── Ticket ───────────────────────────────────────────────────────
  ticket: {
    status: {
      open:             { th: "เปิด",              en: "Open"             },
      in_progress:      { th: "กำลังดำเนินการ",    en: "In Progress"      },
      pending_approval: { th: "รอการอนุมัติ",       en: "Pending Approval" },
      resolved:         { th: "แก้ไขแล้ว",          en: "Resolved"         },
      closed:           { th: "ปิดแล้ว",            en: "Closed"           },
      rejected:         { th: "ปฏิเสธ",             en: "Rejected"         },
    },
    priority: {
      low:      { th: "ต่ำ",     en: "Low"      },
      medium:   { th: "ปานกลาง", en: "Medium"   },
      high:     { th: "สูง",     en: "High"     },
      critical: { th: "วิกฤต",   en: "Critical" },
    },
    type: {
      withdraw:   { th: "เบิก",           en: "Withdraw"   },
      return:     { th: "คืน",            en: "Return"     },
      repair:     { th: "ซ่อมแซม",        en: "Repair"     },
      relocation: { th: "ย้ายสถานที่",     en: "Relocation" },
      audit:      { th: "ตรวจสอบ",        en: "Audit"      },
      other:      { th: "อื่นๆ",           en: "Other"      },
    },
    new:          { th: "แจ้งปัญหาใหม่",   en: "New Ticket"    },
    allTickets:   { th: "ดูทั้งหมด →",     en: "View all →"    },
  },

  // ── Floor plan ───────────────────────────────────────────────────
  floorPlan: {
    layers:       { th: "เลเยอร์",         en: "Layers"        },
    vacant:       { th: "ว่าง",             en: "Vacant"        },
    occupied:     { th: "มีคนใช้",          en: "Occupied"      },
    maintenance:  { th: "ซ่อมบำรุง",        en: "Maintenance"   },
    broken:       { th: "ชำรุด",            en: "Broken"        },
    networkPorts: { th: "พอร์ตเครือข่าย",   en: "Network Ports" },
    empNames:     { th: "ชื่อพนักงาน",      en: "Employee Names"},
    addDesk:      { th: "เพิ่มโต๊ะ",        en: "Add Desk"      },
    selectRoom:   { th: "เลือกห้อง",        en: "Select a room" },
    allRooms:     { th: "ทุกห้องในสาขา",    en: "All rooms in branch" },
    loading:      { th: "กำลังโหลดผังพื้นที่…", en: "Loading floor plan…" },
    tool: {
      select: { th: "เลือก (V)",     en: "Select (V)"     },
      pan:    { th: "เลื่อน (H)",    en: "Pan (H)"        },
      draw:   { th: "วางโต๊ะ (D)",   en: "Place Desk (D)" },
    },
  },

  // ── Seat panel ───────────────────────────────────────────────────
  seatPanel: {
    employee:     { th: "พนักงาน",          en: "Employee"       },
    asset:        { th: "สินทรัพย์หลัก",    en: "Primary Asset"  },
    unassigned:   { th: "— ยังไม่กำหนด —",  en: "— Unassigned —" },
    none:         { th: "— ไม่มี —",         en: "— None —"       },
    saveAssign:   { th: "บันทึกการกำหนด",    en: "Save Assignment"},
    maintenance:  { th: "กำหนดเป็นซ่อมบำรุง",en: "Mark Maintenance"},
    fullDetail:   { th: "รายละเอียดเต็ม",    en: "Full seat details"},
    desksSelected:{ th: "โต๊ะที่เลือก",      en: "desks selected" },
  },

  // ── Auth ─────────────────────────────────────────────────────────
  auth: {
    title:        { th: "ระบบจัดการ IT",    en: "IT Asset Manager"              },
    subtitle:     { th: "แพลตฟอร์มปฏิบัติการ IT องค์กร", en: "Enterprise IT Operations Platform" },
    password:     { th: "รหัสผ่าน",         en: "Password"                      },
    magicLink:    { th: "ลิงก์เข้าสู่ระบบ", en: "Magic Link"                    },
    email:        { th: "อีเมล",             en: "Email address"                 },
    signIn:       { th: "เข้าสู่ระบบ",       en: "Sign in"                       },
    signingIn:    { th: "กำลังเข้าสู่ระบบ…", en: "Signing in…"                   },
    sendLink:     { th: "ส่งลิงก์",          en: "Send magic link"               },
    sending:      { th: "กำลังส่ง…",         en: "Sending link…"                 },
    noAccount:    { th: "ติดต่อผู้ดูแลระบบ IT หากยังไม่มีบัญชี", en: "Contact your IT administrator if you don't have an account." },
    checkEmail:   { th: "ตรวจสอบอีเมลของคุณ", en: "Check your email"            },
    linkSent:     { th: "เราส่งลิงก์ไปยัง",  en: "We sent a magic link to"      },
    linkExpiry:   { th: "คลิกลิงก์เพื่อเข้าสู่ระบบ — หมดอายุใน 1 ชั่วโง", en: "Click the link to sign in — it expires in 1 hour." },
    diffEmail:    { th: "ใช้อีเมลอื่น",       en: "Use a different email"        },
  },
} as const;

/** ดึง text ตาม locale */
export function t(
  key: { th: string; en: string },
  locale: Locale
): string {
  return key[locale];
}
