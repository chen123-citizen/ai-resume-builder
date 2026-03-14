import { Resume, defaultResume } from "@/app/lib/resumeSchema";

const accent = "#0f172a";

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div className="mt-6 mb-3 flex items-center gap-2">
      <div
        className="h-[10px] w-[3px] rounded"
        style={{ backgroundColor: accent }}
      />
      <div
        className="text-[13px] font-semibold tracking-wide"
        style={{ color: accent }}
      >
        {children}
      </div>
      <div className="flex-1 h-px bg-neutral-200 ml-2" />
    </div>
  );
}

export default function ATSProTemplate({ resume }: { resume: Resume }) {
  const b = resume.basics ?? defaultResume.basics;
  const sections = resume.sections ?? defaultResume.sections;

  return (
    <div className="mx-auto w-full max-w-[820px] bg-white p-8 text-[12px] leading-5 text-neutral-900">

      {/* Header */}
      <div className="border-b pb-3 mb-4 relative">
        {b.showPhoto && (
          <div className="absolute right-0 top-0 w-16 h-16 rounded-full overflow-hidden border border-neutral-200 bg-neutral-100 flex items-center justify-center">
            {b.photo ? (
              <img
                src={b.photo}
                className="w-full h-full object-cover"
                alt="avatar"
              />
            ) : (
              <span className="text-[9px] text-neutral-400">
                Photo
              </span>
            )}
          </div>
        )}

        <div
          className="text-3xl font-bold tracking-tight"
          style={{ color: accent }}
        >
          {b.name || "未命名"}
        </div>

        <div className="mt-1 text-sm text-neutral-700">
          {b.title}
        </div>

        <div className="mt-2 text-[12px] text-neutral-600 flex flex-wrap gap-x-3">
          {[b.city, b.phone, b.email, ...b.links]
            .filter(Boolean)
            .map((item, i) => (
              <span key={i}>{item}</span>
            ))}
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
                    {(x.bullets?.length
                      ? x.bullets
                      : x.summary
                      ? [x.summary]
                      : []
                    )
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
              请在左侧添加实习或工作经历。
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
                <div key={idx} className="space-y-1">
                  <div className="flex justify-between gap-4">
                    <div className="min-w-0 font-medium">
                      {[c.org, c.role].filter(Boolean).join(" | ")}
                    </div>
                    <div className="shrink-0 text-neutral-600">
                      {[c.start, c.end].filter(Boolean).join(" - ")}
                    </div>
                  </div>
                  {c.desc ? (
                    <div className="whitespace-pre-line text-neutral-800">
                      {c.desc}
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-[11px] text-neutral-500">
              请在左侧添加校园经历。
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

                  <div className="shrink-0 text-neutral-600">
                    {a.date}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-[11px] text-neutral-500">
              请在左侧添加获奖信息。
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
                  {p.bullets.slice(0, 5).map((t, i) => (
                    <li key={i}>{t}</li>
                  ))}
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
                <span className="text-neutral-700">
                  {c.items.join(" / ")}
                </span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}