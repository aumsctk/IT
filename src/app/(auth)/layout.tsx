/**
 * Auth layout — Slate Pro login card
 */
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh items-center justify-center px-4 py-12"
      style={{ background: "linear-gradient(135deg, #0F172A 0%, #1E293B 50%, #0F172A 100%)" }}>
      <div className="w-full max-w-[380px]">
        {/* Logo */}
        <div className="mb-8 text-center">
          <div className="w-14 h-14 rounded-2xl bg-indigo-600 mx-auto mb-4 flex items-center justify-center shadow-lg shadow-indigo-900/50">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
            </svg>
          </div>
          <h1 className="text-xl font-bold text-white tracking-tight">IT Asset Manager</h1>
          <p className="mt-1 text-sm text-slate-400">Enterprise IT Operations Platform</p>
        </div>
        <div className="bg-white rounded-2xl shadow-2xl shadow-black/40 p-6">
          {children}
        </div>
        <p className="text-center text-[11px] text-slate-600 mt-6">
          © 2025 IT Asset Manager · All rights reserved
        </p>
      </div>
    </div>
  );
}
