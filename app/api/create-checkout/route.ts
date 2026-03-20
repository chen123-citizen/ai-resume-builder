import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";

const XUNHU_API_URL = process.env.XUNHU_API_URL!;
const XUNHU_APP_ID = process.env.XUNHU_APP_ID!;
const XUNHU_APP_SECRET = process.env.XUNHU_APP_SECRET!;
const XUNHU_NOTIFY_URL = process.env.XUNHU_NOTIFY_URL!;
const XUNHU_RETURN_URL = process.env.XUNHU_RETURN_URL!;

function generateXunhuHash(
  data: Record<string, string | number>,
  secret: string
) {
  const sortedKeys = Object.keys(data)
    .filter((key) => data[key] !== "" && data[key] !== null && data[key] !== undefined)
    .sort();

  const query = sortedKeys
    .map((key) => `${key}=${data[key]}`)
    .join("&");

  return crypto.createHash("md5").update(query + secret).digest("hex");
}

function randomString(length = 16) {
  return crypto.randomBytes(length).toString("hex").slice(0, length);
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { plan, userId } = body;

    if (!plan || !userId) {
      return NextResponse.json({ error: "Missing params" }, { status: 400 });
    }

    let totalFee = "";
    let title = "";

    if (plan === "weekly") {
      totalFee = "9.9";
      title = "Pro Weekly";
    } else if (plan === "monthly") {
      totalFee = "29";
      title = "Pro Monthly";
    } else {
      return NextResponse.json({ error: "Invalid plan" }, { status: 400 });
    }

    const time = Math.floor(Date.now() / 1000).toString();
    const nonceStr = randomString(16);
    const tradeOrderId = `resume_${plan}_${userId}_${Date.now()}`;
    const attach = JSON.stringify({
      user_id: userId,
      plan,
    });

    const payload: Record<string, string> = {
      version: "1.1",
      appid: XUNHU_APP_ID,
      trade_order_id: tradeOrderId,
      total_fee: totalFee,
      title,
      time,
      notify_url: XUNHU_NOTIFY_URL,
      return_url: XUNHU_RETURN_URL,
      nonce_str: nonceStr,
      plugins: "resumeupgradeai",
      attach,
    };

    const hash = generateXunhuHash(payload, XUNHU_APP_SECRET);

    const formData = new URLSearchParams();
    Object.entries({ ...payload, hash }).forEach(([key, value]) => {
      formData.append(key, value);
    });

    const res = await fetch(XUNHU_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: formData.toString(),
    });

    const data = await res.json();

    if (data.errcode !== 0) {
      console.error("Xunhu create order failed:", data);
      return NextResponse.json(
        { error: data.errmsg || "Xunhu create order failed" },
        { status: 500 }
      );
    }

    // 优先返回移动端支付链接；如果没有，再把二维码地址返回前端
    return NextResponse.json({
      success: true,
      checkoutUrl: data.url || null,
      qrCodeUrl: data.url_qrcode || null,
      tradeOrderId,
    });
  } catch (err: any) {
    console.error("create-checkout FULL error:", err);
    return NextResponse.json(
      {
        error: "Server error",
        details: err?.message || String(err),
      },
      { status: 500 }
    );
  }
}