import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";

function verifySignature(rawBody: string, signature: string | null, secret: string) {
  if (!signature) return false;

  const hmac = crypto.createHmac("sha256", secret);
  const digest = hmac.update(rawBody).digest("hex");

  return crypto.timingSafeEqual(Buffer.from(digest), Buffer.from(signature));
}

export async function POST(req: NextRequest) {
  const secret = process.env.LEMONSQUEEZY_WEBHOOK_SECRET;

  if (!secret) {
    return NextResponse.json({ error: "Missing secret" }, { status: 500 });
  }

  const rawBody = await req.text();
  const signature = req.headers.get("x-signature");

  const isValid = verifySignature(rawBody, signature, secret);

  if (!isValid) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  const body = JSON.parse(rawBody);

  console.log("Webhook received:", body);

  const event = body.meta?.event_name;

  if (event === "order_created") {
    const email = body.data?.attributes?.user_email;

    console.log("用户付款成功:", email);

    // TODO: 在这里写你自己的逻辑
    // 比如：给这个用户加会员
  }

  if (event === "order_refunded") {
    const email = body.data?.attributes?.user_email;

    console.log("用户退款:", email);

    // TODO: 取消会员
  }

  return NextResponse.json({ ok: true });
}