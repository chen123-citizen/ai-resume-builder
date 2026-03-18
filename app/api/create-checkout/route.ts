import { NextRequest, NextResponse } from "next/server";

const WEEKLY_CHECKOUT_URL = process.env.LEMON_WEEKLY_CHECKOUT_URL;
const MONTHLY_CHECKOUT_URL = process.env.LEMON_MONTHLY_CHECKOUT_URL;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { plan, userId } = body;

    if (!plan || !userId) {
      return NextResponse.json({ error: "Missing params" }, { status: 400 });
    }

    let checkoutUrl = "";

    if (plan === "weekly") {
      checkoutUrl = WEEKLY_CHECKOUT_URL || "";
    } else if (plan === "monthly") {
      checkoutUrl = MONTHLY_CHECKOUT_URL || "";
    } else {
      return NextResponse.json({ error: "Invalid plan" }, { status: 400 });
    }

    if (!checkoutUrl) {
      return NextResponse.json(
        { error: "Missing checkout URL in env" },
        { status: 500 }
      );
    }

    console.log("创建支付:", { plan, userId, checkoutUrl });

    return NextResponse.json({
      success: true,
      checkoutUrl,
    });
  } catch (err) {
    console.error("create-checkout error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}