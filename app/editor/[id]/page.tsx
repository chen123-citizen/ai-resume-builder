"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import ResumePreview, { TemplateKey } from "@/app/components/ResumePreview";
import {
  Resume,
  defaultResume,
  EducationItem,
  AwardItem,
  CampusItem,
  ExperienceItem,
} from "@/app/lib/resumeSchema";
import { loadResume, saveResume } from "@/app/lib/storage";
import { starifySummary } from "@/app/lib/starify";
import AIAssistant from "@/app/components/AIAssistant";
import { supabase } from "@/app/lib/supabase";
import { applyResumePatch } from "@/app/lib/resumePatch";

type ResumePayload =
  | Resume
  | {
      resume?: Resume;
      template?: TemplateKey;
      jdText?: string;
    };

type AIJDMatchResult = {
  score: number;
  strengths: string[];
  missing: string[];
  suggestions: string[];
};

export default function EditorDetailPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();

  const resumeId = Array.isArray(params?.id) ? params.id[0] : params?.id;

  const [resume, setResume] = useState<Resume>(defaultResume);
  const [skillDrafts, setSkillDrafts] = useState<string[]>([]);
  const [template, setTemplate] = useState<TemplateKey>("classic");

  const [jdText, setJdText] = useState("");
  const [matchResult, setMatchResult] = useState<AIJDMatchResult | null>(null);
  const [isAIOpen, setIsAIOpen] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const [loadingPage, setLoadingPage] = useState(true);
  const [saving, setSaving] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string>("");

  const [historyExpanded, setHistoryExpanded] = useState(false); // 折叠状态
  const [historyVersions, setHistoryVersions] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [undoSnapshot, setUndoSnapshot] = useState<Resume | null>(null);

  const [experienceBulletDrafts, setExperienceBulletDrafts] = useState<string[]>([]);

  const [activeModule, setActiveModule] = useState<
    "basics" | "education" | "experience" | "campus" | "awards" | "skills"
  >("basics");

const hasLoadedRef = useRef(false);
const printRef = useRef<HTMLDivElement | null>(null);

