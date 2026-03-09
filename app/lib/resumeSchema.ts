export type ResumeSections = {
  education: boolean;
  awards: boolean;
  experience: boolean;
  campus: boolean;
  skills: boolean;
};

export type EducationItem = {
  school: string;
  major: string;
  degree: string;
  start: string; // YYYY.MM
  end: string; // YYYY.MM or 至今
  highlights: string[]; // 课程/排名/奖项
};

export type AwardItem = {
  title: string;
  date: string;
  desc: string;
};

export type CampusItem = {
  org: string;
  role: string;
  start: string;
  end: string;
  desc: string;
};

export type ExperienceItem = {
  company: string;
  role: string;
  city: string;
  start: string;
  end: string;
  summary: string; // 原始描述（可粘贴）
  bullets: string[]; // STAR 后要放这里
};

export type Resume = {
  basics: {
    name: string;
    title: string;
    phone: string;
    email: string;
    city: string;
    links: string[]; // 例如：领英/作品集
    photo?: string;
    showPhoto?: boolean;
  };
  sections: ResumeSections;
  education: EducationItem[];
  awards: AwardItem[];
  campus: CampusItem[];
  experience: ExperienceItem[];
  projects: Array<{
    name: string;
    role: string;
    start: string;
    end: string;
    bullets: string[];
  }>;
  skills: {
    categories: Array<{
      name: string;
      items: string[];
    }>;
  };
};

export const defaultResume: Resume = {
  basics: {
    name: "你的名字",
    title: "求职方向（如：人事/HRBP助理）",
    phone: "",
    email: "",
    city: "",
    links: [],
    photo: "",
    showPhoto: false
  },
  sections: {
    education: true,
    experience: true,
    awards: false,
    campus: false,
    skills: true,
  },
  education: [
    {
      school: "",
      major: "",
      degree: "",
      start: "",
      end: "",
      highlights: [],
    },
  ],
  awards: [],
  campus: [],
  experience: [],
  projects: [],
  skills: {
    categories: [{ name: "技能", items: [] }],
  },
};