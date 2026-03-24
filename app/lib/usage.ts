export async function checkUsage(
  supabase: any,
  userId: string,
  featureKey: string
) {
  // 查询用户套餐
  const { data: plan } = await supabase
    .from("user_plans")
    .select("plan_type, status, expires_at")
    .eq("user_id", userId)
    .maybeSingle();

  // 如果没有套餐，创建 free
  if (!plan) {
    await supabase.from("user_plans").insert({
      user_id: userId,
      plan_type: "free",
      status: "active",
    });
  }

  const now = new Date().toISOString();

  const isPro =
    !!plan &&
    plan.status === "active" &&
    !!plan.expires_at &&
    plan.expires_at > now &&
    (plan.plan_type === "pro_weekly" || plan.plan_type === "pro_monthly");

  // Pro 无限
  if (isPro) {
    return { allowed: true };
  }

  // 查询使用次数
  const { count } = await supabase
    .from("usage_records")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("feature_key", featureKey);

  if ((count ?? 0) >= 2) {
    return { allowed: false };
  }

  return { allowed: true };
}