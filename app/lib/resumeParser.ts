// app/lib/resumeParser.ts
import { Resume } from "@/app/lib/resumeSchema";

export type ResumeKeywords = {
  skills: string[];
  tools: string[];
  experience: string[];
};

/**
 * 从简历中提取关键词：技能、工具、经验
 */
export function extractResumeKeywords(resume: Resume): ResumeKeywords {
  const skills = resume.skills.categories.flatMap(category => category.items);
  const tools = [
    "HRIS", "SAP", "Moka", "北森", "Excel", "PowerBI", "钉钉", "飞书", "SQL", "PPT"
  ];

  const experience = resume.experience.flatMap(exp => exp.bullets);

  const resumeSkills = skills.filter(skill => tools.some(tool => skill.toLowerCase().includes(tool.toLowerCase())));
  const resumeTools = tools.filter(tool => experience.some(exp => exp.toLowerCase().includes(tool.toLowerCase())));

  return { skills: resumeSkills, tools: resumeTools, experience: experience };
}