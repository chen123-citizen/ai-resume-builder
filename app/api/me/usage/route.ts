import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  const token = authHeader?.replace("Bearer ", "").trim();

  if (!token) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const {
    data: { user },
  } = await supabase.auth.getUser(token);

  if (!user) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }

  // 查询套餐
  const { data: plan } = await supabase
    .from("user_plans")
    .select("plan_type, status, expires_at")
    .eq("user_id", user.id)
    .maybeSingle();

  const now = new Date().toISOString();

  const isPro =
    !!plan &&
    plan.status === "active" &&
    !!plan.expires_at &&
    plan.expires_at > now &&
    (plan.plan_type === "pro_weekly" || plan.plan_type === "pro_monthly");

  // 查询使用次数
  const { data: usage } = await supabase
    .from("usage_records")
    .select("feature_key")
    .eq("user_id", user.id);

  const aiUsed = usage?.filter((x) => x.feature_key === "ai_chat").length ?? 0;
  const jdUsed = usage?.filter((x) => x.feature_key === "jd_match").length ?? 0;

  return NextResponse.json({
    plan: isPro ? plan?.plan_type : "free",
    limit: isPro ? null : 2,
    ai_chat_used: aiUsed,
    jd_match_used: jdUsed,
  });
}