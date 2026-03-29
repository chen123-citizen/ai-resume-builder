// app/api/ai/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { checkUsage } from "@/app/lib/usage";

export const runtime = "nodejs";

type Payload = {
  message: string;
  resume?: any;
  jd?: string;
  history?: { role: "user" | "assistant"; content: string }[];
};

function buildSystemPrompt() {
  return `
你是一个“简历优化助手”，面向中文校招/社招/转岗人群。

要求：
- 不要编造经历、公司、项目、数据；如缺关键信息，请明确提示用户补充什么。
- 回答要具体、可执行，尽量给可直接替换到简历中的句式。
- 优先结合用户提供的 JD 和简历内容，做针对性建议。
- 输出风格：中文，条目清晰，尽量简洁。
- 请用 Markdown 输出（标题、列表、加粗），**严禁使用表格（包括 Markdown 表格和 HTML 表格）**。如需展示对比或数据，请使用列表或分点说明。

如果你的建议可以直接修改用户的简历，请在回答最后追加一个 JSON patch，
用于自动修改简历。

格式必须如下：

<<<RESUME_PATCH_START>>>
{
  "version": "1.0",
  "target": "resume",
  "reason": "说明为什么要修改",
  "operations": [
    {
      "op": "set",
      "path": "experience[0].bullets",
      "value": [
        "示例 bullet 1",
        "示例 bullet 2",
        "示例 bullet 3"
      ]
    }
  ]
}
<<<RESUME_PATCH_END>>>

规则：
- JSON 必须严格合法（双引号、无注释）
- 只能修改已有字段
- 不允许编造经历或数据
- 如果缺少数据，用（建议补充：xxx）表示

规则补充（非常重要）：
- 只能使用以下真实字段名，不能自造字段
- campus 条目字段只能是：org, role, start, end, desc
- experience 条目字段只能是：company, role, city, start, end, summary, bullets
- skills.categories 条目字段只能是：name, items
- education 条目字段只能是：school, major, degree, start, end, highlights
- awards 条目字段只能是：title, date, desc

路径规则补充（非常重要）：
- 不允许整对象替换
- 禁止把 path 写成整个条目对象，例如：
  - campus[0]
  - experience[0]
  - education[0]
  - awards[0]
  - skills.categories[0]
- 必须逐字段 set，只能写到具体字段，例如：
  - campus[0].org
  - campus[0].role
  - campus[0].start
  - campus[0].end
  - campus[0].desc
  - experience[0].summary
  - experience[0].bullets
  - skills.categories[0].items
- 即使只修改某一条经历，也不能直接覆盖整个对象；必须拆成多个逐字段操作

示例：
- 正确：campus[0].org
- 错误：campus[0].organization

- 正确：campus[0].desc
- 错误：campus[0].description

- 正确：skills.categories[0].items
- 错误：skills.categories[0].list

错误示例（禁止输出）：
{
  "op": "set",
  "path": "campus[0]",
  "value": {
    "org": "某组织",
    "role": "成员",
    "desc": "负责活动执行"
  }
}

正确示例（必须像这样逐字段输出）：
{
  "version": "1.0",
  "target": "resume",
  "reason": "补充校园经历并保持字段结构安全",
  "operations": [
    { "op": "set", "path": "campus[0].org", "value": "某组织" },
    { "op": "set", "path": "campus[0].role", "value": "成员" },
    { "op": "set", "path": "campus[0].start", "value": "2024.09" },
    { "op": "set", "path": "campus[0].end", "value": "2025.01" },
    { "op": "set", "path": "campus[0].desc", "value": "负责活动执行与协调" }
  ]
}
`.trim();
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as Payload;
    const message = (body.message || "").trim();
    const resume = body.resume ?? null;
    const jd = (body.jd || "").trim();
    const history = Array.isArray(body.history) ? body.history : [];

    if (!message) {
      return NextResponse.json({ error: "message 不能为空" }, { status: 400 });
    }

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
      error: userError,
    } = await supabase.auth.getUser(token);

    if (userError || !user) {
      return NextResponse.json({ error: "未登录" }, { status: 401 });
    }

    const usage = await checkUsage(supabase, user.id, "ai_chat");

    if (!usage.allowed) {
      return NextResponse.json(
        { error: "免费次数已用完，请升级 Pro" },
        { status: 403 }
      );
    }

    const apiKey = process.env.AI_API_KEY;
    const baseUrl = process.env.AI_BASE_URL || "https://api.openai.com/v1";
    const model = process.env.AI_MODEL || "gpt-4o-mini";

    if (!apiKey) {
      return NextResponse.json({
        reply:
          "你还没配置云端 AI KEY。\n请在项目根目录创建 .env.local，设置 AI_API_KEY / AI_BASE_URL / AI_MODEL，然后重启 npm run dev。\n\n我已经能看到当前简历与 JD（前端已传过来），等你配好 key 后就能真正调用云端模型了。",
      });
    }

    const contextMessage = `
【JD】
${jd || "（未提供 JD）"}

【简历 JSON】
${resume ? JSON.stringify(resume, null, 2) : "（未提供简历）"}
    `.trim();

    const MAX_TURNS = 12;
    const trimmedHistory = history.slice(-MAX_TURNS);

    // ✅ OpenAI-compatible：dashscope compatible-mode 支持 /chat/completions + stream:true
    const resp = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        temperature: 0.3,
        stream: true, // ✅ 关键：开启流式
        max_tokens: 8192,
        messages: [
          { role: "system", content: buildSystemPrompt() },
        
          {
            role: "system",
            content: `以下是用户当前的简历和JD背景信息：\n${contextMessage}`,
          },
        
          ...trimmedHistory.map((m) => ({
            role: m.role,
            content: m.content,
          })),
        
          {
            role: "user",
            content: message,
          },
        ],
      }),
    });

    if (!resp.ok) {
      const text = await resp.text();
      return NextResponse.json(
        { error: `云端 AI 请求失败：${resp.status} ${text}` },
        { status: 500 }
      );
    }

    if (!resp.body) {
      return NextResponse.json({ error: "云端 AI 未返回流（resp.body 为空）" }, { status: 500 });
    }
    // 👇 记录一次 AI 使用
    await supabase.from("usage_records").insert({
      user_id: user.id,
      feature_key: "ai_chat"
    });

    // ✅ 透传 SSE 流给前端
    return new Response(resp.body, {
      headers: {
        "Content-Type": "text/event-stream; charset=utf-8",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
      },
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: "AI 处理失败：" + (err?.message || "unknown") },
      { status: 500 }
    );
  }
}