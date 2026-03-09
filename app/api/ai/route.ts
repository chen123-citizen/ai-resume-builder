// app/api/ai/route.ts
import { NextRequest, NextResponse } from "next/server";

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
- 请用 Markdown 输出（标题、列表、加粗），避免复杂表格。

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