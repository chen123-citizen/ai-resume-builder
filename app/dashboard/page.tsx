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
      <div className="min-h-screen bg-neutral-100">
        <div className="mx-auto max-w-6xl p-8">
          <div className="rounded-2xl bg-white p-6 text-sm text-neutral-600 shadow-sm">
            正在加载你的简历…
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-100">
      <div className="mx-auto max-w-6xl p-8">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-2xl font-semibold text-neutral-900">我的简历</div>
            <div className="mt-1 text-sm text-neutral-600">
              管理和编辑你的所有简历
            </div>
            {userEmail ? (
              <div className="mt-2 text-xs text-neutral-500">
                当前账号：{userEmail}
              </div>
            ) : null}
          </div>

          <div className="flex items-center gap-2">
            <button
              className="rounded-xl bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800 disabled:opacity-50"
              onClick={handleCreateResume}
              disabled={creating}
            >
              {creating ? "创建中..." : "+ 新建简历"}
            </button>

            <button
              className="rounded-xl bg-white px-4 py-2 text-sm font-medium text-neutral-900 shadow-sm hover:shadow"
              onClick={handleLogout}
            >
              退出登录
            </button>
          </div>
        </div>

        {resumes.length === 0 ? (
          <div className="mt-8 rounded-2xl border border-dashed border-neutral-300 bg-white p-10 text-center">
            <div className="text-lg font-medium text-neutral-900">还没有简历</div>
            <div className="mt-2 text-sm text-neutral-500">
              点击右上角「新建简历」，创建你的第一份简历
            </div>
          </div>
        ) : (
          <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {resumes.map((resume) => (
              <div
                key={resume.id}
                className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm transition hover:shadow-md"
              >
                <div className="text-lg font-semibold text-neutral-900">
                  {resume.title || "未命名简历"}
                </div>

                <div className="mt-2 text-sm text-neutral-500">
                  模板：{getTemplateLabel(resume)}
                </div>

                <div className="mt-1 text-sm text-neutral-500">
                  姓名：{getResumeNamePreview(resume)}
                </div>

                <div className="mt-2 text-sm text-neutral-500">
                  最后更新：{formatTime(resume.updated_at)}
                </div>

                <div className="mt-4 flex flex-wrap items-center gap-2">
                  <button
                    className="rounded-xl bg-neutral-900 px-3 py-2 text-sm font-medium text-white hover:bg-neutral-800"
                    onClick={() => handleEditResume(resume.id)}
                  >
                    编辑
                  </button>

                  <button
                    className="rounded-xl bg-white px-3 py-2 text-sm font-medium text-neutral-900 shadow-sm hover:shadow"
                    onClick={() => handleCopyResume(resume)}
                  >
                    复制
                  </button>

                  <button
                    className="rounded-xl bg-white px-3 py-2 text-sm font-medium text-red-600 shadow-sm hover:shadow"
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