const handlePrint = () => {
  if (!printRef.current) return;

  document.body.classList.add("resume-printing");
  window.print();
  setTimeout(() => {
    document.body.classList.remove("resume-printing");
  }, 300);
};

  const handleAnalyzeJD = async () => {
    if (!jdText.trim()) {
      alert("请先填写岗位JD");
      return;
    }
  
    setIsAnalyzing(true);
    setMatchResult(null);
  
    try {
      const res = await fetch("/api/jd-match", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          resume,
          jd: jdText,
        }),
      });
  
      const json = await res.json();
  
      if (!res.ok || !json.success) {
        console.error("AI JD 分析失败:", json.error);
        alert(json.error || "AI 分析失败");
        return;
      }
  
      setMatchResult(json.result);
    } catch (e) {
      console.error("AI JD 分析异常:", e);
      alert("AI 分析异常，请稍后重试");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const parsePayload = (payload: ResumePayload | null | undefined) => {
    if (!payload) {
      return {
        loadedResume: defaultResume,
        loadedTemplate: "classic" as TemplateKey,
        loadedJdText: "",
      };
    }

    if ("resume" in payload || "template" in payload || "jdText" in payload) {
      return {
        loadedResume: payload.resume ?? defaultResume,
        loadedTemplate: (payload.template as TemplateKey) ?? "classic",
        loadedJdText: payload.jdText ?? "",
      };
    }

    return {
      loadedResume: payload as Resume,
      loadedTemplate: "classic" as TemplateKey,
      loadedJdText: "",
    };
  };

  const toggleSectionVisible = (
    module: "education" | "experience" | "campus" | "awards" | "skills"
  ) => {
    setResume((r) => ({
      ...r,
      sections: {
        ...r.sections,
        [module]: !((r.sections as any)?.[module]),
      },
    }));
  };
  
  const clearModuleContent = (
    module: "education" | "experience" | "campus" | "awards" | "skills"
  ) => {
    setResume((r) => {
      const next = { ...r };
  
      if (module === "education") {
        next.education = [];
      }
      if (module === "experience") {
        next.experience = [];
      }
      if (module === "campus") {
        next.campus = [];
      }
      if (module === "awards") {
        next.awards = [];
      }
      if (module === "skills") {
        next.skills = { categories: [] };
      }
  
      next.sections = {
        ...r.sections,
        [module]: false,
      };
  
      return next;
    });
  
    if (activeModule === module) {
      setActiveModule("basics");
    }
  };

  useEffect(() => {
    setExperienceBulletDrafts(
      (resume.experience || []).map((exp) => (exp.bullets || []).join("\n"))
    );
  }, [resume.experience]);

  useEffect(() => {
    setSkillDrafts(
      (resume.skills?.categories || []).map((c) => (c.items || []).join("\n"))
    );
  }, [resume.skills]);

  // 读取数据库中的简历；失败时回退到本地缓存
  useEffect(() => {
    const loadResumeFromDB = async () => {
      if (!resumeId) return;

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        router.push("/login");
        return;
      }

      setCurrentUserId(user.id);

      const { data, error } = await supabase
        .from("resumes")
        .select("*")
        .eq("id", resumeId)
        .eq("user_id", user.id)
        .single();

      if (error || !data || data.user_id !== user.id) {
        // 回退到本地缓存
        const localResume = loadResume();
        setResume(localResume);
        setTemplate("classic");
        setJdText("");

        hasLoadedRef.current = true;
        setLoadingPage(false);

        // 跳回 dashboard，防止用户访问别人的 resumeId
        router.push("/dashboard");
        return;
      }

      const parsed = parsePayload(data.data as ResumePayload);
      setResume(parsed.loadedResume);
      setTemplate(parsed.loadedTemplate);
      setJdText(parsed.loadedJdText);

      // 同步一份到本地缓存，作为兜底
      saveResume(parsed.loadedResume);
      hasLoadedRef.current = true;
      setLoadingPage(false);

      //加载历史版本
      loadHistoryVersions(user.id);
    };

    loadResumeFromDB();
  }, [resumeId, router]);

  // 加载历史版本
  const loadHistoryVersions = async (userIdParam?: string) => {
    const uid = userIdParam || currentUserId;
    if (!resumeId || !uid) return;
    setLoadingHistory(true);

    try {
      const res = await fetch(`/api/resume-versions?resumeId=${resumeId}&userId=${uid}`);
      const json = await res.json();
      if (json.success) {
        setHistoryVersions(json.data);
      } else {
        console.error("加载历史版本失败:", json.error);
      }
    } catch (e) {
      console.error("加载历史版本异常:", e);
    } finally {
      setLoadingHistory(false);
    }
  };

  //历史版本回退方法
  const applyHistoryVersion = (patch: any) => {
    if (!patch) return;
    setUndoSnapshot(JSON.parse(JSON.stringify(resume)));
    const nextResume = applyResumePatch(resume, patch);
    setResume(nextResume);

    // if (jdText?.trim()) {
    //   const match = calculateMatchScore(jdText, nextResume);
    //   setMatchResult(match);
    // }

    alert("已回退到选中的历史版本");
  };

  // 本地缓存自动保存
  useEffect(() => {
    if (!hasLoadedRef.current) return;
    saveResume(resume);
  }, [resume]);

  // 数据库自动保存（防抖）
  useEffect(() => {
    if (!hasLoadedRef.current || !resumeId || !currentUserId) return;

    const t = setTimeout(async () => {
      setSaving(true);

      const title =
        resume.basics?.name?.trim()
          ? `${resume.basics.name.trim()}的简历`
          : "未命名简历";

      const payload = {
        resume,
        template,
        jdText,
      };

      const { error } = await supabase
        .from("resumes")
        .update({
          title,
          data: payload,
          updated_at: new Date().toISOString(),
        })
        .eq("id", resumeId)
        .eq("user_id", currentUserId);

      if (error) 
        console.error("自动保存失败:", error.message);
      setSaving(false);
    }, 800);

    return () => clearTimeout(t);
  }, [resume, template, jdText, resumeId, currentUserId]);

  const sections = resume.sections ?? defaultResume.sections;

  // ===== JD 匹配：实时分析（防抖） =====
  /*
  const resumeHasSomeContent = useMemo(() => {
    const b: any = resume.basics ?? {};
    const hasBasics = Boolean((b.name ?? "").trim() || (b.title ?? "").trim());

    const hasExp = (resume.experience ?? []).some((x: any) => {
      return (
        Boolean((x.company ?? "").trim()) ||
        Boolean((x.role ?? "").trim()) ||
        Boolean((x.summary ?? "").trim()) ||
        (x.bullets?.length ?? 0) > 0
      );
    });

    const hasEducation = (resume.education ?? []).some(
      (e: any) =>
        Boolean((e.school ?? "").trim()) || Boolean((e.major ?? "").trim())
    );
    const hasCampus = (resume.campus ?? []).some(
      (c: any) => Boolean((c.org ?? "").trim()) || Boolean((c.desc ?? "").trim())
    );
    const hasAwards = (resume.awards ?? []).some(
      (a: any) => Boolean((a.title ?? "").trim()) || Boolean((a.desc ?? "").trim())
    );
    const hasSkills = (resume.skills?.categories ?? []).some(
      (c: any) => (c.items?.length ?? 0) > 0
    );

    return hasBasics || hasExp || hasEducation || hasCampus || hasAwards || hasSkills;
  }, [resume]);

  const resumeKey = useMemo(() => {
    return JSON.stringify({
      basics: {
        title: resume.basics?.title ?? "",
      },
      experience: resume.experience,
      skills: resume.skills,
      projects: resume.projects ?? [],
    });
  }, [
    resume.basics?.title,
    resume.experience,
    resume.skills,
    resume.projects,
  ]);

  const jdOk = useMemo(() => (jdText ?? "").trim().length >= 30, [jdText]);

  const canAnalyze = useMemo(() => {
    return (debouncedJdText ?? "").trim().length >= 30 && resumeHasSomeContent;
  }, [debouncedJdText, resumeHasSomeContent]);

  useEffect(() => {
    if (!jdOk) {
      setIsAnalyzing(false);
      return;
    }
  
    setIsAnalyzing(true);
    const t = setTimeout(() => setDebouncedJdText(jdText), 500);
    return () => clearTimeout(t);
  }, [jdText, jdOk]);
  

  useEffect(() => {
    if (!jdOk) {
      setMatchResult(null);
      setIsAnalyzing(false);
      return;
    }
  
    // 只在目标岗位 title / skills / experience / projects 变化时才分析
    setIsAnalyzing(true);
  
    const t = setTimeout(() => {
      try {
        const result = calculateMatchScore(jdText, resume);
        setMatchResult(result);
      } finally {
        setIsAnalyzing(false);
      }
    }, 500);
  
    return () => clearTimeout(t);
  }, [jdText, resumeKey, jdOk]);
  */

  const updateEducationItem = (index: number, patch: Partial<EducationItem>) => {
    setResume((r) => ({
      ...r,
      education: r.education.map((item, i) =>
        i === index ? { ...item, ...patch } : item
      ),
    }));
  };

  const addEducationItem = () => {
    setResume((r) => ({
      ...r,
      education: [
        ...r.education,
        {
          school: "",
          major: "",
          degree: "",
          start: "",
          end: "",
          highlights: [],
        },
      ],
    }));
  };

  const removeEducationItem = (index: number) => {
    setResume((r) => ({
      ...r,
      education: r.education.filter((_, i) => i !== index),
    }));
  };

  const updateAwardItem = (index: number, patch: Partial<AwardItem>) => {
    setResume((r) => ({
      ...r,
      awards: r.awards.map((item, i) =>
        i === index ? { ...item, ...patch } : item
      ),
    }));
  };

  const addAwardItem = () => {
    setResume((r) => ({
      ...r,
      awards: [
        ...r.awards,
        {
          title: "",
          date: "",
          desc: "",
        },
      ],
    }));
  };

  const removeAwardItem = (index: number) => {
    setResume((r) => ({
      ...r,
      awards: r.awards.filter((_, i) => i !== index),
    }));
  };

  const updateCampusItem = (index: number, patch: Partial<CampusItem>) => {
    setResume((r) => ({
      ...r,
      campus: r.campus.map((item, i) =>
        i === index ? { ...item, ...patch } : item
      ),
    }));
  };

  const addCampusItem = () => {
    setResume((r) => ({
      ...r,
      campus: [
        ...r.campus,
        {
          org: "",
          role: "",
          start: "",
          end: "",
          desc: "",
        },
      ],
    }));
  };

  const removeCampusItem = (index: number) => {
    setResume((r) => ({
      ...r,
      campus: r.campus.filter((_, i) => i !== index),
    }));
  };

  const updateExperienceItem = (
    index: number,
    patch: Partial<ExperienceItem>
  ) => {
    setResume((r) => ({
      ...r,
      experience: r.experience.map((item, i) =>
        i === index ? { ...item, ...patch } : item
      ),
    }));
  };

  const updateExperienceBulletDraft = (index: number, raw: string) => {
    setExperienceBulletDrafts((prev) => {
      const next = [...prev];
      next[index] = raw;
      return next;
    });
  };
  
  const commitExperienceBulletDraft = (index: number) => {
    const raw = experienceBulletDrafts[index] ?? "";
    const bullets = raw
      .split("\n")
      .map((x) => x.trim())
      .filter(Boolean);
  
    updateExperienceItem(index, { bullets });
  
    setExperienceBulletDrafts((prev) => {
      const next = [...prev];
      next[index] = bullets.join("\n");
      return next;
    });
  };

  const addExperienceItem = () => {
    setResume((r) => ({
      ...r,
      experience: [
        ...r.experience,
        {
          company: "",
          role: "",
          city: "",
          start: "",
          end: "",
          summary: "",
          bullets: [],
        },
      ],
    }));
  };

  const removeExperienceItem = (index: number) => {
    setResume((r) => ({
      ...r,
      experience: r.experience.filter((_, i) => i !== index),
    }));
  };

  const updateSkillCategoryName = (index: number, name: string) => {
    setResume((r) => ({
      ...r,
      skills: {
        ...r.skills,
        categories: r.skills.categories.map((c, i) =>
          i === index ? { ...c, name } : c
        ),
      },
    }));
  };

  const updateSkillDraft = (index: number, raw: string) => {
    setSkillDrafts((prev) => {
      const next = [...prev];
      next[index] = raw;
      return next;
    });
  };
  
  const commitSkillDraft = (index: number) => {
    const raw = skillDrafts[index] ?? "";
    const items = raw
      .split(/\n|\/|,|，/)
      .map((x) => x.trim())
      .filter(Boolean);
  
    setResume((r) => ({
      ...r,
      skills: {
        ...r.skills,
        categories: r.skills.categories.map((c, i) =>
          i === index ? { ...c, items } : c
        ),
      },
    }));
  
    setSkillDrafts((prev) => {
      const next = [...prev];
      next[index] = items.join("\n");
      return next;
    });
  };

  const addSkillCategory = () => {
    setResume((r) => ({
      ...r,
      skills: {
        ...r.skills,
        categories: [...r.skills.categories, { name: "技能", items: [] }],
      },
    }));
  };

  const removeSkillCategory = (index: number) => {
    setResume((r) => ({
      ...r,
      skills: {
        ...r.skills,
        categories: r.skills.categories.filter((_, i) => i !== index),
      },
    }));
  };

  if (loadingPage) {
    return (
      <div className="min-h-screen bg-[#f5f7fb] px-4 py-8">
        <div className="mx-auto max-w-6xl">
          <div className="rounded-[24px] border border-white/60 bg-white/80 p-6 text-sm text-slate-600 shadow-[0_12px_40px_rgba(15,23,42,0.08)] backdrop-blur-xl">
            正在加载这份简历…
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#f5f7fb]">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-[-100px] top-[-60px] h-[260px] w-[260px] rounded-full bg-[rgba(78,110,255,0.10)] blur-3xl" />
        <div className="absolute right-[-60px] top-[120px] h-[240px] w-[240px] rounded-full bg-[rgba(99,102,241,0.08)] blur-3xl" />
        <div className="absolute bottom-[-80px] left-[28%] h-[220px] w-[220px] rounded-full bg-[rgba(148,163,184,0.14)] blur-3xl" />
      </div>

      <div className="relative z-10 mx-auto max-w-screen-2xl px-4 py-6 sm:px-6 lg:px-8 xl:pr-[400px]">
      <div className="mb-6 rounded-[28px] border border-white/70 bg-white/75 p-5 shadow-[0_18px_60px_rgba(15,23,42,0.08)] backdrop-blur-xl md:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="inline-flex items-center rounded-full border border-slate-200 bg-white/90 px-3 py-1 text-xs tracking-[0.18em] text-slate-500 uppercase shadow-sm">
              Resume Editor
            </div>
            <h1 className="mt-3 text-2xl font-semibold tracking-tight text-slate-900 md:text-3xl">
              简历编辑器
            </h1>
            <p className="mt-2 text-sm text-slate-500">
              {saving ? "正在自动保存..." : "已连接数据库自动保存"}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              className="rounded-2xl border border-slate-200 bg-white/85 px-4 py-2.5 text-sm font-medium text-slate-700 shadow-sm backdrop-blur transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md"
              onClick={handlePrint}
            >
              导出 PDF
            </button>

            <a
              className="rounded-2xl bg-[linear-gradient(135deg,#0f172a_0%,#1e293b_55%,#334155_100%)] px-4 py-2.5 text-sm font-semibold text-white shadow-[0_10px_28px_rgba(15,23,42,0.18)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_16px_36px_rgba(15,23,42,0.24)]"
              href="/dashboard"
            >
              返回 Dashboard
            </a>
          </div>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[420px_minmax(0,1fr)] xl:items-start">
          {/* Left: form + 历史版本列表*/}
          <div className="rounded-[28px] border border-white/70 bg-white/85 p-5 shadow-[0_12px_40px_rgba(15,23,42,0.06)] backdrop-blur-xl">
            

            <div className="mb-4">
              {/* 折叠按钮 */}
              <button
                className="w-full rounded-xl border border-neutral-300 bg-white px-4 py-2 text-sm font-medium text-neutral-900 hover:bg-neutral-50 flex justify-between items-center"
                onClick={() => setHistoryExpanded(!historyExpanded)}
              >
                历史版本(可供撤回) {historyExpanded ? "▲" : "▼"}
                {loadingHistory && <span className="ml-2 text-xs text-neutral-500">加载中…</span>}
              </button>

              {/* 折叠内容 */}
              {historyExpanded && (
                <div className="mt-2 border border-neutral-200 rounded-xl bg-white p-3 max-h-48 overflow-y-auto text-xs space-y-1">
                  {historyVersions.length === 0 ? (
                    <div className="text-neutral-500">暂无历史版本</div>
                  ) : (
                    historyVersions.map((v) => (
                      <div
                        key={v.id}
                        className="flex items-center justify-between px-2 py-1 hover:bg-gray-50 rounded"
                      >
                        <div>
                          {v.reason || "修改"} - {new Date(v.created_at).toLocaleString()}
                        </div>
                        <button
                          className="text-blue-600 hover:underline text-xs"
                          onClick={() => applyHistoryVersion(v.patch)}
                        >
                          回退
                        </button>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>

            {/* JD 输入框 */}
            <div className="mb-3 text-sm font-semibold tracking-tight text-slate-800">岗位描述 (JD)</div>
            <div className="mt-3">
              <textarea
                className="mt-1 w-full rounded-2xl border border-slate-200 bg-white/90 px-3 py-2.5 text-sm text-slate-900 outline-none transition-all duration-300 placeholder:text-slate-400 focus:border-sky-400 focus:ring-4 focus:ring-sky-100"
                rows={6}
                placeholder="粘贴岗位描述（任职要求 + 岗位职责）"
                value={jdText}
                onChange={(e) => setJdText(e.target.value)}
              />
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-2">
              <button
                className="rounded-xl bg-white px-4 py-2 text-sm font-medium text-neutral-900 shadow-sm hover:shadow"
                onClick={() => setMatchResult(null)}
              >
                清空匹配结果
              </button>

              <div className="text-xs text-neutral-500">
                点击右侧“开始分析”后生成匹配结果
              </div>
            </div>

            {/* 模块选择 */}
            <div className="mt-6">
              <div className="text-sm font-semibold tracking-tight text-slate-800">
                模块选择
              </div>

              <div className="mt-3 space-y-2">
                {[
                  ["basics", "基本信息"],
                  ["education", "教育背景"],
                  ["experience", "实习/工作"],
                  ["campus", "校园经历"],
                  ["awards", "获奖经历"],
                  ["skills", "技能"],
                ].map(([key, label]) => {
                  const module = key as
                    | "basics"
                    | "education"
                    | "experience"
                    | "campus"
                    | "awards"
                    | "skills";

                  const active = activeModule === module;
                  const enabled =
                    module === "basics"
                      ? true
                      : Boolean((resume.sections as any)?.[module]);

                  return (
                    <div
                      key={key}
                      className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white/80 p-2"
                    >
                      <button
                        type="button"
                        className={
                          "min-w-0 flex-1 rounded-xl px-3 py-2 text-left text-xs font-medium transition-all duration-200 " +
                          (active
                            ? "bg-slate-900 text-white"
                            : "bg-white text-slate-700 hover:bg-slate-50")
                        }
                        onClick={() => setActiveModule(module)}
                      >
                        {label}
                      </button>

                      {module === "basics" ? (
                        <div className="shrink-0 rounded-xl bg-slate-100 px-3 py-2 text-[11px] font-medium text-slate-500">
                          固定
                        </div>
                      ) : (
                        <>
                          <button
                            type="button"
                            className={
                              "shrink-0 rounded-xl px-3 py-2 text-[11px] font-medium transition-all duration-200 " +
                              (enabled
                                ? "bg-sky-100 text-sky-700 hover:bg-sky-200"
                                : "bg-slate-100 text-slate-500 hover:bg-slate-200")
                            }
                            onClick={() =>
                              toggleSectionVisible(
                                module as
                                  | "education"
                                  | "experience"
                                  | "campus"
                                  | "awards"
                                  | "skills"
                              )
                            }
                            title={enabled ? "点击后从简历中隐藏" : "点击后显示到简历中"}
                          >
                            {enabled ? "显示中" : "已隐藏"}
                          </button>

                          <button
                            type="button"
                            className="shrink-0 rounded-xl bg-red-50 px-3 py-2 text-[11px] font-medium text-red-600 transition-all duration-200 hover:bg-red-100"
                            onClick={() =>
                              clearModuleContent(
                                module as
                                  | "education"
                                  | "experience"
                                  | "campus"
                                  | "awards"
                                  | "skills"
                              )
                            }
                            title="清空该模块内容并从简历中隐藏"
                          >
                            清空
                          </button>
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
            {/* 基本信息 */}
            {activeModule === "basics" && (
              <div className="mt-6">
                <div className="mb-3 text-sm font-semibold tracking-tight text-slate-800">
                  基本信息
                </div>

                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  {(["name", "title", "phone", "email", "city"] as const).map((k) => (
                    <label key={k} className="text-xs text-neutral-600">
                      {k.toUpperCase()}
                      <input
                        className="mt-1 w-full rounded-2xl border border-slate-200 bg-white/90 px-3 py-2.5 text-sm text-slate-900 outline-none transition-all duration-300 placeholder:text-slate-400 focus:border-sky-400 focus:ring-4 focus:ring-sky-100"
                        value={(resume.basics as any)[k] ?? ""}
                        onChange={(e) =>
                          setResume((r) => ({
                            ...r,
                            basics: { ...r.basics, [k]: e.target.value },
                          }))
                        }
                      />
                    </label>
                  ))}
                </div>

                <label className="mt-4 flex items-center gap-2 text-xs text-neutral-700">
                  <input
                    type="checkbox"
                    checked={resume.basics.showPhoto ?? false}
                    onChange={(e) =>
                      setResume((r) => ({
                        ...r,
                        basics: {
                          ...r.basics,
                          showPhoto: e.target.checked,
                        },
                      }))
                    }
                  />
                  显示头像
                </label>

                <div className="mt-4">
                  <div className="text-xs text-neutral-600">头像</div>

                  <div className="mt-2 flex items-center gap-3">
                    {resume.basics.photo ? (
                      <img
                        src={resume.basics.photo}
                        className="h-16 w-16 rounded-lg border border-neutral-200 object-cover"
                        alt="头像预览"
                      />
                    ) : (
                      <div className="flex h-16 w-16 items-center justify-center rounded-lg border border-dashed border-neutral-300 text-xs text-neutral-400">
                        无头像
                      </div>
                    )}

                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;

                        const reader = new FileReader();
                        reader.onload = () => {
                          setResume((r) => ({
                            ...r,
                            basics: {
                              ...r.basics,
                              photo: reader.result as string,
                            },
                          }));
                        };
                        reader.readAsDataURL(file);
                      }}
                    />

                    {resume.basics.photo && (
                      <button
                        className="text-xs text-red-500 hover:underline"
                        onClick={() =>
                          setResume((r) => ({
                            ...r,
                            basics: { ...r.basics, photo: "" },
                          }))
                        }
                      >
                        删除
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}
            {/* 教育背景 */}
            {activeModule === "education" && (
              <div className="mt-6">
                <div className="text-sm font-semibold tracking-tight text-slate-800">
                  教育背景
                </div>
                <div className="mt-3 space-y-3">
                  {resume.education.map((edu, idx) => (
                    <div
                      key={idx}
                      className="rounded-2xl border border-slate-200 bg-white/90 p-3"
                    >
                      <div className="mb-2 flex items-center justify-between">
                        <div className="text-xs font-medium text-neutral-700">
                          教育经历 {idx + 1}
                        </div>
                        <button
                          className="text-xs text-neutral-400 hover:text-red-500"
                          onClick={() => removeEducationItem(idx)}
                        >
                          删除
                        </button>
                      </div>
                      <div className="grid gap-3 sm:grid-cols-2">
                        <label className="text-xs text-neutral-600">
                          学校
                          <input
                            className="mt-1 w-full rounded-2xl border border-slate-200 bg-white/90 px-3 py-2.5 text-sm text-slate-900 outline-none transition-all duration-300 focus:border-sky-400 focus:ring-4 focus:ring-sky-100"
                            value={edu.school}
                            onChange={(e) =>
                              updateEducationItem(idx, {
                                school: e.target.value,
                              })
                            }
                          />
                        </label>
                        <label className="text-xs text-neutral-600">
                          专业
                          <input
                            className="mt-1 w-full rounded-2xl border border-slate-200 bg-white/90 px-3 py-2.5 text-sm text-slate-900 outline-none transition-all duration-300 focus:border-sky-400 focus:ring-4 focus:ring-sky-100"
                            value={edu.major}
                            onChange={(e) =>
                              updateEducationItem(idx, {
                                major: e.target.value,
                              })
                            }
                          />
                        </label>
                        <label className="text-xs text-neutral-600">
                          学位
                          <input
                            className="mt-1 w-full rounded-2xl border border-slate-200 bg-white/90 px-3 py-2.5 text-sm text-slate-900 outline-none transition-all duration-300 focus:border-sky-400 focus:ring-4 focus:ring-sky-100"
                            value={edu.degree}
                            onChange={(e) =>
                              updateEducationItem(idx, {
                                degree: e.target.value,
                              })
                            }
                          />
                        </label>
                        <label className="text-xs text-neutral-600">
                          起止时间
                          <div className="mt-1 grid grid-cols-2 gap-2">
                            <input
                              className="rounded-2xl border border-slate-200 bg-white/90 px-3 py-2.5 text-sm text-slate-900 outline-none transition-all duration-300 focus:border-sky-400 focus:ring-4 focus:ring-sky-100"
                              placeholder="开始"
                              value={edu.start}
                              onChange={(e) =>
                                updateEducationItem(idx, {
                                  start: e.target.value,
                                })
                              }
                            />
                            <input
                              className="rounded-2xl border border-slate-200 bg-white/90 px-3 py-2.5 text-sm text-slate-900 outline-none transition-all duration-300 focus:border-sky-400 focus:ring-4 focus:ring-sky-100"
                              placeholder="结束"
                              value={edu.end}
                              onChange={(e) =>
                                updateEducationItem(idx, {
                                  end: e.target.value,
                                })
                              }
                            />
                          </div>
                        </label>
                      </div>
                      <label className="mt-3 block text-xs text-neutral-600">
                        亮点（每行一条，如绩点/排名/奖学金）
                        <textarea
                          className="mt-1 w-full rounded-2xl border border-slate-200 bg-white/90 px-3 py-2.5 text-sm text-slate-900 outline-none transition-all duration-300 placeholder:text-slate-400 focus:border-sky-400 focus:ring-4 focus:ring-sky-100"
                          rows={3}
                          value={(edu.highlights || []).join("\n")}
                          onChange={(e) =>
                            updateEducationItem(idx, {
                              highlights: e.target.value
                                .split("\n")
                                .map((x) => x.trim())
                                .filter(Boolean),
                            })
                          }
                        />
                      </label>
                    </div>
                  ))}
                  <button
                    className="w-full rounded-xl border border-dashed border-slate-300 py-2 text-xs font-medium text-slate-700 hover:border-slate-400 hover:bg-slate-50"
                    onClick={addEducationItem}
                  >
                    + 新增一条教育经历
                  </button>
                </div>
              </div>
            )}

            {/* 实习/工作经历 */}
            {activeModule === "experience" && (
              <div className="mt-6">
                <div className="text-sm font-semibold tracking-tight text-slate-800">
                  实习 / 工作经历
                </div>
                <div className="mt-3 space-y-3">
                  {resume.experience.map((exp, idx) => (
                    <div
                      key={idx}
                      className="rounded-2xl border border-slate-200 bg-white/90 p-3"
                    >
                      <div className="mb-2 flex items-center justify-between">
                        <div className="text-xs font-medium text-neutral-700">
                          经历 {idx + 1}
                        </div>
                        <button
                          className="text-xs text-neutral-400 hover:text-red-500"
                          onClick={() => removeExperienceItem(idx)}
                        >
                          删除
                        </button>
                      </div>
                      <div className="grid gap-3 sm:grid-cols-2">
                        <label className="text-xs text-neutral-600">
                          公司
                          <input
                            className="mt-1 w-full rounded-2xl border border-slate-200 bg-white/90 px-3 py-2.5 text-sm text-slate-900 outline-none transition-all duration-300 focus:border-sky-400 focus:ring-4 focus:ring-sky-100"
                            value={exp.company}
                            onChange={(e) =>
                              updateExperienceItem(idx, {
                                company: e.target.value,
                              })
                            }
                          />
                        </label>
                        <label className="text-xs text-neutral-600">
                          岗位
                          <input
                            className="mt-1 w-full rounded-2xl border border-slate-200 bg-white/90 px-3 py-2.5 text-sm text-slate-900 outline-none transition-all duration-300 focus:border-sky-400 focus:ring-4 focus:ring-sky-100"
                            value={exp.role}
                            onChange={(e) =>
                              updateExperienceItem(idx, {
                                role: e.target.value,
                              })
                            }
                          />
                        </label>
                        <label className="text-xs text-neutral-600">
                          开始
                          <input
                            className="mt-1 w-full rounded-2xl border border-slate-200 bg-white/90 px-3 py-2.5 text-sm text-slate-900 outline-none transition-all duration-300 focus:border-sky-400 focus:ring-4 focus:ring-sky-100"
                            value={exp.start}
                            onChange={(e) =>
                              updateExperienceItem(idx, {
                                start: e.target.value,
                              })
                            }
                          />
                        </label>
                        <label className="text-xs text-neutral-600">
                          结束
                          <input
                            className="mt-1 w-full rounded-2xl border border-slate-200 bg-white/90 px-3 py-2.5 text-sm text-slate-900 outline-none transition-all duration-300 focus:border-sky-400 focus:ring-4 focus:ring-sky-100"
                            value={exp.end}
                            onChange={(e) =>
                              updateExperienceItem(idx, {
                                end: e.target.value,
                              })
                            }
                          />
                        </label>
                      </div>
                      <label className="mt-3 block text-xs text-neutral-600">
                        原始描述（可粘贴流水账）
                        <textarea
                          className="mt-1 w-full rounded-2xl border border-slate-200 bg-white/90 px-3 py-2.5 text-sm text-slate-900 outline-none transition-all duration-300 placeholder:text-slate-400 focus:border-sky-400 focus:ring-4 focus:ring-sky-100"
                          rows={4}
                          value={exp.summary}
                          onChange={(e) =>
                            updateExperienceItem(idx, {
                              summary: e.target.value,
                            })
                          }
                        />
                      </label>

                      <label className="mt-3 block text-xs text-neutral-600">
                        STAR / 优化后要点（每行一条）
                        <textarea
                          className="mt-1 w-full rounded-2xl border border-slate-200 bg-white/90 px-3 py-2.5 text-sm text-slate-900 outline-none transition-all duration-300 placeholder:text-slate-400 focus:border-sky-400 focus:ring-4 focus:ring-sky-100"
                          rows={5}
                          value={experienceBulletDrafts[idx] ?? ""}
                          onChange={(e) => {
                            const raw = e.target.value;

                            updateExperienceBulletDraft(idx, raw);

                            const bullets = raw
                              .split("\n")
                              .map((x) => x.trim())
                              .filter(Boolean);

                            updateExperienceItem(idx, { bullets });
                          }}
                        />
                      </label>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <button
                          className="rounded-xl bg-neutral-900 px-4 py-2 text-xs font-medium text-white hover:bg-neutral-800"
                          onClick={() => {
                            const summary = exp.summary ?? "";
                            const { bullets } = starifySummary(summary);
                            updateExperienceItem(idx, { bullets });
                            updateExperienceBulletDraft(idx, bullets.join("\n"));
                          }}
                        >
                          一键 STAR（规则版）
                        </button>
                        <button
                          className="rounded-xl bg-white px-4 py-2 text-xs font-medium text-neutral-900 shadow-sm hover:shadow"
                          onClick={() => {
                            updateExperienceItem(idx, { bullets: [] });
                            updateExperienceBulletDraft(idx, "");
                          }}
                        >
                          清空 bullets
                        </button>
                      </div>
                    </div>
                  ))}
                  <button
                    className="w-full rounded-xl border border-dashed border-slate-300 py-2 text-xs font-medium text-slate-700 hover:border-slate-400 hover:bg-slate-50"
                    onClick={addExperienceItem}
                  >
                    + 新增一条经历
                  </button>
                  <div className="mt-2 text-xs text-neutral-500">
                    说明：JD 匹配建议为规则生成，不会瞎编经历；示例句式请替换为你的真实工作内容与数据。
                  </div>
                </div>
              </div>
            )}

            {/* 校园经历 */}
            {activeModule === "campus" && (
              <div className="mt-6">
                <div className="text-sm font-semibold tracking-tight text-slate-800">
                  校园经历
                </div>
                <div className="mt-3 space-y-3">
                  {resume.campus.map((c, idx) => (
                    <div
                      key={idx}
                      className="rounded-2xl border border-slate-200 bg-white/90 p-3"
                    >
                      <div className="mb-2 flex items-center justify-between">
                        <div className="text-xs font-medium text-neutral-700">
                          校园经历 {idx + 1}
                        </div>
                        <button
                          className="text-xs text-neutral-400 hover:text-red-500"
                          onClick={() => removeCampusItem(idx)}
                        >
                          删除
                        </button>
                      </div>
                      <div className="grid gap-3 sm:grid-cols-2">
                        <label className="text-xs text-neutral-600">
                          组织/社团
                          <input
                            className="mt-1 w-full rounded-2xl border border-slate-200 bg-white/90 px-3 py-2.5 text-sm text-slate-900 outline-none transition-all duration-300 focus:border-sky-400 focus:ring-4 focus:ring-sky-100"
                            value={c.org}
                            onChange={(e) =>
                              updateCampusItem(idx, { org: e.target.value })
                            }
                          />
                        </label>
                        <label className="text-xs text-neutral-600">
                          职务
                          <input
                            className="mt-1 w-full rounded-2xl border border-slate-200 bg-white/90 px-3 py-2.5 text-sm text-slate-900 outline-none transition-all duration-300 focus:border-sky-400 focus:ring-4 focus:ring-sky-100"
                            value={c.role}
                            onChange={(e) =>
                              updateCampusItem(idx, { role: e.target.value })
                            }
                          />
                        </label>
                        <label className="text-xs text-neutral-600">
                          起止时间
                          <div className="mt-1 grid grid-cols-2 gap-2">
                            <input
                              className="rounded-2xl border border-slate-200 bg-white/90 px-3 py-2.5 text-sm text-slate-900 outline-none transition-all duration-300 focus:border-sky-400 focus:ring-4 focus:ring-sky-100"
                              placeholder="开始"
                              value={c.start}
                              onChange={(e) =>
                                updateCampusItem(idx, { start: e.target.value })
                              }
                            />
                            <input
                              className="rounded-2xl border border-slate-200 bg-white/90 px-3 py-2.5 text-sm text-slate-900 outline-none transition-all duration-300 focus:border-sky-400 focus:ring-4 focus:ring-sky-100"
                              placeholder="结束"
                              value={c.end}
                              onChange={(e) =>
                                updateCampusItem(idx, { end: e.target.value })
                              }
                            />
                          </div>
                        </label>
                      </div>
                      <label className="mt-3 block text-xs text-neutral-600">
                        主要工作与成果
                        <textarea
                          className="mt-1 w-full rounded-2xl border border-slate-200 bg-white/90 px-3 py-2.5 text-sm text-slate-900 outline-none transition-all duration-300 placeholder:text-slate-400 focus:border-sky-400 focus:ring-4 focus:ring-sky-100"
                          rows={3}
                          value={c.desc}
                          onChange={(e) =>
                            updateCampusItem(idx, { desc: e.target.value })
                          }
                        />
                      </label>
                    </div>
                  ))}
                  <button
                    className="w-full rounded-xl border border-dashed border-slate-300 py-2 text-xs font-medium text-slate-700 hover:border-slate-400 hover:bg-slate-50"
                    onClick={addCampusItem}
                  >
                    + 新增一条校园经历
                  </button>
                </div>
              </div>
            )}

            {/* 获奖经历 */}
            {activeModule === "awards" && (
              <div className="mt-6">
                <div className="text-sm font-semibold tracking-tight text-slate-800">
                  获奖经历
                </div>
                <div className="mt-3 space-y-3">
                  {resume.awards.map((a, idx) => (
                    <div
                      key={idx}
                      className="rounded-2xl border border-slate-200 bg-white/90 p-3"
                    >
                      <div className="mb-2 flex items-center justify-between">
                        <div className="text-xs font-medium text-neutral-700">
                          奖项 {idx + 1}
                        </div>
                        <button
                          className="text-xs text-neutral-400 hover:text-red-500"
                          onClick={() => removeAwardItem(idx)}
                        >
                          删除
                        </button>
                      </div>
                      <div className="grid gap-3 sm:grid-cols-2">
                        <label className="text-xs text-neutral-600">
                          奖项名称
                          <input
                            className="mt-1 w-full rounded-2xl border border-slate-200 bg-white/90 px-3 py-2.5 text-sm text-slate-900 outline-none transition-all duration-300 focus:border-sky-400 focus:ring-4 focus:ring-sky-100"
                            value={a.title}
                            onChange={(e) =>
                              updateAwardItem(idx, { title: e.target.value })
                            }
                          />
                        </label>
                        <label className="text-xs text-neutral-600">
                          时间
                          <input
                            className="mt-1 w-full rounded-2xl border border-slate-200 bg-white/90 px-3 py-2.5 text-sm text-slate-900 outline-none transition-all duration-300 focus:border-sky-400 focus:ring-4 focus:ring-sky-100"
                            value={a.date}
                            onChange={(e) =>
                              updateAwardItem(idx, { date: e.target.value })
                            }
                          />
                        </label>
                      </div>
                      <label className="mt-3 block text-xs text-neutral-600">
                        简要说明
                        <textarea
                          className="mt-1 w-full rounded-2xl border border-slate-200 bg-white/90 px-3 py-2.5 text-sm text-slate-900 outline-none transition-all duration-300 placeholder:text-slate-400 focus:border-sky-400 focus:ring-4 focus:ring-sky-100"
                          rows={3}
                          value={a.desc}
                          onChange={(e) =>
                            updateAwardItem(idx, { desc: e.target.value })
                          }
                        />
                      </label>
                    </div>
                  ))}
                  <button
                    className="w-full rounded-xl border border-dashed border-slate-300 py-2 text-xs font-medium text-slate-700 hover:border-slate-400 hover:bg-slate-50"
                    onClick={addAwardItem}
                  >
                    + 新增一条获奖经历
                  </button>
                </div>
              </div>
            )}

            {/* 技能 */}
            {activeModule === "skills" && (
              <div className="mt-6">
                <div className="text-sm font-semibold tracking-tight text-slate-800">
                  技能
                </div>
                <div className="mt-3 space-y-3">
                  {resume.skills.categories.map((c, idx) => (
                    <div
                      key={idx}
                      className="rounded-2xl border border-slate-200 bg-white/90 p-3"
                    >
                      <div className="mb-2 flex items-center justify-between gap-2">
                        <input
                          className="w-full rounded-2xl border border-slate-200 bg-white/90 px-3 py-2.5 text-sm text-slate-900 outline-none transition-all duration-300 focus:border-sky-400 focus:ring-4 focus:ring-sky-100"
                          value={c.name}
                          onChange={(e) =>
                            updateSkillCategoryName(idx, e.target.value)
                          }
                        />
                        <button
                          className="shrink-0 text-xs text-neutral-400 hover:text-red-500"
                          onClick={() => removeSkillCategory(idx)}
                          title="删除分类"
                        >
                          删除
                        </button>
                      </div>
                      <label className="block text-xs text-neutral-600">
                        技能条目（可用换行/逗号/斜杠分隔）
                        <textarea
                          className="mt-1 w-full rounded-2xl border border-slate-200 bg-white/90 px-3 py-2.5 text-sm text-slate-900 outline-none transition-all duration-300 placeholder:text-slate-400 focus:border-sky-400 focus:ring-4 focus:ring-sky-100"
                          value={skillDrafts[idx] ?? ""}
                          onChange={(e) => updateSkillDraft(idx, e.target.value)}
                          onBlur={() => commitSkillDraft(idx)}
                        />
                      </label>
                    </div>
                  ))}
                  <button
                    className="w-full rounded-xl border border-dashed border-slate-300 py-2 text-xs font-medium text-slate-700 hover:border-slate-400 hover:bg-slate-50"
                    onClick={addSkillCategory}
                  >
                    + 新增技能分类
                  </button>
                </div>
              </div>
            )}

          </div>

          {/* Medium: preview */}
          <div className="space-y-3">
          <div className="rounded-[26px] border border-white/70 bg-white/85 p-5 shadow-[0_12px_40px_rgba(15,23,42,0.06)] backdrop-blur-xl">
              <div className="flex items-center justify-between">
                <div className="text-sm font-semibold text-neutral-800">
                  岗位匹配分析（AI）
                </div>

                {matchResult && (
                  <button
                    className="text-xs text-neutral-500 hover:text-neutral-800"
                    onClick={() => setMatchResult(null)}
                  >
                    清空结果
                  </button>
                )}
              </div>

              <div className="mt-3">
                <button
                  className="rounded-xl bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800 disabled:opacity-50"
                  onClick={handleAnalyzeJD}
                  disabled={isAnalyzing}
                >
                  {isAnalyzing ? "正在分析..." : "开始分析"}
                </button>
              </div>

              {!jdText.trim() && (
                <div className="mt-3 text-sm text-neutral-500">
                  请先在左侧填写岗位描述（JD），再点击“开始分析”
                </div>
              )}

              {matchResult && (
                <div className="mt-4">
                  <div className="text-sm font-semibold">
                    匹配度：{matchResult.score}%
                  </div>

                  <div className="mt-4">
                    <div className="text-sm font-semibold text-neutral-800">匹配优势</div>
                    <ul className="mt-2 list-disc pl-5 text-sm text-neutral-800">
                      {matchResult.strengths?.map((s, i) => (
                        <li key={i}>{s}</li>
                      ))}
                    </ul>
                  </div>

                  <div className="mt-4">
                    <div className="text-sm font-semibold text-neutral-800">主要缺失</div>
                    <ul className="mt-2 list-disc pl-5 text-sm text-neutral-800">
                      {matchResult.missing?.map((s, i) => (
                        <li key={i}>{s}</li>
                      ))}
                    </ul>
                  </div>

                  <div className="mt-4">
                    <div className="text-sm font-semibold text-neutral-800">优化建议</div>
                    <ul className="mt-2 list-disc pl-5 text-sm text-neutral-800">
                      {matchResult.suggestions?.map((s, i) => (
                        <li key={i}>{s}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}
            </div>
          
            

            {/* 模板切换 */}
            <div className="rounded-[26px] border border-white/70 bg-white/85 p-5 shadow-[0_12px_40px_rgba(15,23,42,0.06)] backdrop-blur-xl">
              <div className="mb-3 text-sm font-semibold tracking-tight text-slate-800">模板</div>
              <div className="mt-3 flex flex-wrap gap-2">
                {([
                  ["classic", "Classic 单栏"],
                  ["modern", "Modern 单栏"],
                  ["compact", "Compact 紧凑"],
                  ["atspro", "ATS pro ⭐"],
                ] as Array<[TemplateKey, string]>).map(([key, label]) => (
                  <button
                    key={key}
                    className={
                      "rounded-2xl px-4 py-2.5 text-sm font-medium transition-all duration-300 " +
                      (template === key
                        ? "bg-[linear-gradient(135deg,#0f172a_0%,#1e293b_55%,#334155_100%)] text-white shadow-[0_8px_24px_rgba(15,23,42,0.16)]"
                        : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50")
                    }
                    onClick={() => setTemplate(key)}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <div className="rounded-[28px] border border-white/70 bg-white/70 p-4 shadow-[0_18px_60px_rgba(15,23,42,0.08)] backdrop-blur-xl md:p-5">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <div className="text-sm font-semibold text-slate-800">简历预览</div>
                  <div className="mt-1 text-xs text-slate-500">
                    当前模板：{template}
                  </div>
                </div>
              </div>
              <div className="rounded-[24px] bg-[#f8fafc] p-3 md:p-4">
                <div id="resume-print-area" ref={printRef}>
                  <ResumePreview resume={resume} template={template} />
                </div>
              </div>
            </div>

            
          </div>
        </div>
      </div>

      {/* Desktop dock */}
      <aside className="hidden xl:block fixed right-6 top-6 bottom-6 w-[360px] z-40">
        <AIAssistant
          resume={resume}
          jd={jdText}
          setResume={setResume}
          className="h-full"
        />
      </aside>

      {/* Mobile/tablet drawer */}
      {isAIOpen && (
        <div className="fixed inset-0 z-50 xl:hidden">
          <button
            aria-label="关闭 AI 助手"
            className="absolute inset-0 bg-black/30"
            onClick={() => setIsAIOpen(false)}
          />
          <div className="absolute right-0 top-0 h-full w-[360px] max-w-[92vw] p-4">
            <div className="relative h-full">
              <button
                className="absolute right-3 top-3 z-10 rounded-xl bg-white/90 px-3 py-2 text-sm font-medium shadow-sm hover:shadow"
                onClick={() => setIsAIOpen(false)}
              >
                关闭
              </button>
              <AIAssistant
                resume={resume}
                jd={jdText}
                setResume={setResume}
                className="h-full"
              />
            </div>
          </div>
        </div>
      )}

      {/* Floating open button */}
      <button
        className="fixed bottom-6 right-6 z-40 rounded-full bg-neutral-900 px-5 py-3 text-sm font-medium text-white shadow-lg hover:bg-neutral-800 xl:hidden"
        onClick={() => setIsAIOpen(true)}
      >
        打开 AI
      </button>
      <style jsx global>{`
        @media print {
          body.resume-printing * {
            visibility: hidden !important;
          }

          body.resume-printing #resume-print-area,
          body.resume-printing #resume-print-area * {
            visibility: visible !important;
          }

          body.resume-printing #resume-print-area {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            background: white !important;
            margin: 0 !important;
            padding: 0 !important;
          }

          body.resume-printing {
            background: white !important;
          }

          @page {
            size: A4;
            margin: 12mm;
          }
        }
      `}</style>
    </div>
  );
}