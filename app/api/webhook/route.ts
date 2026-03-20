import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { supabaseAdmin } from "@/app/lib/supabaseAdmin";

function generateXunhuHash(datas: Record<string, string>, secret: string) {
  const sortedKeys = Object.keys(datas)
    .filter((key) => key !== "hash" && datas[key] !== "" && datas[key] !== null && datas[key] !== undefined)
    .sort();

  const signStr = sortedKeys.map((key) => `${key}=${datas[key]}`).join("&");
  return crypto.createHash("md5").update(signStr + secret).digest("hex");
}

function getExpiryDate(plan: string) {
  const now = new Date();

  if (plan === "weekly") {
    now.setDate(now.getDate() + 7);
    return now.toISOString();
  }

  if (plan === "monthly") {
    now.setDate(now.getDate() + 30);
    return now.toISOString();
  }

  return null;
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const body: Record<string, string> = {};

    formData.forEach((value, key) => {
      body[key] = value.toString();
    });

    console.log("Xunhu webhook body:", body);

    const secret = process.env.XUNHU_APP_SECRET;
    if (!secret) {
      return new NextResponse("fail", { status: 500 });
    }

    const receivedHash = body.hash || "";
    const calculatedHash = generateXunhuHash(body, secret);

    if (receivedHash !== calculatedHash) {
      console.error("Xunhu webhook sign invalid");
      return new NextResponse("fail", { status: 401 });
    }

    // 只处理已支付
    if (body.status !== "OD") {
      return new NextResponse("success");
    }

    let userId = "";
    let plan = "";

    // 优先用 attach
    if (body.attach) {
      try {
        const attach = JSON.parse(body.attach);
        userId = attach.user_id;
        plan = attach.plan;
      } catch (e) {
        console.error("attach parse error:", e);
      }
    }

    // attach 解析失败时，退回用订单号兜底
    if ((!userId || !plan) && body.trade_order_id) {
      const parts = body.trade_order_id.split("_");
      // resume_{plan}_{userId}_{timestamp}
      if (parts.length >= 4) {
        plan = parts[1];
        userId = parts[2];
      }
    }

    if (!userId || !plan) {
      console.error("Missing userId or plan from xunhu callback");
      return new NextResponse("fail", { status: 400 });
    }

    const expiresAt = getExpiryDate(plan);
    if (!expiresAt) {
      console.error("Invalid plan:", plan);
      return new NextResponse("fail", { status: 400 });
    }

    const planType = plan === "weekly" ? "pro_weekly" : "pro_monthly";

    const { error } = await supabaseAdmin
      .from("user_plans")
      .upsert(
        {
          user_id: userId,
          plan_type: planType,
          status: "active",
          expires_at: expiresAt,
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: "user_id",
        }
      );

    if (error) {
      console.error("Failed to update user_plans:", error);
      return new NextResponse("fail", { status: 500 });
    }

    console.log("Xunhu payment success:", {
      userId,
      plan,
      tradeOrderId: body.trade_order_id,
      totalFee: body.total_fee,
    });

    // 虎皮椒要求返回纯文本 success
    return new NextResponse("success");
  } catch (error) {
    console.error("Xunhu webhook error:", error);
    return new NextResponse("fail", { status: 500 });
  }
}