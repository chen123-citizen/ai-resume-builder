"use client";

import { useState } from "react";
import { supabase } from "@/app/lib/supabase";
import { useRouter } from "next/navigation";

export default function ResetPasswordPage() {
  const router = useRouter();

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const handleUpdatePassword = async () => {
    setErrorMsg("");
    setSuccessMsg("");

    if (!password || !confirmPassword) {
      setErrorMsg("请输入新密码并确认密码");
      return;
    }

    if (password.length < 6) {
      setErrorMsg("密码长度至少为 6 位");
      return;
    }

    if (password !== confirmPassword) {
      setErrorMsg("两次输入的密码不一致");
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase.auth.updateUser({
        password,
      });

      if (error) {
        setErrorMsg(error.message);
        return;
      }

      setSuccessMsg("密码修改成功，正在跳转到登录页...");

      setTimeout(() => {
        router.push("/login");
      }, 1500);
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
            设置新密码
          </h1>
          <p className="mt-2 text-sm leading-6 text-slate-500">
            请输入你的新密码，保存后即可使用新密码登录。
          </p>

          <div className="mt-6 space-y-4">
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                新密码
              </label>
              <input
                type="password"
                className="w-full rounded-2xl border border-slate-200 bg-white/90 px-4 py-3 text-slate-900 outline-none transition-all duration-300 placeholder:text-slate-400 focus:border-sky-400 focus:ring-4 focus:ring-sky-100"
                placeholder="请输入新密码"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                确认新密码
              </label>
              <input
                type="password"
                className="w-full rounded-2xl border border-slate-200 bg-white/90 px-4 py-3 text-slate-900 outline-none transition-all duration-300 placeholder:text-slate-400 focus:border-sky-400 focus:ring-4 focus:ring-sky-100"
                placeholder="请再次输入新密码"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
            </div>
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
            onClick={handleUpdatePassword}
            disabled={loading}
            className="mt-6 w-full rounded-2xl bg-[linear-gradient(135deg,#0f172a_0%,#1e293b_55%,#334155_100%)] py-3 text-sm font-semibold text-white shadow-[0_10px_30px_rgba(15,23,42,0.18)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_16px_36px_rgba(15,23,42,0.24)] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? "提交中..." : "确认修改密码"}
          </button>
        </div>
      </div>
    </div>
  );
}