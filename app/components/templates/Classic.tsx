import { Resume, defaultResume } from "@/app/lib/resumeSchema";

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div className="mt-7 mb-3">
      <div className="flex items-center gap-3">
        <h2 className="shrink-0 text-[13px] font-bold tracking-[0.08em] text-neutral-900">
          {children}
        </h2>
        <div className="h-px w-full bg-neutral-300" />
      </div>
    </div>
  );
}

function EmptyHint({ children }: { children: React.ReactNode }) {
  return <div className="text-[11px] italic text-neutral-400">{children}</div>;
}

export default function ClassicTemplate({ resume }: { resume: Resume }) {
  const b = resume.basics ?? defaultResume.basics;
  const sections = resume.sections ?? defaultResume.sections;

  return (
    <div className="mx-auto w-full max-w-[820px] bg-white px-10 py-9 text-[12.5px] leading-6 text-neutral-900">
      {/* Header */}
      <div className="border-b border-neutral-300 pb-5">
        <div className="flex items-start justify-between gap-6">
          <div className="min-w-0 flex-1">
            <div className="text-[34px] font-bold leading-none tracking-tight text-neutral-950">
              {b.name || "未命名"}
            </div>

            {(b.title || b.city || b.phone || b.email || b.links?.length > 0) && (
              <div className="mt-3 space-y-1">
                {b.title ? (
                  <div className="text-[15px] font-medium text-neutral-700">
                    {b.title}
                  </div>
                ) : null}

                <div className="text-[11.5px] text-neutral-600">
                  {[b.city, b.phone, b.email, ...(b.links || [])]
                    .filter(Boolean)
                    .join(" · ")}
                </div>
              </div>
            )}
          </div>

          {b.showPhoto && (
            <div className="shrink-0">
              <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-md border border-neutral-200 bg-neutral-50">
                {b.photo ? (
                  <img
                    src={b.photo}
                    className="h-full w-full object-cover"
                    alt="avatar"
                  />
                ) : (
                  <span className="text-[10px] text-neutral-400">Photo</span>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Education */}
      {sections.education && (
        <>
          <SectionTitle>教育背景</SectionTitle>
          {resume.education.length ? (
            <div className="space-y-3">
              {resume.education.map((e, idx) => (
                <div key={idx}>
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <div className="text-[13px] font-semibold text-neutral-900">
                        {e.school || "学校名称"}
                      </div>
                      <div className="text-neutral-700">
                        {[e.major, e.degree].filter(Boolean).join(" · ")}
                      </div>
                    </div>
                    <div className="shrink-0 text-[11.5px] text-neutral-500">
                      {[e.start, e.end].filter(Boolean).join(" - ")}
                    </div>
                  </div>

                  {e.highlights?.length ? (
                    <ul className="mt-1.5 list-disc pl-5 text-neutral-700">
                      {e.highlights.slice(0, 3).map((h, i) => (
                        <li key={i}>{h}</li>
                      ))}
                    </ul>
                  ) : null}
                </div>
              ))}
            </div>
          ) : (
            <EmptyHint>暂无教育背景内容</EmptyHint>
          )}
        </>
      )}

      {/* Experience */}
      {sections.experience && (
        <>
          <SectionTitle>实习与工作经历</SectionTitle>
          {resume.experience.length ? (
            <div className="space-y-4">
              {resume.experience.map((x, idx) => {
                const lines = x.bullets?.length
                  ? x.bullets
                  : x.summary
                  ? [x.summary]
                  : [];

                return (
                  <div key={idx}>
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <div className="text-[13px] font-semibold text-neutral-900">
                          {x.company || "公司名称"}
                        </div>
                        <div className="text-neutral-700">
                          {[x.role, x.city].filter(Boolean).join(" · ")}
                        </div>
                      </div>
                      <div className="shrink-0 text-[11.5px] text-neutral-500">
                        {[x.start, x.end].filter(Boolean).join(" - ")}
                      </div>
                    </div>

                    {lines.length ? (
                      <ul className="mt-1.5 list-disc pl-5 text-neutral-800">
                        {lines.slice(0, 5).map((t, i) => (
                          <li key={i}>{t}</li>
                        ))}
                      </ul>
                    ) : null}
                  </div>
                );
              })}
            </div>
          ) : (
            <EmptyHint>暂无实习或工作经历内容</EmptyHint>
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
                <div key={idx}>
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <div className="text-[13px] font-semibold text-neutral-900">
                        {c.org || "组织名称"}
                      </div>
                      <div className="text-neutral-700">{c.role}</div>
                    </div>
                    <div className="shrink-0 text-[11.5px] text-neutral-500">
                      {[c.start, c.end].filter(Boolean).join(" - ")}
                    </div>
                  </div>
                  {c.desc ? (
                    <div className="mt-1.5 whitespace-pre-line text-neutral-800">{c.desc}</div>
                  ) : null}
                </div>
              ))}
            </div>
          ) : (
            <EmptyHint>暂无校园经历内容</EmptyHint>
          )}
        </>
      )}

      {/* Awards */}
      {sections.awards && (
        <>
          <SectionTitle>获奖经历</SectionTitle>
          {resume.awards.length ? (
            <div className="space-y-3">
              {resume.awards.map((a, idx) => (
                <div key={idx}>
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <div className="text-[13px] font-semibold text-neutral-900">
                        {a.title || "奖项名称"}
                      </div>
                      {a.desc ? (
                        <div className="text-neutral-700">{a.desc}</div>
                      ) : null}
                    </div>
                    <div className="shrink-0 text-[11.5px] text-neutral-500">
                      {a.date}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <EmptyHint>暂无获奖经历内容</EmptyHint>
          )}
        </>
      )}

      {/* Projects */}
      {resume.projects.length ? (
        <>
          <SectionTitle>项目经历</SectionTitle>
          <div className="space-y-4">
            {resume.projects.map((p, idx) => (
              <div key={idx}>
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="text-[13px] font-semibold text-neutral-900">
                      {p.name || "项目名称"}
                    </div>
                    <div className="text-neutral-700">{p.role}</div>
                  </div>
                  <div className="shrink-0 text-[11.5px] text-neutral-500">
                    {[p.start, p.end].filter(Boolean).join(" - ")}
                  </div>
                </div>

                {p.bullets?.length ? (
                  <ul className="mt-1.5 list-disc pl-5 text-neutral-800">
                    {p.bullets.slice(0, 5).map((t, i) => (
                      <li key={i}>{t}</li>
                    ))}
                  </ul>
                ) : null}
              </div>
            ))}
          </div>
        </>
      ) : null}

      {/* Skills */}
      {sections.skills && (
        <>
          <SectionTitle>技能</SectionTitle>
          {resume.skills.categories.length ? (
            <div className="space-y-1.5 text-neutral-800">
              {resume.skills.categories.map((c, idx) => (
                <div key={idx}>
                  <span className="font-semibold text-neutral-900">{c.name}：</span>
                  <span className="text-neutral-700">{c.items.join(" / ")}</span>
                </div>
              ))}
            </div>
          ) : (
            <EmptyHint>暂无技能内容</EmptyHint>
          )}
        </>
      )}
    </div>
  );
}