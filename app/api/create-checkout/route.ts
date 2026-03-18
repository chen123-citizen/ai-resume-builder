import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { plan, userId } = body;

    if (!plan || !userId) {
      return NextResponse.json({ error: "Missing params" }, { status: 400 });
    }

    // 👉 这里先不调用 Lemon API，先返回测试数据
    console.log("创建支付:", { plan, userId });

    return NextResponse.json({
      success: true,
      message: "create-checkout working",
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}