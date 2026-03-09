import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/app/lib/supabase";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { resumeId, userId, patch, reason } = body;

    if (!resumeId || !userId || !patch) {
      return NextResponse.json({ error: "参数不完整" }, { status: 400 });
    }

    // 先插入新版本
    const { data, error } = await supabase
      .from("resume_versions")
      .insert([
        {
          resume_id: resumeId,
          user_id: userId,
          patch,
          reason,
        },
      ])
      .select();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // 再查当前简历的所有历史版本（按时间从旧到新）
    const { data: versions, error: listError } = await supabase
      .from("resume_versions")
      .select("id")
      .eq("resume_id", resumeId)
      .eq("user_id", userId)
      .order("created_at", { ascending: true });

    if (!listError && versions && versions.length > 25) {
      const deleteIds = versions.slice(0, versions.length - 25).map((v) => v.id);

      await supabase.from("resume_versions").delete().in("id", deleteIds);
    }

    return NextResponse.json({ success: true, data });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "保存历史版本失败" },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
    try {
      const resumeId = req.nextUrl.searchParams.get("resumeId");
      const userId = req.nextUrl.searchParams.get("userId");
  
      if (!resumeId || !userId) {
        return NextResponse.json({ error: "缺少 resumeId 或 userId" }, { status: 400 });
      }
  
      const { data, error } = await supabase
        .from("resume_versions")
        .select("*")
        .eq("resume_id", resumeId)
        .eq("user_id", userId)
        .order("created_at", { ascending: false }); // 最新的版本排在前面
  
      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
  
      return NextResponse.json({ success: true, data });
    } catch (err: any) {
      return NextResponse.json({ error: err.message }, { status: 500 });
    }
  }