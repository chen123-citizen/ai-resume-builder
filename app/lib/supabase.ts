// supabase.ts
import { createClient } from "@supabase/supabase-js";
import { Resume } from "./resumeSchema";

// env 必须有 NEXT_PUBLIC_ 前缀，浏览器才能访问
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// 创建 Supabase 客户端
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,   // 保证刷新页面 session 不丢失
    detectSessionInUrl: true // 支持 OAuth redirect 时抓取 session
  }
});

// 保存简历到数据库
export async function saveResumeToDB(userId: string, resumeId: string, resume: Resume) {
  if (!userId) {
    console.error("saveResumeToDB: userId 为空");
    return null;
  }

  const { data, error } = await supabase
    .from("resumes")
    .upsert({
      id: resumeId,
      user_id: userId,
      title: resume.basics.name?.trim() || "未命名简历",
      data: resume,   // 建议字段名用 data，保持统一
      updated_at: new Date().toISOString(),
    })
    .select();

  if (error) {
    console.error("保存简历失败:", error);
  }

  return data;
}