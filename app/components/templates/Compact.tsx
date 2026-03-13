import { Resume, defaultResume } from "@/app/lib/resumeSchema";

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div className="mt-4 mb-1 text-[11px] font-semibold tracking-wide text-neutral-800">
      {children}
      <div className="mt-1 h-px w-full bg-neutral-200" />
    </div>
  );
}

export default function CompactTemplate({ resume }: { resume: Resume }) {
  const b = resume.basics;
  const sections = resume.sections ?? defaultResume.sections;

  return (
    <div className="mx-auto w-full max-w-[820px] bg-white p-7 text-[11px] leading-5 text-neutral-900">
      {/* Header (更紧凑) */}
      <div className="flex items-start justify-between gap-6">
        <div className="min-w-0">
          <div className="text-xl font-bold tracking-tight">
            {b.name || "未命名"}
          </div>
          <div className="mt-1 text-[12px] text-neutral-700">
            {b.title}
          </div>
        </div>

        <div className="flex items-start gap-3">
          <div className="shrink-0 text-right text-neutral-700">
            <div>{[b.city, b.phone, b.email].filter(Boolean).join(" · ")}</div>
            {b.links?.length ? <div>{b.links.join(" · ")}</div> : null}
          </div>

          {b.showPhoto && (
            <div className="w-16 h-16 rounded-full overflow-hidden border border-neutral-200 bg-neutral-100 flex items-center justify-center">
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
        </div>
      </div>

      {sections.education && (
        <>
          <SectionTitle>教育背景</SectionTitle>
          {resume.education.length ? (
            <div className="space-y-1">
              {resume.education.map((e, idx) => (
                <div key={idx} className="flex justify-between gap-4">
                  <div className="min-w-0">
                    <span className="font-medium">{e.school}</span>
                    <span className="text-neutral-700">
                      {"  "}
                      {[e.major, e.degree].filter(Boolean).join(" | ")}
                    </span>
                    {e.highlights?.length ? (
                      <div className="text-neutral-700">
                        {e.highlights.slice(0, 2).join("；")}
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
            <div className="text-[10px] text-neutral-500">
              请在左侧添加教育背景。
            </div>
          )}
        </>
      )}

      {sections.experience && (
        <>
          <SectionTitle>实习与工作经历</SectionTitle>
          {resume.experience.length ? (
            <div className="space-y-2">
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
                  <ul className="mt-1 list-disc pl-5">
                    {(x.bullets?.length ? x.bullets : x.summary ? [x.summary] : [])
                      .slice(0, 6)
                      .map((t, i) => (
                        <li key={i}>{t}</li>
                      ))}
                  </ul>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-[10px] text-neutral-500">
              请在左侧添加实习或工作经历（如无可关闭该模块）。
            </div>
          )}
        </>
      )}

      {sections.campus && (
        <>
          <SectionTitle>校园经历</SectionTitle>
          {resume.campus.length ? (
            <div className="space-y-1">
              {resume.campus.map((c, idx) => (
                <div key={idx} className="space-y-0.5">
                  <div className="flex justify-between gap-4">
                    <div className="min-w-0 font-medium">
                      {[c.org, c.role].filter(Boolean).join(" | ")}
                    </div>
                    <div className="shrink-0 text-neutral-600">
                      {[c.start, c.end].filter(Boolean).join(" - ")}
                    </div>
                  </div>

                  {c.desc ? (
                    <div className="whitespace-pre-line text-neutral-700">
                      {c.desc}
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-[10px] text-neutral-500">
              请在左侧添加校园经历（学生工作/社团等）。
            </div>
          )}
        </>
      )}

      {sections.awards && (
        <>
          <SectionTitle>获奖经历</SectionTitle>
          {resume.awards.length ? (
            <div className="space-y-1">
              {resume.awards.map((a, idx) => (
                <div key={idx} className="flex justify-between gap-4">
                  <div className="min-w-0">
                    <span className="font-medium">{a.title}</span>
                    {a.desc ? (
                      <div className="text-neutral-700">{a.desc}</div>
                    ) : null}
                  </div>
                  <div className="shrink-0 text-neutral-600">{a.date}</div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-[10px] text-neutral-500">
              请在左侧添加获奖/荣誉信息。
            </div>
          )}
        </>
      )}

      {sections.skills && (
        <>
          <SectionTitle>技能</SectionTitle>
          <div className="space-y-1">
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