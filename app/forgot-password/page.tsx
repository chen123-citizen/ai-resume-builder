"use client";

import { useState } from "react";
import { supabase } from "@/app/lib/supabase";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const handleResetPassword = async () => {
    setErrorMsg("");
    setSuccessMsg("");

    if (!email) {
      setErrorMsg("请输入注册邮箱");
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo:
          process.env.NODE_ENV === "development"
            ? "http://localhost:3000/reset-password"
            : "https://resumeupgradeai.com/reset-password",
      });

      if (error) {
        setErrorMsg(error.message);
        return;
      }

      setSuccessMsg("如果该邮箱已注册，重置密码邮件已发送，请前往邮箱查看。");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#f5f7fb] px-4">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-[-120px] top-[-80px] h-[320px] w-[320px] rounded-full bg-[rgba(78,110,255,0.18)] blur-3xl" />
        <div className="absolute bottom-[-100px] right-[-80px] h-[300px] w-[300px] rounded-full bg-[rgba(99,102,241,0.14)] blur-3xl" />
      </div>

      <div className="relative z-10 flex min-h-screen items-center justify-center">
        <div className="w-full max-w-md rounded-[28px] border border-white/60 bg-white/80 p-8 shadow-[0_20px_70px_rgba(15,23,42,0.12)] backdrop-blur-xl">
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
            忘记密码
          </h1>
          <p className="mt-2 text-sm leading-6 text-slate-500">
            输入你注册时使用的邮箱，我们会发送密码重置邮件。
          </p>

          <div className="mt-6">
            <label className="mb-2 block text-sm font-medium text-slate-700">
              邮箱
            </label>
            <input
              type="email"
              className="w-full rounded-2xl border border-slate-200 bg-white/90 px-4 py-3 text-slate-900 outline-none transition-all duration-300 placeholder:text-slate-400 focus:border-sky-400 focus:ring-4 focus:ring-sky-100"
              placeholder="请输入注册邮箱"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          {errorMsg && (
            <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
              {errorMsg}
            </div>
          )}

          {successMsg && (
            <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
              {successMsg}
            </div>
          )}

          <button
            type="button"
            onClick={handleResetPassword}
            disabled={loading}
            className="mt-6 w-full rounded-2xl bg-[linear-gradient(135deg,#0f172a_0%,#1e293b_55%,#334155_100%)] py-3 text-sm font-semibold text-white shadow-[0_10px_30px_rgba(15,23,42,0.18)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_16px_36px_rgba(15,23,42,0.24)] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? "发送中..." : "发送重置邮件"}
          </button>
        </div>
      </div>
    </div>
  );
}