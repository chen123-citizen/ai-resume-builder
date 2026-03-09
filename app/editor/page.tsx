"use client";

import { useEffect, useMemo, useState } from "react";
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
import { calculateMatchScore, type JDMatchResult } from "@/app/lib/jdMatcher";
import AIAssistant from "@/app/components/AIAssistant";

export default function EditorPage() {
  const [resume, setResume] = useState<Resume>(defaultResume);
  const [template, setTemplate] = useState<TemplateKey>("classic");

  const [jdText, setJdText] = useState("");
  const [matchResult, setMatchResult] = useState<JDMatchResult | null>(null);
  const [isAIOpen, setIsAIOpen] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [debouncedJdText, setDebouncedJdText] = useState(jdText);
  const [debouncedResumeKey, setDebouncedResumeKey] = useState("");

  const handlePrint = () => {
    window.print();
  };



  useEffect(() => {
    setResume(loadResume());
  }, []);

  useEffect(() => {
    saveResume(resume);
  }, [resume]);

  const sections = resume.sections ?? defaultResume.sections;
  // ===== JD 匹配：实时分析（防抖） =====
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

    // 你现在有 education/awards/campus/skills，也可以算进去（更稳）
    const hasEducation = (resume.education ?? []).some(
      (e: any) => Boolean((e.school ?? "").trim()) || Boolean((e.major ?? "").trim())
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
    // 只取关键字段做 stringify，避免全量 stringify 太慢
    return JSON.stringify({
      basics: resume.basics,
      experience: resume.experience,
      education: resume.education,
      campus: resume.campus,
      awards: resume.awards,
      skills: resume.skills,
      sections: resume.sections,
    });
  }, [resume]);

  const jdOk = useMemo(() => (jdText ?? "").trim().length >= 30, [jdText]);

  const canAnalyze = useMemo(() => {
    return (debouncedJdText ?? "").trim().length >= 30 && resumeHasSomeContent;
  }, [debouncedJdText, resumeHasSomeContent]);

  // JD 防抖
  useEffect(() => {
    setIsAnalyzing(true);
    const t = setTimeout(() => setDebouncedJdText(jdText), 500);
    return () => clearTimeout(t);
  }, [jdText]);

  // Resume 防抖（用 resumeKey）
  useEffect(() => {
    setIsAnalyzing(true);
    const t = setTimeout(() => setDebouncedResumeKey(resumeKey), 500);
    return () => clearTimeout(t);
  }, [resumeKey]);

  // 真正触发计算
  useEffect(() => {
    if (!canAnalyze) {
      setMatchResult(null);
      setIsAnalyzing(false);
      return;
    }

    try {
      const result = calculateMatchScore(debouncedJdText, resume);
      setMatchResult(result);
    } finally {
      setIsAnalyzing(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedJdText, debouncedResumeKey, canAnalyze]);

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

  const updateSkillCategoryItems = (index: number, raw: string) => {
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

  return (
    <div className="min-h-screen bg-neutral-100">
      <div className="mx-auto max-w-screen-2xl p-6 xl:pr-[420px]">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <div className="text-xl font-semibold">简历编辑器</div>
            <div className="text-sm text-neutral-600">
            </div>
          </div>
          <a
            className="rounded-xl bg-white px-4 py-2 text-sm font-medium shadow-sm hover:shadow"
            href="/"
          >
            返回首页
          </a>
        </div>

        <div className="grid gap-6 lg:grid-cols-[460px_1fr] lg:items-start">
          {/* Left: form */}
          <div className="rounded-2xl border border-neutral-200 bg-white p-5">
            {/* JD 输入框 */}
            <div className="text-sm font-semibold text-neutral-800">岗位描述 (JD)</div>
            <div className="mt-3">
              <textarea
                className="w-full rounded-xl border border-neutral-200 px-3 py-2 text-sm"
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
                已开启自动分析（约 0.5 秒更新）
              </div>
            </div>

            {/* 模块选择 */}
            <div className="mt-6 text-sm font-semibold text-neutral-800">
              模块选择
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {[
                ["education", "教育背景"],
                ["experience", "实习/工作"],
                ["campus", "校园经历"],
                ["awards", "获奖经历"],
                ["skills", "技能"],
              ].map(([key, label]) => {
                const active = (sections as any)[key];
                return (
                  <button
                    key={key}
                    className={
                      "rounded-full px-3 py-1 text-xs font-medium border " +
                      (active
                        ? "border-neutral-900 bg-neutral-900 text-white"
                        : "border-neutral-200 bg-white text-neutral-800 hover:border-neutral-300")
                    }
                    onClick={() =>
                      setResume((r) => ({
                        ...r,
                        sections: {
                          ...defaultResume.sections,
                          ...(r.sections || {}),
                          [key]: !active,
                        } as any,
                      }))
                    }
                  >
                    {label}
                  </button>
                );
              })}
            </div>

            {/* 基本信息填写 */}
            <div className="mt-6 text-sm font-semibold text-neutral-800">基本信息</div>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              {(["name", "title", "phone", "email", "city"] as const).map((k) => (
                <label key={k} className="text-xs text-neutral-600">
                  {k.toUpperCase()}
                  <input
                    className="mt-1 w-full rounded-xl border border-neutral-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-neutral-200"
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

            <label className="flex items-center gap-2 text-xs text-neutral-700">
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

            {/* 头像上传 */}
            <div className="mt-4">
              <div className="text-xs text-neutral-600">头像</div>

              <div className="mt-2 flex items-center gap-3">
                {resume.basics.photo ? (
                  <img
                    src={resume.basics.photo}
                    className="w-16 h-16 rounded-lg object-cover border border-neutral-200"
                  />
                ) : (
                  <div className="w-16 h-16 rounded-lg border border-dashed border-neutral-300 flex items-center justify-center text-xs text-neutral-400">
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

            {/* 教育背景 */}
            {sections.education && (
              <div className="mt-6">
                <div className="text-sm font-semibold text-neutral-800">
                  教育背景
                </div>
                <div className="mt-3 space-y-3">
                  {resume.education.map((edu, idx) => (
                    <div
                      key={idx}
                      className="rounded-2xl border border-neutral-200 p-3"
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
                            className="mt-1 w-full rounded-xl border border-neutral-200 px-3 py-2 text-sm"
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
                            className="mt-1 w-full rounded-xl border border-neutral-200 px-3 py-2 text-sm"
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
                            className="mt-1 w-full rounded-xl border border-neutral-200 px-3 py-2 text-sm"
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
                              className="rounded-xl border border-neutral-200 px-3 py-2 text-sm"
                              placeholder="开始"
                              value={edu.start}
                              onChange={(e) =>
                                updateEducationItem(idx, {
                                  start: e.target.value,
                                })
                              }
                            />
                            <input
                              className="rounded-xl border border-neutral-200 px-3 py-2 text-sm"
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
                          className="mt-1 w-full rounded-xl border border-neutral-200 px-3 py-2 text-sm"
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
                    className="w-full rounded-xl border border-dashed border-neutral-300 py-2 text-xs font-medium text-neutral-700 hover:border-neutral-400 hover:bg-neutral-50"
                    onClick={addEducationItem}
                  >
                    + 新增一条教育经历
                  </button>
                </div>
              </div>
            )}

            {/* 实习/工作经历 */}
            {sections.experience && (
              <div className="mt-6">
                <div className="text-sm font-semibold text-neutral-800">
                  实习 / 工作经历
                </div>
                <div className="mt-3 space-y-3">
                  {resume.experience.map((exp, idx) => (
                    <div
                      key={idx}
                      className="rounded-2xl border border-neutral-200 p-3"
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
                            className="mt-1 w-full rounded-xl border border-neutral-200 px-3 py-2 text-sm"
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
                            className="mt-1 w-full rounded-xl border border-neutral-200 px-3 py-2 text-sm"
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
                            className="mt-1 w-full rounded-xl border border-neutral-200 px-3 py-2 text-sm"
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
                            className="mt-1 w-full rounded-xl border border-neutral-200 px-3 py-2 text-sm"
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
                          className="mt-1 w-full rounded-xl border border-neutral-200 px-3 py-2 text-sm"
                          rows={4}
                          value={exp.summary}
                          onChange={(e) =>
                            updateExperienceItem(idx, {
                              summary: e.target.value,
                            })
                          }
                        />
                      </label>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <button
                          className="rounded-xl bg-neutral-900 px-4 py-2 text-xs font-medium text-white hover:bg-neutral-800"
                          onClick={() => {
                            const summary = exp.summary ?? "";
                            const { bullets } = starifySummary(summary);
                            updateExperienceItem(idx, { bullets });
                          }}
                        >
                          一键 STAR（规则版）
                        </button>
                        <button
                          className="rounded-xl bg-white px-4 py-2 text-xs font-medium text-neutral-900 shadow-sm hover:shadow"
                          onClick={() => updateExperienceItem(idx, { bullets: [] })}
                        >
                          清空 bullets
                        </button>
                      </div>
                    </div>
                  ))}
                  <button
                    className="w-full rounded-xl border border-dashed border-neutral-300 py-2 text-xs font-medium text-neutral-700 hover:border-neutral-400 hover:bg-neutral-50"
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
            {sections.campus && (
              <div className="mt-6">
                <div className="text-sm font-semibold text-neutral-800">
                  校园经历
                </div>
                <div className="mt-3 space-y-3">
                  {resume.campus.map((c, idx) => (
                    <div
                      key={idx}
                      className="rounded-2xl border border-neutral-200 p-3"
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
                            className="mt-1 w-full rounded-xl border border-neutral-200 px-3 py-2 text-sm"
                            value={c.org}
                            onChange={(e) =>
                              updateCampusItem(idx, { org: e.target.value })
                            }
                          />
                        </label>
                        <label className="text-xs text-neutral-600">
                          职务
                          <input
                            className="mt-1 w-full rounded-xl border border-neutral-200 px-3 py-2 text-sm"
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
                              className="rounded-xl border border-neutral-200 px-3 py-2 text-sm"
                              placeholder="开始"
                              value={c.start}
                              onChange={(e) =>
                                updateCampusItem(idx, { start: e.target.value })
                              }
                            />
                            <input
                              className="rounded-xl border border-neutral-200 px-3 py-2 text-sm"
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
                          className="mt-1 w-full rounded-xl border border-neutral-200 px-3 py-2 text-sm"
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
                    className="w-full rounded-xl border border-dashed border-neutral-300 py-2 text-xs font-medium text-neutral-700 hover:border-neutral-400 hover:bg-neutral-50"
                    onClick={addCampusItem}
                  >
                    + 新增一条校园经历
                  </button>
                </div>
              </div>
            )}

            {/* 获奖经历 */}
            {sections.awards && (
              <div className="mt-6">
                <div className="text-sm font-semibold text-neutral-800">
                  获奖经历
                </div>
                <div className="mt-3 space-y-3">
                  {resume.awards.map((a, idx) => (
                    <div
                      key={idx}
                      className="rounded-2xl border border-neutral-200 p-3"
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
                            className="mt-1 w-full rounded-xl border border-neutral-200 px-3 py-2 text-sm"
                            value={a.title}
                            onChange={(e) =>
                              updateAwardItem(idx, { title: e.target.value })
                            }
                          />
                        </label>
                        <label className="text-xs text-neutral-600">
                          时间
                          <input
                            className="mt-1 w-full rounded-xl border border-neutral-200 px-3 py-2 text-sm"
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
                          className="mt-1 w-full rounded-xl border border-neutral-200 px-3 py-2 text-sm"
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
                    className="w-full rounded-xl border border-dashed border-neutral-300 py-2 text-xs font-medium text-neutral-700 hover:border-neutral-400 hover:bg-neutral-50"
                    onClick={addAwardItem}
                  >
                    + 新增一条获奖经历
                  </button>
                </div>
              </div>
            )}

            {/* 技能 */}
            {sections.skills && (
              <div className="mt-6">
                <div className="text-sm font-semibold text-neutral-800">技能</div>
                <div className="mt-3 space-y-3">
                  {resume.skills.categories.map((c, idx) => (
                    <div
                      key={idx}
                      className="rounded-2xl border border-neutral-200 p-3"
                    >
                      <div className="mb-2 flex items-center justify-between gap-2">
                        <input
                          className="w-full rounded-xl border border-neutral-200 px-3 py-2 text-sm"
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
                          className="mt-1 w-full rounded-xl border border-neutral-200 px-3 py-2 text-sm"
                          rows={3}
                          value={(c.items || []).join("\n")}
                          onChange={(e) =>
                            updateSkillCategoryItems(idx, e.target.value)
                          }
                        />
                      </label>
                    </div>
                  ))}
                  <button
                    className="w-full rounded-xl border border-dashed border-neutral-300 py-2 text-xs font-medium text-neutral-700 hover:border-neutral-400 hover:bg-neutral-50"
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
            {/* JD 匹配分析（只有算完才出现） */}
            {(matchResult || isAnalyzing || jdText.trim().length > 0) && (
              <div className="rounded-2xl border border-neutral-200 bg-white p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="text-sm font-semibold text-neutral-800">
                      岗位匹配分析
                    </div>

                    {isAnalyzing && (
                      <div className="flex items-center gap-2 text-xs text-neutral-500">
                        <span className="inline-block h-2 w-2 rounded-full bg-neutral-400 animate-pulse" />
                        正在分析…
                      </div>
                    )}
                  </div>

                  <button
                    className="text-xs text-neutral-500 hover:text-neutral-800"
                    onClick={() => setMatchResult(null)}
                  >
                    关闭
                  </button>
                </div>

                <div className="mt-3">
                  {!jdOk || !resumeHasSomeContent ? (
                    <div className="text-sm text-neutral-500">
                      请先填写 JD（至少 30 字），并在简历中补充一些信息（姓名/目标岗位/教育/经历等），我才能给出匹配分析。
                    </div>
                  ) : !matchResult ? (
                    <div className="text-sm text-neutral-500">正在生成分析结果…</div>
                  ) : (
                    <>
                      <div className="text-sm font-semibold">匹配度：{matchResult.score}%</div>

                      <div className="mt-3 space-y-2 text-sm text-neutral-700">
                        <div>
                          <span className="font-medium text-neutral-900">缺失技能：</span>
                          {matchResult.missing.skills.length
                            ? matchResult.missing.skills.join(" / ")
                            : "无"}
                        </div>
                        <div>
                          <span className="font-medium text-neutral-900">缺失工具：</span>
                          {matchResult.missing.tools.length
                            ? matchResult.missing.tools.join(" / ")
                            : "无"}
                        </div>
                        <div>
                          <span className="font-medium text-neutral-900">缺失软技能：</span>
                          {matchResult.missing.softSkills.length
                            ? matchResult.missing.softSkills.join(" / ")
                            : "无"}
                        </div>
                      </div>

                      <div className="mt-4">
                        <div className="text-sm font-semibold text-neutral-800">建议怎么改</div>
                        <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-neutral-800">
                          {matchResult.suggestions.map((s, i) => (
                            <li key={i}>{s}</li>
                          ))}
                        </ul>
                      </div>
                    </>
                  )}
                </div>
              </div>
            )}

            {/* 模板切换 */}
            <div className="rounded-2xl border border-neutral-200 bg-white p-4">
              <div className="text-sm font-semibold text-neutral-800">模板</div>
              <div className="mt-3 flex flex-wrap gap-2">
                {([
                  ["classic", "Classic 单栏"],
                  ["modern", "Modern 单栏"],
                  ["compact", "Compact 紧凑"],
                  ["atspro", "ATS pro ⭐"]
                ] as Array<[TemplateKey, string]>).map(([key, label]) => (
                  <button
                    key={key}
                    className={
                      "rounded-xl px-3 py-2 text-sm font-medium " +
                      (template === key
                        ? "bg-neutral-900 text-white"
                        : "bg-white text-neutral-900 shadow-sm hover:shadow")
                    }
                    onClick={() => setTemplate(key)}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <ResumePreview resume={resume} template={template} />

            {/* PDF 导出 */}
            <div className="rounded-2xl border border-neutral-200 bg-white p-4">
              <div className="text-sm font-semibold text-neutral-800">导出</div>
              <div className="mt-3 flex gap-2">
                <button
                  className="rounded-xl bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800"
                  onClick={handlePrint}
                >
                  导出 PDF
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Desktop dock (doesn't squeeze preview) */}
      <aside className="hidden xl:block fixed right-6 top-6 bottom-6 w-[360px] z-40">
      <AIAssistant resume={resume} jd={jdText} setResume={setResume} className="h-full" />
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
              <AIAssistant resume={resume} jd={jdText} setResume={setResume} className="h-full" />
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
    </div>
  );
}