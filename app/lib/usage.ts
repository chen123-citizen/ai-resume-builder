export async function checkUsage(
    supabase: any,
    userId: string,
    featureKey: string
) {

  // 查询用户套餐
  const { data: plan } = await supabase
    .from("user_plans")
    .select("*")
    .eq("user_id", userId)
    .single();

  // 如果没有套餐，创建 free
  if (!plan) {
    await supabase.from("user_plans").insert({
      user_id: userId,
      plan_type: "free",
      status: "active"
    });
  }

  const currentPlan = plan?.plan_type ?? "free";

  // Pro 无限
  if (currentPlan === "pro") {
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