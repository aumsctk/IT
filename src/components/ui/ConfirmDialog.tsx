"use client";

import { useState, useCallback, useRef } from "react";
import { Trash2, Save } from "lucide-react";

interface ConfirmOptions {
  title: string;
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
}

export function useConfirm() {
  const [opts, setOpts] = useState<ConfirmOptions | null>(null);
  const resolveRef = useRef<((v: boolean) => void) | null>(null);

  const confirm = useCallback((options: ConfirmOptions): Promise<boolean> => {
    setOpts(options);
    return new Promise<boolean>((res) => { resolveRef.current = res; });
  }, []);

  function respond(value: boolean) {
    setOpts(null);
    resolveRef.current?.(value);
    resolveRef.current = null;
  }

  const ConfirmUI = opts ? (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 backdrop-blur-sm"
      onClick={() => respond(false)}
    >
      <div
        className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-sm mx-4 p-6 space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start gap-3">
          <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${opts.danger ? "bg-red-100 text-red-600" : "bg-amber-100 text-amber-600"}`}>
            {opts.danger ? <Trash2 size={18} /> : <Save size={18} />}
          </div>
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-gray-100 text-sm">{opts.title}</h3>
            {opts.message && (
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 leading-relaxed">{opts.message}</p>
            )}
          </div>
        </div>
        <div className="flex gap-2 pt-1">
          <button
            onClick={() => respond(false)}
            className="flex-1 rounded-xl border border-gray-200 dark:border-gray-700 py-2.5 text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
          >
            {opts.cancelLabel ?? "ยกเลิก"}
          </button>
          <button
            onClick={() => respond(true)}
            className={`flex-1 rounded-xl py-2.5 text-sm font-medium text-white transition-colors ${opts.danger ? "bg-red-600 hover:bg-red-700" : "bg-indigo-600 hover:bg-indigo-700"}`}
          >
            {opts.confirmLabel ?? "ยืนยัน"}
          </button>
        </div>
      </div>
    </div>
  ) : null;

  return { confirm, ConfirmUI };
}
