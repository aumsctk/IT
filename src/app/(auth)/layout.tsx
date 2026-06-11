/**
 * Auth layout — Liquid Glass login card
 */
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh items-center justify-center px-4 py-12"
      style={{
        background: "#0b1020",
        backgroundImage: `
          radial-gradient(900px 500px at 10% -10%, rgba(99,102,241,0.35), transparent 60%),
          radial-gradient(800px 500px at 100% 10%, rgba(56,189,248,0.22), transparent 55%),
          radial-gradient(900px 600px at 50% 115%, rgba(168,85,247,0.25), transparent 55%)`,
      }}>
      <div className="w-full max-w-[380px]">
        {/* Logo */}
        <div className="mb-8 text-center">
          <div className="w-14 h-14 rounded-2xl mx-auto mb-4 flex items-center justify-center"
            style={{
              background: "linear-gradient(135deg,#6366f1 0%,#7c3aed 100%)",
              boxShadow: "0 8px 28px rgba(99,102,241,0.5), inset 0 1px 0 rgba(255,255,255,0.3)",
            }}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
            </svg>
          </div>
          <h1 className="text-xl font-bold text-white tracking-tight">IT Asset Manager</h1>
          <p className="mt-1 text-sm text-slate-400">Enterprise IT Operations Platform</p>
        </div>
        <div className="rounded-3xl p-6"
          style={{
            background: "rgba(255,255,255,0.92)",
            backdropFilter: "blur(24px) saturate(180%)",
            WebkitBackdropFilter: "blur(24px) saturate(180%)",
            border: "1px solid rgba(255,255,255,0.6)",
            boxShadow: "0 20px 60px rgba(0,0,0,0.45)",
          }}>
          {children}
        </div>
        <p className="text-center text-[11px] text-slate-500 mt-6">
          © 2026 IT Asset Manager · All rights reserved
        </p>
      </div>
    </div>
  );
}
