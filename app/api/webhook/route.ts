import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/app/lib/supabaseAdmin";

function verifySignature(
  rawBody: string,
  signature: string | null,
  secret: string
) {
  if (!signature) return false;

  const hmac = crypto.createHmac("sha256", secret);
  const digest = hmac.update(rawBody).digest("hex");

  try {
    return crypto.timingSafeEqual(
      Buffer.from(digest),
      Buffer.from(signature)
    );
  } catch {
    return false;
  }
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
    const secret = process.env.LEMONSQUEEZY_WEBHOOK_SECRET;

    if (!secret) {
      return NextResponse.json(
        { error: "Missing LEMONSQUEEZY_WEBHOOK_SECRET" },
        { status: 500 }
      );
    }

    const rawBody = await req.text();
    const signature = req.headers.get("x-signature");

    const isValid = verifySignature(rawBody, signature, secret);

    if (!isValid) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }

    const body = JSON.parse(rawBody);
    const event = body?.meta?.event_name;

    console.log("Webhook received:", event);

    if (event === "order_created") {
      const userId = body?.meta?.custom_data?.user_id;
      const plan = body?.meta?.custom_data?.plan;

      if (!userId || !plan) {
        return NextResponse.json(
          { error: "Missing user_id or plan in custom_data" },
          { status: 400 }
        );
      }

      const expiresAt = getExpiryDate(plan);

      if (!expiresAt) {
        return NextResponse.json({ error: "Invalid plan" }, { status: 400 });
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
          console.error("Failed to update user_plans FULL ERROR:", JSON.stringify(error, null, 2));
          return NextResponse.json(
            {
              error: "Failed to update user plan",
              details: error.message,
              code: error.code,
            },
            { status: 500 }
          );
        }

      console.log("用户开通成功:", {
        userId,
        planType,
        expiresAt,
      });
    }

    if (event === "order_refunded") {
      const userId = body?.meta?.custom_data?.user_id;

      if (!userId) {
        return NextResponse.json(
          { error: "Missing user_id in custom_data" },
          { status: 400 }
        );
      }

      const { error } = await supabaseAdmin
        .from("user_plans")
        .update({
          status: "refunded",
          expires_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", userId);

      if (error) {
        console.error("Failed to refund user plan:", error);
        return NextResponse.json(
          { error: "Failed to update refunded plan" },
          { status: 500 }
        );
      }

      console.log("用户退款成功:", { userId });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Webhook error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}