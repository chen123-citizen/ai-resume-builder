"use client";

import { useState } from "react";
import { supabase } from "@/app/lib/supabase";

export default function PricingPage() {
  const [loadingPlan, setLoadingPlan] = useState<"weekly" | "monthly" | null>(null);

  async function handleCheckout(plan: "weekly" | "monthly") {
    try {
      setLoadingPlan(plan);

      const {
        data: { user },
        error,
      } = await supabase.auth.getUser();

      if (error || !user) {
        alert("登录状态已失效，请重新登录后再试");
        return;
      }

      const res = await fetch("/api/create-checkout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          plan,
          userId: user.id,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data?.checkoutUrl) {
        alert(data?.error || "创建支付链接失败，请稍后重试");
        return;
      }

      window.location.href = data.checkoutUrl;
    } catch (err) {
      console.error("checkout error:", err);
      alert("创建支付链接失败，请稍后重试");
    } finally {
      setLoadingPlan(null);
    }
  }

  return (
    <div className="min-h-screen bg-[#f5f7fb] px-4 py-10">
      <div className="mx-auto max-w-3xl">
        <div className="rounded-[28px] border border-white/70 bg-white/85 p-8 shadow-[0_18px_60px_rgba(15,23,42,0.08)] backdrop-blur-xl">
          <div className="text-2xl font-semibold text-slate-900">升级 Pro</div>
          <div className="mt-2 text-sm text-slate-500">
            解锁 AI 助手与 JD 匹配分析的无限使用权限。
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-3">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
              <div className="text-sm font-semibold text-slate-900">免费版</div>
              <div className="mt-3 text-3xl font-bold text-slate-900">¥0</div>
              <ul className="mt-4 space-y-2 text-sm text-slate-600">
                <li>AI 助手 2 次</li>
                <li>JD 匹配 2 次</li>
                <li>基础编辑与预览</li>
              </ul>
            </div>

            <div className="rounded-2xl border border-slate-900 bg-slate-900 p-5 text-white">
              <div className="text-sm font-semibold">Pro 周卡</div>
              <div className="mt-3 text-3xl font-bold">¥9.9</div>
              <div className="mt-1 text-sm text-slate-300">7 天有效</div>
              <ul className="mt-4 space-y-2 text-sm text-slate-200">
                <li>无限 AI 简历优化</li>
                <li>无限 JD 匹配分析</li>
                <li>更高效针对岗位优化简历</li>
                <li>优先体验新功能</li>
              </ul>

              <button
                onClick={() => handleCheckout("weekly")}
                disabled={loadingPlan === "weekly"}
                className="mt-6 w-full rounded-2xl bg-white px-4 py-2.5 text-sm font-semibold text-slate-900 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loadingPlan === "weekly" ? "跳转中..." : "购买周卡"}
              </button>
            </div>

            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 text-slate-900">
              <div className="text-sm font-semibold text-emerald-700">Pro 月卡</div>
              <div className="mt-3 text-3xl font-bold">¥29</div>
              <div className="mt-1 text-sm text-slate-500">30 天有效，更划算</div>
              <ul className="mt-4 space-y-2 text-sm text-slate-700">
                <li>无限 AI 简历优化</li>
                <li>无限 JD 匹配分析</li>
                <li>更适合持续投递岗位</li>
                <li>优先体验新功能</li>
              </ul>

              <button
                onClick={() => handleCheckout("monthly")}
                disabled={loadingPlan === "monthly"}
                className="mt-6 w-full rounded-2xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loadingPlan === "monthly" ? "跳转中..." : "购买月卡"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}