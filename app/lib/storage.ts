import { Resume, defaultResume } from "./resumeSchema";

const KEY = "resume_engine_v1";

function normalizeResume(data: any): Resume {
  const basics = {
    ...defaultResume.basics,
    ...(data?.basics || {}),
  };

  const sections = {
    ...defaultResume.sections,
    ...(data?.sections || {}),
  };

  const education = Array.isArray(data?.education)
    ? data.education
    : defaultResume.education;

  const awards = Array.isArray(data?.awards) ? data.awards : defaultResume.awards;

  const campus = Array.isArray(data?.campus) ? data.campus : defaultResume.campus;

  const experience = Array.isArray(data?.experience)
    ? data.experience
    : defaultResume.experience;

  const projects = Array.isArray(data?.projects)
    ? data.projects
    : defaultResume.projects;

  const skills = {
    ...defaultResume.skills,
    ...(data?.skills || {}),
    categories: Array.isArray(data?.skills?.categories)
      ? data.skills.categories
      : defaultResume.skills.categories,
  };

  return {
    ...defaultResume,
    ...data,
    basics,
    sections,
    education,
    awards,
    campus,
    experience,
    projects,
    skills,
  };
}

export function loadResume(): Resume {
  if (typeof window === "undefined") return defaultResume;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return defaultResume;
    const parsed = JSON.parse(raw);
    return normalizeResume(parsed);
  } catch {
    return defaultResume;
  }
}

export function saveResume(resume: Resume) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(KEY, JSON.stringify(resume));
}