import { Resume, defaultResume } from "@/app/lib/resumeSchema";

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div className="mt-6 mb-2 flex items-center gap-3">
      <div className="text-[12px] font-semibold tracking-wide text-neutral-900">
        {children}
      </div>
      <div className="h-px flex-1 bg-neutral-200" />
    </div>
  );
}

export default function ModernTemplate({ resume }: { resume: Resume }) {
  const b = resume.basics;
  const sections = resume.sections ?? defaultResume.sections;

  return (
    <div className="mx-auto w-full max-w-[820px] bg-white p-9 text-[12px] leading-5 text-neutral-900">
      {/* Header */}
      <div className="rounded-2xl border border-neutral-200 p-5">
      <div className="flex items-start justify-between gap-6">
        <div className="min-w-0">
          <div className="text-[26px] font-semibold tracking-tight">
            {b.name || "未命名"}
          </div>
          <div className="mt-1 text-sm text-neutral-700">{b.title}</div>
        </div>

        <div className="flex items-start gap-4">
          <div className="shrink-0 text-right text-neutral-700">
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
      </div>

      {/* Education */}
      {sections.education && (
        <>
          <SectionTitle>教育背景</SectionTitle>
          {resume.education.length ? (
            <div className="space-y-3">
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
                      <div className="mt-1 text-neutral-700">
                        {e.highlights.slice(0, 3).join("；")}
                      </div>
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
            <div className="space-y-4">
              {resume.experience.map((x, idx) => (
                <div
                  key={idx}
                  className="rounded-xl border border-neutral-200 p-4"
                >
                  <div className="flex justify-between gap-4">
                    <div className="min-w-0 font-medium">
                      {[x.company, x.role].filter(Boolean).join(" | ")}
                    </div>
                    <div className="shrink-0 text-neutral-600">
                      {[x.start, x.end].filter(Boolean).join(" - ")}
                    </div>
                  </div>
                  <ul className="mt-2 list-disc pl-5 text-neutral-800">
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
            <div className="space-y-3">
              {resume.campus.map((c, idx) => (
                <div
                  key={idx}
                  className="rounded-xl border border-neutral-200 p-4"
                >
                  <div className="flex justify-between gap-4">
                    <div className="min-w-0 font-medium">
                      {[c.org, c.role].filter(Boolean).join(" | ")}
                    </div>
                    <div className="shrink-0 text-neutral-600">
                      {[c.start, c.end].filter(Boolean).join(" - ")}
                    </div>
                  </div>
                  {c.desc ? (
                    <div className="mt-2 text-neutral-800">{c.desc}</div>
                  ) : null}
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
            <div className="space-y-2">
              {resume.awards.map((a, idx) => (
                <div
                  key={idx}
                  className="flex justify-between gap-4 rounded-xl border border-neutral-200 p-3"
                >
                  <div className="min-w-0">
                    <div className="font-medium">{a.title}</div>
                    {a.desc ? (
                      <div className="mt-1 text-neutral-800">{a.desc}</div>
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