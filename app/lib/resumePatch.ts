// app/lib/resumePatch.ts
import type { Resume } from "@/app/lib/resumeSchema";

export type ResumePatch = {
  version: "1.0";
  target: "resume";
  reason?: string;
  operations: Operation[];
};

export type Operation =
  | { op: "set"; path: string; value: any }
  | { op: "replaceArray"; path: string; value: any[] }
  | { op: "insert"; path: string; index: number; value: any }
  | { op: "remove"; path: string; index: number };

export function extractResumePatchFromText(text: string): ResumePatch | null {
  const START = "<<<RESUME_PATCH_START>>>";
  const END = "<<<RESUME_PATCH_END>>>";
  
    const start = text.indexOf(START);
    if (start < 0) return null;
  
    const end = text.indexOf(END, start + START.length);
    if (end < 0) return null;
  
    const jsonStr = text.slice(start + START.length, end).trim();
    if (!jsonStr) return null;
  
    try {
      const patch = JSON.parse(jsonStr) as ResumePatch;
  
      if (patch?.version !== "1.0") return null;
      if (patch?.target !== "resume") return null;
      if (!Array.isArray(patch?.operations)) return null;
  
      return patch;
    } catch {
      return null;
    }
}

/** 安全限制：避免 AI 一口气改太多/乱改关键字段（你可按需放宽） */
export function validateResumePatch(patch: ResumePatch): { ok: boolean; reason?: string } {
  const MAX_OPS = 12;
  if (patch.operations.length > MAX_OPS) {
    return { ok: false, reason: `一次改动过多（>${MAX_OPS}项），请分步应用。` };
  }

  // 禁止改手机号/邮箱（除非你以后想允许，可以删掉）
  const forbiddenPrefixes = ["basics.phone", "basics.email"];
  for (const op of patch.operations) {
    if (forbiddenPrefixes.some((p) => op.path.startsWith(p))) {
      return { ok: false, reason: "为安全起见，暂不允许自动修改手机号/邮箱。请手动改。" };
    }
  }

  return { ok: true };
}

/**
 * 应用 patch：返回新 resume（不修改原对象）
 * 支持：set / replaceArray / insert / remove
 */
export function applyResumePatch(resume: Resume, patch: ResumePatch): Resume {
  let next: any = deepClone(resume);

  for (const op of patch.operations) {
    if (op.op === "set") {
      next = setByPath(next, op.path, op.value);
    } else if (op.op === "replaceArray") {
      next = setByPath(next, op.path, Array.isArray(op.value) ? op.value : []);
    } else if (op.op === "insert") {
      const arr = getByPath(next, op.path);
      if (!Array.isArray(arr)) continue;
      const copy = [...arr];
      const idx = clampIndex(op.index, copy.length + 1);
      copy.splice(idx, 0, op.value);
      next = setByPath(next, op.path, copy);
    } else if (op.op === "remove") {
      const arr = getByPath(next, op.path);
      if (!Array.isArray(arr)) continue;
      const copy = [...arr];
      if (op.index < 0 || op.index >= copy.length) continue;
      copy.splice(op.index, 1);
      next = setByPath(next, op.path, copy);
    }
  }

  return next as Resume;
}

// ---------- helpers ----------

function deepClone<T>(obj: T): T {
  // Resume 基本是 JSON 结构，用这个最省事
  return JSON.parse(JSON.stringify(obj));
}

function clampIndex(i: number, maxExclusive: number) {
  if (!Number.isFinite(i)) return 0;
  return Math.max(0, Math.min(i, maxExclusive - 1));
}

type PathToken = string | number;

function parsePath(path: string): PathToken[] {
  // 支持：a.b[0].c  和  skills.categories[1].items
  const tokens: PathToken[] = [];
  const re = /([^[.\]]+)|\[(\d+)\]/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(path))) {
    if (m[1]) tokens.push(m[1]);
    else if (m[2]) tokens.push(Number(m[2]));
  }
  return tokens;
}

function getByPath(obj: any, path: string): any {
  const tokens = parsePath(path);
  let cur = obj;
  for (const t of tokens) {
    if (cur == null) return undefined;
    cur = cur[t as any];
  }
  return cur;
}

function setByPath(obj: any, path: string, value: any): any {
  const tokens = parsePath(path);
  if (tokens.length === 0) return obj;

  const root = Array.isArray(obj) ? [...obj] : { ...obj };
  let cur: any = root;

  for (let i = 0; i < tokens.length; i++) {
    const key = tokens[i];
    const isLast = i === tokens.length - 1;

    if (isLast) {
      cur[key as any] = value;
      break;
    }

    const nextKey = tokens[i + 1];
    const existing = cur[key as any];

    let nextContainer: any;
    const shouldBeArray = typeof nextKey === "number";

    if (existing == null) {
      nextContainer = shouldBeArray ? [] : {};
    } else {
      nextContainer = Array.isArray(existing) ? [...existing] : { ...existing };
    }

    cur[key as any] = nextContainer;
    cur = nextContainer;
  }

  return root;
}