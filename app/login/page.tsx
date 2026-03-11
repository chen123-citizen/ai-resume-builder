"use client";

import { useState } from "react";
import { supabase } from "@/app/lib/supabase";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();

  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const resetMessages = () => {
    setErrorMsg("");
    setSuccessMsg("");
  };

  const handleSubmit = async () => {
    resetMessages();

    if (!email || !password) {
      setErrorMsg("请输入邮箱和密码");
      return;
    }

    if (mode === "register") {
      if (password.length < 6) {
        setErrorMsg("密码长度至少为 6 位");
        return;
      }

      if (password !== confirmPassword) {
        setErrorMsg("两次输入的密码不一致");
        return;
      }
    }

    setLoading(true);

    try {
      if (mode === "login") {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) {
          setErrorMsg(error.message);
          return;
        }

        router.push("/dashboard");
        router.refresh();
      } else {
        const { error } = await supabase.auth.signUp({
          email,
          password,
        });

        if (error) {
          setErrorMsg(error.message);
          return;
        }

        setSuccessMsg("注册成功，请检查邮箱验证邮件，验证后再登录。");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#f5f7fb] px-4">
      {/* 背景光晕 */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-[-120px] top-[-80px] h-[320px] w-[320px] rounded-full bg-[rgba(78,110,255,0.18)] blur-3xl" />
        <div className="absolute bottom-[-100px] right-[-80px] h-[300px] w-[300px] rounded-full bg-[rgba(99,102,241,0.14)] blur-3xl" />
        <div className="absolute left-[40%] top-[20%] h-[220px] w-[220px] rounded-full bg-[rgba(148,163,184,0.18)] blur-3xl" />
      </div>

      <div className="relative z-10 flex min-h-screen items-center justify-center">
        <div className="grid w-full max-w-6xl overflow-hidden rounded-[28px] border border-white/60 bg-white/80 shadow-[0_20px_70px_rgba(15,23,42,0.12)] backdrop-blur-xl md:grid-cols-2 animate-fadeUp">
          {/* 左侧品牌区 */}
          <div className="relative hidden min-h-[680px] overflow-hidden bg-[linear-gradient(135deg,#0f172a_0%,#111827_55%,#1e293b_100%)] p-10 text-white md:flex md:flex-col md:justify-between">
            <div className="absolute -right-12 top-10 h-44 w-44 rounded-full bg-[rgba(96,165,250,0.16)] blur-3xl" />
            <div className="absolute bottom-10 left-0 h-36 w-36 rounded-full bg-[rgba(129,140,248,0.16)] blur-3xl" />

            <div className="relative z-10">
              <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs tracking-[0.24em] text-slate-300 uppercase">
                AI Resume Builder
              </div>

              <h1 className="mt-8 text-4xl font-semibold leading-tight tracking-tight">
                让你的简历，
                <br />
                更专业，也更有竞争力
              </h1>

              <p className="mt-5 max-w-md text-[15px] leading-7 text-slate-300">
                创建、管理并使用 AI
                优化简历内容，帮助你更清晰地表达经历，更贴近岗位要求。
              </p>

              <div className="mt-10 space-y-4">
                <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-4 backdrop-blur-sm transition-all duration-300 hover:bg-white/10">
                  <div className="text-sm font-medium">多份简历统一管理</div>
                  <div className="mt-1 text-sm text-slate-400">
                    为不同岗位准备不同版本，管理更清晰。
                  </div>
                </div>

                <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-4 backdrop-blur-sm transition-all duration-300 hover:bg-white/10">
                  <div className="text-sm font-medium">AI 智能优化内容</div>
                  <div className="mt-1 text-sm text-slate-400">
                    更自然地润色表达，提升简历匹配度。
                  </div>
                </div>

                <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-4 backdrop-blur-sm transition-all duration-300 hover:bg-white/10">
                  <div className="text-sm font-medium">后续可扩展模板与导出</div>
                  <div className="mt-1 text-sm text-slate-400">
                    为你的简历网站继续升级留好空间。
                  </div>
                </div>
              </div>
            </div>

            <div className="relative z-10 flex items-center gap-3 text-sm text-slate-400">
              <div className="h-2 w-2 rounded-full bg-sky-400 shadow-[0_0_16px_rgba(56,189,248,0.8)]" />
              现代化简历工具体验
            </div>
          </div>

          {/* 右侧表单区 */}
          <div className="flex md:min-h-[680px] items-center p-6 sm:p-8 md:p-10">
            <div className="mx-auto w-full max-w-md">
              <div className="md:hidden">
                <div className="inline-flex items-center rounded-full border border-slate-200 bg-white px-3 py-1 text-xs tracking-[0.22em] text-slate-500 uppercase shadow-sm">
                  AI Resume Builder
                </div>
              </div>

              <div className="mt-6">
                <h2 className="text-2xl md:text-3xl font-semibold tracking-tight text-slate-900">
                  {mode === "login" ? "欢迎回来" : "创建账号"}
                </h2>
                <p className="mt-2 text-sm leading-6 text-slate-500">
                  {mode === "login"
                    ? "登录后继续管理和优化你的简历内容"
                    : "注册后开始创建你的第一份简历"}
                </p>
              </div>

              <div className="mt-6 grid grid-cols-2 rounded-2xl border border-slate-200 bg-slate-100/80 p-1">
                <button
                  type="button"
                  onClick={() => {
                    setMode("login");
                    resetMessages();
                  }}
                  className={`rounded-xl py-2.5 text-sm font-medium transition-all duration-300 ${
                    mode === "login"
                      ? "bg-white text-slate-900 shadow-sm"
                      : "text-slate-500 hover:text-slate-700"
                  }`}
                >
                  登录
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMode("register");
                    resetMessages();
                  }}
                  className={`rounded-xl py-2.5 text-sm font-medium transition-all duration-300 ${
                    mode === "register"
                      ? "bg-white text-slate-900 shadow-sm"
                      : "text-slate-500 hover:text-slate-700"
                  }`}
                >
                  注册
                </button>
              </div>

              <div className="mt-6 space-y-4">
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">
                    邮箱
                  </label>
                  <input
                    type="email"
                    className="w-full rounded-2xl border border-slate-200 bg-white/90 px-4 py-3 text-slate-900 outline-none transition-all duration-300 placeholder:text-slate-400 focus:border-sky-400 focus:ring-4 focus:ring-sky-100"
                    placeholder="请输入邮箱"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">
                    密码
                  </label>
                  <input
                    type="password"
                    className="w-full rounded-2xl border border-slate-200 bg-white/90 px-4 py-3 text-slate-900 outline-none transition-all duration-300 placeholder:text-slate-400 focus:border-sky-400 focus:ring-4 focus:ring-sky-100"
                    placeholder="请输入密码"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>

                {mode === "register" && (
                  <div>
                    <label className="mb-2 block text-sm font-medium text-slate-700">
                      确认密码
                    </label>
                    <input
                      type="password"
                      className="w-full rounded-2xl border border-slate-200 bg-white/90 px-4 py-3 text-slate-900 outline-none transition-all duration-300 placeholder:text-slate-400 focus:border-sky-400 focus:ring-4 focus:ring-sky-100"
                      placeholder="请再次输入密码"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                    />
                  </div>
                )}
              </div>

              {errorMsg && (
                <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600 animate-fadeIn">
                  {errorMsg}
                </div>
              )}

              {successMsg && (
                <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700 animate-fadeIn">
                  {successMsg}
                </div>
              )}

              <button
                type="button"
                onClick={handleSubmit}
                disabled={loading}
                className="mt-6 w-full rounded-2xl bg-[linear-gradient(135deg,#0f172a_0%,#1e293b_55%,#334155_100%)] py-3 text-sm font-semibold text-white shadow-[0_10px_30px_rgba(15,23,42,0.18)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_16px_36px_rgba(15,23,42,0.24)] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading
                  ? mode === "login"
                    ? "登录中..."
                    : "注册中..."
                  : mode === "login"
                  ? "登录"
                  : "注册"}
              </button>

              <p className="mt-5 text-center text-sm text-slate-500">
                {mode === "login" ? "还没有账号？" : "已经有账号了？"}
                <button
                  type="button"
                  onClick={() => {
                    setMode(mode === "login" ? "register" : "login");
                    resetMessages();
                  }}
                  className="ml-1 font-medium text-slate-900 underline decoration-slate-300 underline-offset-4 transition hover:text-sky-700"
                >
                  {mode === "login" ? "立即注册" : "去登录"}
                </button>
              </p>
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        .animate-fadeUp {
          animation: fadeUp 0.7s ease-out;
        }

        .animate-fadeIn {
          animation: fadeIn 0.35s ease-out;
        }

        @keyframes fadeUp {
          from {
            opacity: 0;
            transform: translateY(18px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(6px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
}