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

    let baseCheckoutUrl = "";

    if (plan === "weekly") {
      baseCheckoutUrl = WEEKLY_CHECKOUT_URL || "";
    } else if (plan === "monthly") {
      baseCheckoutUrl = MONTHLY_CHECKOUT_URL || "";
    } else {
      return NextResponse.json({ error: "Invalid plan" }, { status: 400 });
    }

    if (!baseCheckoutUrl) {
      return NextResponse.json(
        { error: "Missing checkout URL in env" },
        { status: 500 }
      );
    }

    const url = new URL(baseCheckoutUrl);

    url.searchParams.set("checkout[custom][user_id]", userId);
    url.searchParams.set("checkout[custom][plan]", plan);

    const checkoutUrl = url.toString();

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