"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/app/lib/supabase";
import { defaultResume } from "@/app/lib/resumeSchema";
import type { TemplateKey } from "@/app/components/ResumePreview";

type ResumeRow = {
  id: string;
  user_id: string | null;
  title: string | null;
  data: any;
  created_at: string;
  updated_at: string;
};

type ResumePayload =
  | {
      resume?: any;
      template?: TemplateKey;
      jdText?: string;
    }
  | any;

export default function DashboardPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [userEmail, setUserEmail] = useState("");
  const [userId, setUserId] = useState("");
  const [resumes, setResumes] = useState<ResumeRow[]>([]);

  const loadResumes = async (uid: string) => {
    const { data, error } = await supabase
      .from("resumes")
      .select("*")
      .eq("user_id", uid)
      .order("updated_at", { ascending: false });

    if (error) {
      console.error("读取简历失败:", error.message);
      setResumes([]);
      return;
    }

    setResumes((data ?? []) as ResumeRow[]);
  };

  useEffect(() => {
    const loadDashboard = async () => {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        router.push("/login");
        return;
      }

      setUserEmail(user.email ?? "");
      setUserId(user.id);

      await loadResumes(user.id);
      setLoading(false);
    };

    loadDashboard();
  }, [router]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  const handleCreateResume = async () => {
    if (!userId || creating) return;

    setCreating(true);

    const payload = {
      resume: defaultResume,
      template: "classic" as TemplateKey,
      jdText: "",
    };

    const { data, error } = await supabase
      .from("resumes")
      .insert([
        {
          user_id: userId,
          title: `未命名简历 ${resumes.length + 1}`,
          data: payload,
        },
      ])
      .select()
      .single();

    setCreating(false);

    if (error || !data) {
      alert("创建失败：" + (error?.message || "未知错误"));
      return;
    }

    router.push(`/editor/${data.id}`);
  };

  const handleEditResume = (id: string) => {
    router.push(`/editor/${id}`);
  };

  const handleDeleteResume = async (id: string) => {
    const ok = window.confirm("确定删除这份简历吗？删除后无法恢复。");
    if (!ok) return;

    const { error } = await supabase
      .from("resumes")
      .delete()
      .eq("id", id)
      .eq("user_id", userId);

    if (error) {
      alert("删除失败：" + error.message);
      return;
    }

    await loadResumes(userId);
  };

  const handleCopyResume = async (resume: ResumeRow) => {
    const payload = (resume.data ?? {}) as ResumePayload;

    const originalTitle = resume.title || "未命名简历";
    const copiedTitle = `${originalTitle}（副本）`;

    const { data, error } = await supabase
      .from("resumes")
      .insert([
        {
          user_id: userId,
          title: copiedTitle,
          data: payload,
        },
      ])
      .select()
      .single();

    if (error || !data) {
      alert("复制失败：" + (error?.message || "未知错误"));
      return;
    }

    await loadResumes(userId);
  };

  const formatTime = (value?: string) => {
    if (!value) return "未知时间";
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return value;
    return d.toLocaleString("zh-CN");
  };

  const getTemplateLabel = (row: ResumeRow) => {
    const payload = (row.data ?? {}) as ResumePayload;
    const template = payload?.template ?? "classic";

    if (template === "classic") return "Classic 单栏";
    if (template === "modern") return "Modern 单栏";
    if (template === "compact") return "Compact 紧凑";
    if (template === "atspro") return "ATS Pro ⭐";
    return "未设置模板";
  };

  const getResumeNamePreview = (row: ResumeRow) => {
    const payload = (row.data ?? {}) as ResumePayload;
    const basicsName = payload?.resume?.basics?.name?.trim?.();
    return basicsName || "未填写姓名";
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f5f7fb] px-4 py-8">
        <div className="mx-auto max-w-6xl">
          <div className="rounded-[24px] border border-white/60 bg-white/80 p-6 text-sm text-slate-600 shadow-[0_12px_40px_rgba(15,23,42,0.08)] backdrop-blur-xl">
            正在加载你的简历…
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#f5f7fb]">
      {/* 背景光晕 */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-[-100px] top-[-60px] h-[260px] w-[260px] rounded-full bg-[rgba(78,110,255,0.12)] blur-3xl" />
        <div className="absolute right-[-80px] top-[140px] h-[240px] w-[240px] rounded-full bg-[rgba(99,102,241,0.10)] blur-3xl" />
        <div className="absolute bottom-[-80px] left-[30%] h-[220px] w-[220px] rounded-full bg-[rgba(148,163,184,0.16)] blur-3xl" />
      </div>

      <div className="relative z-10 mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
        {/* 顶部导航区 */}
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <div className="inline-flex items-center rounded-full border border-slate-200 bg-white/80 px-3 py-1 text-xs tracking-[0.18em] text-slate-500 uppercase shadow-sm backdrop-blur">
              Resume Workspace
            </div>

            <h1 className="mt-4 text-3xl font-semibold tracking-tight text-slate-900 md:text-4xl">
              我的简历
            </h1>

            <p className="mt-2 text-sm leading-6 text-slate-500 md:text-base">
              管理、编辑并持续优化你的简历内容
            </p>

            {userEmail ? (
              <p className="mt-3 text-sm text-slate-500">
                当前账号：
                <span className="ml-1 font-medium text-slate-700">{userEmail}</span>
              </p>
            ) : null}
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              className="rounded-2xl bg-[linear-gradient(135deg,#0f172a_0%,#1e293b_55%,#334155_100%)] px-5 py-3 text-sm font-semibold text-white shadow-[0_10px_28px_rgba(15,23,42,0.18)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_16px_36px_rgba(15,23,42,0.24)] disabled:cursor-not-allowed disabled:opacity-60"
              onClick={handleCreateResume}
              disabled={creating}
            >
              {creating ? "创建中..." : "+ 新建简历"}
            </button>

            <button
              className="rounded-2xl border border-slate-200 bg-white/85 px-5 py-3 text-sm font-medium text-slate-700 shadow-sm backdrop-blur transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md"
              onClick={handleLogout}
            >
              退出登录
            </button>
          </div>
        </div>

        {/* 欢迎区 */}
        <div className="mt-8 rounded-[28px] border border-white/70 bg-white/75 p-6 shadow-[0_18px_60px_rgba(15,23,42,0.08)] backdrop-blur-xl md:p-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-2xl font-semibold tracking-tight text-slate-900">
                欢迎回来
              </h2>
              <p className="mt-2 max-w-2xl text-sm leading-7 text-slate-500 md:text-base">
                你当前共有 {resumes.length} 份简历，可以继续完善内容、复制不同版本，
                或为不同岗位准备更有针对性的简历。
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:gap-4">
              <div className="rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm">
                <div className="text-sm text-slate-500">简历总数</div>
                <div className="mt-2 text-2xl font-semibold text-slate-900">
                  {resumes.length}
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm">
                <div className="text-sm text-slate-500">最新状态</div>
                <div className="mt-2 text-sm font-medium text-slate-800">
                  {resumes.length > 0 ? "可继续编辑" : "等待创建"}
                </div>
              </div>
            </div>
          </div>
        </div>

        {resumes.length === 0 ? (
          <div className="mt-8 rounded-[28px] border border-dashed border-slate-300 bg-white/80 p-10 text-center shadow-[0_12px_40px_rgba(15,23,42,0.06)] backdrop-blur">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-xl">
              📄
            </div>
            <div className="mt-5 text-xl font-semibold text-slate-900">
              还没有简历
            </div>
            <div className="mt-2 text-sm leading-6 text-slate-500">
              点击上方「新建简历」，创建你的第一份简历并开始编辑。
            </div>
            <button
              className="mt-6 rounded-2xl bg-[linear-gradient(135deg,#0f172a_0%,#1e293b_55%,#334155_100%)] px-5 py-3 text-sm font-semibold text-white shadow-[0_10px_28px_rgba(15,23,42,0.18)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_16px_36px_rgba(15,23,42,0.24)]"
              onClick={handleCreateResume}
            >
              {creating ? "创建中..." : "创建第一份简历"}
            </button>
          </div>
        ) : (
          <div className="mt-8 grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {resumes.map((resume) => (
              <div
                key={resume.id}
                className="group rounded-[26px] border border-white/70 bg-white/85 p-5 shadow-[0_10px_30px_rgba(15,23,42,0.06)] backdrop-blur transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_18px_40px_rgba(15,23,42,0.12)]"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="truncate text-lg font-semibold text-slate-900">
                      {resume.title || "未命名简历"}
                    </h3>
                    <p className="mt-1 truncate text-sm text-slate-500">
                      姓名：{getResumeNamePreview(resume)}
                    </p>
                  </div>

                  <div className="rounded-full border border-sky-100 bg-sky-50 px-3 py-1 text-xs font-medium text-sky-700">
                    {getTemplateLabel(resume)}
                  </div>
                </div>

                <div className="mt-5 rounded-2xl border border-slate-100 bg-slate-50/80 p-4">
                  <div className="text-xs uppercase tracking-[0.16em] text-slate-400">
                    LAST UPDATED
                  </div>
                  <div className="mt-2 text-sm font-medium text-slate-700">
                    {formatTime(resume.updated_at)}
                  </div>
                </div>

                <div className="mt-5 flex flex-wrap items-center gap-2">
                  <button
                    className="rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-medium text-white transition-all duration-300 hover:bg-slate-800"
                    onClick={() => handleEditResume(resume.id)}
                  >
                    编辑
                  </button>

                  <button
                    className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition-all duration-300 hover:bg-slate-50"
                    onClick={() => handleCopyResume(resume)}
                  >
                    复制
                  </button>

                  <button
                    className="rounded-xl border border-red-100 bg-red-50 px-4 py-2.5 text-sm font-medium text-red-600 transition-all duration-300 hover:bg-red-100"
                    onClick={() => handleDeleteResume(resume.id)}
                  >
                    删除
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}