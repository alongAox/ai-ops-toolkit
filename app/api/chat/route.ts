import { NextResponse } from "next/server";

function getOpenRouterApiKey(): string | undefined {
  const key = process.env.OPENROUTER_API_KEY?.trim();
  return key || undefined;
}

export async function POST(req: Request) {
  const apiKey = getOpenRouterApiKey();

  if (!apiKey) {
    return NextResponse.json(
      {
        content:
          "未配置 OPENROUTER_API_KEY。请在项目根目录 .env.local 中设置（UTF-8 编码），并重启开发服务器。",
      },
      { status: 500 }
    );
  }

  try {
    const { message } = await req.json();

    const response = await fetch(
      "https://openrouter.ai/api/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
          "HTTP-Referer": process.env.OPENROUTER_SITE_URL ?? "http://localhost:3000",
          "X-Title": process.env.OPENROUTER_APP_NAME ?? "AI Chat",
        },
        body: JSON.stringify({
          model:
            process.env.OPENROUTER_MODEL?.trim() ?? "deepseek/deepseek-chat",
          messages: [
            {
              role: "user",
              content: message,
            },
          ],
        }),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      const errMsg =
        data?.error?.message ??
        `OpenRouter 请求失败 (${response.status})`;

      return NextResponse.json(
        { content: errMsg },
        { status: response.status }
      );
    }

    return NextResponse.json({
      content:
        data?.choices?.[0]?.message?.content ?? "No response received",
    });
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      {
        content: "服务器错误",
      },
      {
        status: 500,
      }
    );
  }
}
