"use client";

import { useEffect, useState } from "react";
import ResumePreview, { TemplateKey } from "@/app/components/ResumePreview";
import { defaultResume, type Resume } from "@/app/lib/resumeSchema";

export default function PrintPage() {
  const [resume, setResume] = useState<Resume | null>(null);
  const [template, setTemplate] = useState<TemplateKey>("atspro");

  // 从 localStorage 读取打印数据
  useEffect(() => {
    try {
      const raw = localStorage.getItem("resume_print_payload");
      if (!raw) return;

      const parsed = JSON.parse(raw);
      const rawResume = parsed?.resume ?? null;
      const rawTemplate = parsed?.template ?? "atspro";

      if (!rawResume || typeof rawResume !== "object") return;

      const normalizedResume: Resume = {
        ...defaultResume,
        ...rawResume,
        basics: {
          ...defaultResume.basics,
          ...(rawResume.basics ?? {}),
        },
        sections: {
          ...defaultResume.sections,
          ...(rawResume.sections ?? {}),
        },
      };

      setResume(normalizedResume);
      setTemplate(rawTemplate as TemplateKey);
    } catch (err) {
      console.error("读取打印数据失败：", err);
    }
  }, []);

  // 自动打印
  useEffect(() => {
    if (!resume) return;

    const runPrint = async () => {
      if (document.fonts) await document.fonts.ready;

      setTimeout(() => window.print(), 500); // 延迟确保 DOM 渲染完成
    };

    runPrint();
  }, [resume]);

  if (!resume) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center text-sm text-neutral-500">
        正在加载打印内容...
      </div>
    );
  }

  return (
    <div className="print-page min-h-screen bg-white">
      <div className="mx-auto max-w-[900px] px-6 py-6">
        {/* 手动打印按钮 */}
        <button
          id="print-trigger"
          onClick={() => window.print()}
          className="mb-4 rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white no-print"
        >
          手动打印
        </button>

        {/* 简历渲染区域 */}
        <div id="resume-print-area">
          <ResumePreview resume={resume} template={template} />
        </div>
      </div>

      {/* 打印样式 */}
      <style jsx global>{`
        @media print {
          html,
          body {
            margin: 0 !important;
            padding: 0 !important;
            background: white !important;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }

          @page {
            size: A4;
            margin: 12mm;
          }

          #print-trigger,
          .no-print {
            display: none !important;
          }

          .print-page {
            background: white !important;
          }

          #resume-print-area > div {
            overflow: visible !important;
            border: 0 !important;
            background: white !important;
            padding: 0 !important;
            border-radius: 0 !important;
            box-shadow: none !important;
          }

          #resume-print-area > div > div {
            box-shadow: none !important;
          }

          .overflow-auto {
            overflow: visible !important;
          }

          .print-page > div,
          #resume-print-area > div {
            overflow: visible !important;
            box-shadow: none !important;
          }
        }
      `}</style>
    </div>
  );
}