import { Resume, defaultResume } from "@/app/lib/resumeSchema";
import ClassicTemplate from "./templates/Classic";
import ModernTemplate from "./templates/Modern";
import CompactTemplate from "./templates/Compact";
import ATSProTemplate from "./templates/ATSPro";

export type TemplateKey = "classic" | "modern" | "compact" | "atspro";

export default function ResumePreview({
  resume,
  template,
}: {
  resume: Resume;
  template: TemplateKey;
}) {
  const sections = resume.sections ?? defaultResume.sections;

  return (
    <div className="w-full overflow-auto rounded-2xl border border-neutral-200 bg-neutral-50 p-4">
      <div className="shadow-sm">
        {template === "classic" ? (
          <ClassicTemplate resume={{ ...resume, sections }} />
        ) : null}
        {template === "modern" ? (
          <ModernTemplate resume={{ ...resume, sections }} />
        ) : null}
        {template === "compact" ? (
          <CompactTemplate resume={{ ...resume, sections }} />
        ) : null}
        {template === "atspro" ? (
          <ATSProTemplate resume={{ ...resume, sections }} />
        ) : null}
      </div>
    </div>
  );
}