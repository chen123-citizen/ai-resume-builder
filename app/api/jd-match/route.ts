import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

type Payload = {
  resume?: any;
  jd?: string;
};

function buildPrompt(resume: any, jd: string) {
  return `
你是一名专业招聘顾问和简历优化顾问。

请根据用户提供的【简历内容】和【岗位JD】，评估这份简历与岗位的匹配度。

要求：
1. 不要编造用户没有提供的经历、技能或数据
2. 输出必须基于用户现有简历内容和JD
3. 请给出：
   - score：0-100 的整数匹配度
   - strengths：这份简历与岗位匹配的优势，数组，最多3条
   - missing：当前简历相对JD缺失的能力/经验/关键词，数组，最多5条
   - suggestions：如何修改简历以提高匹配度，数组，最多5条
4. 输出必须是严格合法 JSON
5. 不要输出 JSON 以外的任何内容

返回格式示例：
{
  "score": 78,
  "strengths": ["有相关实习经历", "掌握Zemax基础操作"],
  "missing": ["缺少Code V相关经验", "缺少光学测试描述"],
  "suggestions": ["在经历中补充光学系统测试内容", "补充Zemax/Code V使用场景"]
}

【岗位JD】
${jd || "（未提供）"}

【简历JSON】
${resume ? JSON.stringify(resume, null, 2) : "（未提供）"}
  `.trim();
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as Payload;
    const resume = body.resume ?? null;
    const jd = (body.jd || "").trim();

    if (!jd) {
      return NextResponse.json({ error: "jd 不能为空" }, { status: 400 });
    }

    const apiKey = process.env.AI_API_KEY;
    const baseUrl = process.env.AI_BASE_URL || "https://api.openai.com/v1";
    const model = process.env.AI_MODEL || "gpt-4o-mini";

    if (!apiKey) {
      return NextResponse.json(
        { error: "未配置 AI_API_KEY" },
        { status: 500 }
      );
    }

    const resp = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        temperature: 0.2,
        messages: [
          {
            role: "system",
            content: "你是专业招聘顾问。请严格按要求输出 JSON。",
          },
          {
            role: "user",
            content: buildPrompt(resume, jd),
          },
        ],
      }),
    });

    if (!resp.ok) {
      const text = await resp.text();
      console.error("AI 请求失败：", resp.status, text);

      return NextResponse.json(
        { error: `AI 请求失败：${resp.status}` },
        { status: 500 }
      );
    }

    const data = await resp.json();
    const content = data?.choices?.[0]?.message?.content?.trim();

    if (!content) {
      return NextResponse.json(
        { error: "AI 未返回内容" },
        { status: 500 }
      );
    }

    let parsed;
    try {
      parsed = JSON.parse(content);
    } catch {
      return NextResponse.json(
        { error: "AI 返回的不是合法 JSON", raw: content },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, result: parsed });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "unknown error" },
      { status: 500 }
    );
  }
}