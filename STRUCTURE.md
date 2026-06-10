# Project Directory Structure

```
it-asset-manager/
├── db/                              # Step 1 — SQL schema files
│   ├── 01_enums_and_types.sql
│   ├── 02_core_hierarchy.sql
│   ├── 03_assets_and_employees.sql
│   ├── 04_network_and_tickets.sql
│   ├── 05_rls_policies.sql
│   └── 06_functions_and_triggers.sql
│
├── public/
│   ├── manifest.json                # PWA manifest
│   └── icons/                       # Place icon PNGs here (see manifest)
│
├── src/
│   ├── app/
│   │   ├── layout.tsx               # Root layout (fonts, Toaster)
│   │   ├── globals.css              # Tailwind + CSS variables
│   │   │
│   │   ├── (auth)/                  # Unauthenticated routes
│   │   │   ├── layout.tsx           # Centered card layout
│   │   │   ├── login/page.tsx       # → Step 3
│   │   │   └── auth/callback/       # Supabase OAuth callback
│   │   │
│   │   ├── (app)/                   # Authenticated routes (AppShell)
│   │   │   ├── layout.tsx           # Fetches role + unread count
│   │   │   ├── dashboard/page.tsx   # KPI cards (stub)
│   │   │   ├── assets/              # → Step 3
│   │   │   ├── employees/           # → Step 3
│   │   │   ├── floor-plan/          # → Step 4
│   │   │   ├── tickets/             # → Step 5
│   │   │   ├── audit/               # → Step 5
│   │   │   └── settings/
│   │   │
│   │   └── scan/page.tsx            # Full-screen QR scanner
│   │
│   ├── components/
│   │   ├── layout/
│   │   │   ├── AppShell.tsx         # Desktop sidebar + mobile header
│   │   │   ├── Omnibar.tsx          # Universal search (⌘K)
│   │   │   ├── MobileNav.tsx        # Bottom tab bar
│   │   │   ├── NotificationBell.tsx
│   │   │   └── UserMenu.tsx
│   │   │
│   │   ├── assets/                  # → Step 3
│   │   ├── floor-plan/              # → Step 4
│   │   ├── tickets/                 # → Step 5
│   │   └── ui/                      # shadcn/ui generated components
│   │
│   ├── hooks/
│   │   ├── useQRScanner.ts          # Camera QR/barcode hook
│   │   └── ...                      # → Step 3
│   │
│   ├── lib/
│   │   ├── utils.ts                 # cn() helper
│   │   ├── image-compression.ts     # Smart compression utility
│   │   └── supabase/
│   │       ├── client.ts            # Browser client (singleton)
│   │       ├── server.ts            # Server + service-role clients
│   │       └── middleware.ts        # Session refresh helper
│   │
│   ├── types/
│   │   └── database.ts              # Supabase type definitions
│   │
│   └── middleware.ts                # Auth guard + session refresh
│
├── .env.local.example
├── next.config.ts                   # Next.js + PWA config
├── tailwind.config.ts
└── package.json
```
