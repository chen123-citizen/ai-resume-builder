import { Resume, defaultResume } from "@/app/lib/resumeSchema";

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div className="mt-5 mb-2 text-sm font-semibold tracking-wide text-neutral-800">
      {children}
      <div className="mt-1 h-px w-full bg-neutral-200" />
    </div>
  );
}

export default function ClassicTemplate({ resume }: { resume: Resume }) {
  const b = resume.basics;
  const sections = resume.sections ?? defaultResume.sections;
  return (
    <div className="mx-auto w-full max-w-[820px] bg-white p-8 text-[12px] leading-5 text-neutral-900">
      {/* Header */}
      <div className="flex items-start justify-between gap-6">
        {/* 左侧：姓名 + 职位 */}
        <div>
          <div className="text-2xl font-bold tracking-tight">
            {b.name || "未命名"}
          </div>
          <div className="mt-1 text-sm text-neutral-700">
            {b.title}
          </div>
        </div>

        {/* 右侧：联系方式 + 头像 */}
        <div className="flex items-start gap-4">
          <div className="text-right text-neutral-700">
            <div>{[b.city, b.phone].filter(Boolean).join(" · ")}</div>
            <div>{[b.email, ...b.links].filter(Boolean).join(" · ")}</div>
          </div>
          {b.showPhoto && (
            <div className="w-20 h-20 rounded-full overflow-hidden border border-neutral-200 bg-neutral-100 flex items-center justify-center">
              {b.photo ? (
                <img
                  src={b.photo}
                  className="w-full h-full object-cover"
                  alt="avatar"
                />
              ) : (
                <span className="text-[10px] text-neutral-400">
                  Photo
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Education */}
      {sections.education && (
        <>
          <SectionTitle>教育背景</SectionTitle>
          {resume.education.length ? (
            <div className="space-y-2">
              {resume.education.map((e, idx) => (
                <div key={idx} className="flex justify-between gap-4">
                  <div className="min-w-0">
                    <div className="font-medium">
                      {[e.school, e.degree].filter(Boolean).join(" | ")}
                    </div>
                    <div className="text-neutral-700">
                      {[e.major].filter(Boolean).join(" ")}
                    </div>
                    {e.highlights?.length ? (
                      <ul className="mt-1 list-disc pl-5 text-neutral-700">
                        {e.highlights.slice(0, 3).map((h, i) => (
                          <li key={i}>{h}</li>
                        ))}
                      </ul>
                    ) : null}
                  </div>
                  <div className="shrink-0 text-neutral-600">
                    {[e.start, e.end].filter(Boolean).join(" - ")}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-[11px] text-neutral-500">
              请在左侧添加教育背景。
            </div>
          )}
        </>
      )}

      {/* Experience */}
      {sections.experience && (
        <>
          <SectionTitle>实习与工作经历</SectionTitle>
          {resume.experience.length ? (
            <div className="space-y-3">
              {resume.experience.map((x, idx) => (
                <div key={idx}>
                  <div className="flex justify-between gap-4">
                    <div className="min-w-0 font-medium">
                      {[x.company, x.role].filter(Boolean).join(" | ")}
                    </div>
                    <div className="shrink-0 text-neutral-600">
                      {[x.start, x.end].filter(Boolean).join(" - ")}
                    </div>
                  </div>
                  <ul className="mt-1 list-disc pl-5 text-neutral-800">
                    {(x.bullets?.length ? x.bullets : x.summary ? [x.summary] : [])
                      .slice(0, 5)
                      .map((t, i) => (
                        <li key={i}>{t}</li>
                      ))}
                  </ul>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-[11px] text-neutral-500">
              请在左侧添加实习或工作经历（如无可关闭该模块）。
            </div>
          )}
        </>
      )}

      {/* Campus */}
      {sections.campus && (
        <>
          <SectionTitle>校园经历</SectionTitle>
          {resume.campus.length ? (
            <div className="space-y-2">
              {resume.campus.map((c, idx) => (
                <div key={idx} className="flex justify-between gap-4">
                  <div className="min-w-0">
                    <div className="font-medium">
                      {[c.org, c.role].filter(Boolean).join(" | ")}
                    </div>
                    {c.desc ? (
                      <div className="mt-1 text-neutral-800">{c.desc}</div>
                    ) : null}
                  </div>
                  <div className="shrink-0 text-neutral-600">
                    {[c.start, c.end].filter(Boolean).join(" - ")}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-[11px] text-neutral-500">
              请在左侧添加校园经历（学生工作/社团等）。
            </div>
          )}
        </>
      )}

      {/* Awards */}
      {sections.awards && (
        <>
          <SectionTitle>获奖经历</SectionTitle>
          {resume.awards.length ? (
            <div className="space-y-1">
              {resume.awards.map((a, idx) => (
                <div key={idx} className="flex justify-between gap-4">
                  <div className="min-w-0">
                    <div className="font-medium">{a.title}</div>
                    {a.desc ? (
                      <div className="text-neutral-800">{a.desc}</div>
                    ) : null}
                  </div>
                  <div className="shrink-0 text-neutral-600">{a.date}</div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-[11px] text-neutral-500">
              请在左侧添加获奖/荣誉信息。
            </div>
          )}
        </>
      )}

      {/* Projects */}
      {resume.projects.length ? (
        <>
          <SectionTitle>项目经历</SectionTitle>
          <div className="space-y-3">
            {resume.projects.map((p, idx) => (
              <div key={idx}>
                <div className="flex justify-between gap-4">
                  <div className="min-w-0 font-medium">
                    {[p.name, p.role].filter(Boolean).join(" | ")}
                  </div>
                  <div className="shrink-0 text-neutral-600">
                    {[p.start, p.end].filter(Boolean).join(" - ")}
                  </div>
                </div>
                <ul className="mt-1 list-disc pl-5">
                  {p.bullets.slice(0, 5).map((t, i) => <li key={i}>{t}</li>)}
                </ul>
              </div>
            ))}
          </div>
        </>
      ) : null}

      {/* Skills */}
      {sections.skills && (
        <>
          <SectionTitle>技能</SectionTitle>
          <div className="space-y-1 text-neutral-800">
            {resume.skills.categories.map((c, idx) => (
              <div key={idx}>
                <span className="font-medium">{c.name}：</span>
                <span className="text-neutral-700">{c.items.join(" / ")}</span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}