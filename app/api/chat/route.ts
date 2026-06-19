import { NextResponse } from "next/server";
import {
  OPS_ANALYSIS_SYSTEM_PROMPT,
  IMAGE_ANALYSIS_SUPPLEMENT,
  COMBINED_ANALYSIS_SUPPLEMENT,
  FOLLOW_UP_SYSTEM_PROMPT,
  DAILY_REPORT_SYSTEM_PROMPT,
  ERROR_EXPLAINER_SYSTEM_PROMPT,
  ERROR_EXPLAINER_FOLLOW_UP_SYSTEM_PROMPT,
  buildLogUserPrompt,
  buildImageUserPrompt,
  buildCombinedUserPrompt,
  buildDailyReportUserPrompt,
  buildErrorExplainerUserPrompt,
  buildErrorExplainerFollowUpContext,
  buildFollowUpContext,
  type ChatTurn,
} from "./prompts";

export const runtime = "nodejs";

function getProxyUrl(): string | undefined {
  return (
    process.env.HTTPS_PROXY?.trim() ||
    process.env.HTTP_PROXY?.trim() ||
    process.env.ALL_PROXY?.trim() ||
    undefined
  );
}

async function fetchWithOptionalProxy(
  url: string,
  init: RequestInit
): Promise<Response> {
  const proxyUrl = getProxyUrl();

  if (!proxyUrl) {
    return fetch(url, init);
  }

  const { fetch: undiciFetch, ProxyAgent } = await import("undici");
  const response = await undiciFetch(url, {
    method: init.method ?? "GET",
    headers: init.headers,
    body: init.body ?? undefined,
    dispatcher: new ProxyAgent(proxyUrl),
  } as Parameters<typeof undiciFetch>[1]);

  return response as unknown as Response;
}

function getErrorMessage(error: unknown): string {
  const err = error as Error & {
    cause?: { code?: string; message?: string };
  };
  const code = err.cause?.code ?? "";
  const msg = err.message ?? "";

  if (
    code === "UND_ERR_CONNECT_TIMEOUT" ||
    code === "ECONNRESET" ||
    code === "ECONNREFUSED" ||
    code === "ENOTFOUND" ||
    msg.includes("fetch failed")
  ) {
    const proxyHint = getProxyUrl()
      ? "（已配置代理但仍失败，请检查代理端口与 VPN 是否正常）"
      : "。请在 .env.local 添加 HTTPS_PROXY=http://127.0.0.1:7890（端口按你的代理软件为准），重启 npm run dev；或改用 OpenRouter API";
    return `无法连接 AI 服务（网络超时或被阻断）${proxyHint}`;
  }

  return `服务器错误：${msg || "未知异常"}`;
}

type ImagePayload = {
  name: string;
  dataUrl: string;
};

type ContentPart =
  | { type: "text"; text: string }
  | { type: "image_url"; image_url: { url: string } };

type ApiMessage =
  | { role: "system"; content: string }
  | { role: "user"; content: string | ContentPart[] }
  | { role: "assistant"; content: string };

type Provider = "openai" | "openrouter";

function getProvider(): Provider | null {
  if (process.env.OPENAI_API_KEY?.trim()) return "openai";
  if (process.env.OPENROUTER_API_KEY?.trim()) return "openrouter";
  return null;
}

function parseChatTurns(raw: unknown): ChatTurn[] {
  if (!Array.isArray(raw)) return [];

  return raw.filter(
    (item): item is ChatTurn =>
      typeof item === "object" &&
      item !== null &&
      (item.role === "user" || item.role === "assistant") &&
      typeof item.content === "string" &&
      item.content.trim().length > 0
  );
}

function buildUserContent(
  logs: string | undefined,
  images: ImagePayload[]
): string | ContentPart[] {
  const hasLogs = Boolean(logs?.trim());
  const parts: ContentPart[] = [];

  if (hasLogs && images.length > 0) {
    parts.push({
      type: "text",
      text: buildCombinedUserPrompt(logs!.trim()),
    });
  } else if (hasLogs) {
    return buildLogUserPrompt(logs!.trim());
  } else {
    const names = images.map((img) => img.name).join("、");
    parts.push({
      type: "text",
      text: buildImageUserPrompt(names),
    });
  }

  for (const image of images) {
    parts.push({
      type: "image_url",
      image_url: { url: image.dataUrl },
    });
  }

  return parts;
}

function getAnalysisSystemPrompt(hasLogs: boolean, hasImages: boolean): string {
  if (hasLogs && hasImages) {
    return OPS_ANALYSIS_SYSTEM_PROMPT + COMBINED_ANALYSIS_SUPPLEMENT;
  }
  if (hasImages) {
    return OPS_ANALYSIS_SYSTEM_PROMPT + IMAGE_ANALYSIS_SUPPLEMENT;
  }
  return OPS_ANALYSIS_SYSTEM_PROMPT;
}

function getModel(provider: Provider, hasImages: boolean): string {
  if (provider === "openai") {
    if (hasImages) {
      return process.env.OPENAI_VISION_MODEL?.trim() ?? "gpt-4o-mini";
    }
    return process.env.OPENAI_MODEL?.trim() ?? "gpt-4o-mini";
  }

  if (hasImages) {
    return (
      process.env.OPENROUTER_VISION_MODEL?.trim() ?? "openai/gpt-4o-mini"
    );
  }
  return process.env.OPENROUTER_MODEL?.trim() ?? "deepseek/deepseek-chat";
}

function getTextModel(provider: Provider): string {
  if (provider === "openai") {
    return process.env.OPENAI_MODEL?.trim() ?? "gpt-4o-mini";
  }
  return process.env.OPENROUTER_MODEL?.trim() ?? "deepseek/deepseek-chat";
}

async function callChatApi(
  provider: Provider,
  apiKey: string,
  model: string,
  messages: ApiMessage[]
) {
  const baseUrl =
    process.env.OPENAI_BASE_URL?.trim() ?? "https://api.openai.com/v1";

  if (provider === "openai") {
    return fetchWithOptionalProxy(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ model, messages }),
    });
  }

  return fetchWithOptionalProxy("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "HTTP-Referer": process.env.OPENROUTER_SITE_URL ?? "http://localhost:3000",
      "X-Title": process.env.OPENROUTER_APP_NAME ?? "AI Analyzer",
    },
    body: JSON.stringify({ model, messages }),
  });
}

export async function POST(req: Request) {
  const provider = getProvider();

  if (!provider) {
    return NextResponse.json(
      {
        content:
          "未配置 API Key。请在 .env.local 中设置 OPENAI_API_KEY（推荐）或 OPENROUTER_API_KEY，并重启开发服务器。",
      },
      { status: 500 }
    );
  }

  const apiKey =
    provider === "openai"
      ? process.env.OPENAI_API_KEY!.trim()
      : process.env.OPENROUTER_API_KEY!.trim();

  try {
    const body = await req.json();
    const mode =
      body.mode === "followup"
        ? "followup"
        : body.mode === "daily-report"
          ? "daily-report"
          : body.mode === "error-explainer"
            ? "error-explainer"
            : body.mode === "error-explainer-followup"
              ? "error-explainer-followup"
              : "analyze";
    const logs = typeof body.logs === "string" ? body.logs : undefined;
    const images: ImagePayload[] = Array.isArray(body.images)
      ? body.images.filter(
          (img: unknown): img is ImagePayload =>
            typeof img === "object" &&
            img !== null &&
            typeof (img as ImagePayload).name === "string" &&
            typeof (img as ImagePayload).dataUrl === "string" &&
            (img as ImagePayload).dataUrl.startsWith("data:image/")
        )
      : [];

    if (mode === "followup") {
      const messages = parseChatTurns(body.messages);

      if (messages.length === 0) {
        return NextResponse.json(
          { content: "请提供对话内容。" },
          { status: 400 }
        );
      }

      if (messages[messages.length - 1].role !== "user") {
        return NextResponse.json(
          { content: "最后一条消息须为用户提问。" },
          { status: 400 }
        );
      }

      const apiMessages: ApiMessage[] = [
        {
          role: "system",
          content:
            FOLLOW_UP_SYSTEM_PROMPT + buildFollowUpContext(logs),
        },
        ...messages.map((msg) => ({
          role: msg.role,
          content: msg.content,
        })),
      ];

      const response = await callChatApi(
        provider,
        apiKey,
        getTextModel(provider),
        apiMessages
      );

      const data = await response.json();

      if (!response.ok) {
        const errMsg =
          data?.error?.message ??
          `${provider === "openai" ? "OpenAI" : "OpenRouter"} 请求失败 (${response.status})`;

        return NextResponse.json(
          { content: errMsg },
          { status: response.status }
        );
      }

      return NextResponse.json({
        content:
          data?.choices?.[0]?.message?.content ?? "No response received",
      });
    }

    if (mode === "daily-report") {
      if (!logs?.trim()) {
        return NextResponse.json(
          { content: "请提供日志文本或 .log 文件内容。" },
          { status: 400 }
        );
      }

      const apiMessages: ApiMessage[] = [
        {
          role: "system",
          content: DAILY_REPORT_SYSTEM_PROMPT,
        },
        {
          role: "user",
          content: buildDailyReportUserPrompt(logs.trim()),
        },
      ];

      const response = await callChatApi(
        provider,
        apiKey,
        getTextModel(provider),
        apiMessages
      );

      const data = await response.json();

      if (!response.ok) {
        const errMsg =
          data?.error?.message ??
          `${provider === "openai" ? "OpenAI" : "OpenRouter"} 请求失败 (${response.status})`;

        return NextResponse.json(
          { content: errMsg },
          { status: response.status }
        );
      }

      return NextResponse.json({
        content:
          data?.choices?.[0]?.message?.content ?? "No response received",
      });
    }

    if (mode === "error-explainer-followup") {
      const messages = parseChatTurns(body.messages);

      if (messages.length === 0) {
        return NextResponse.json(
          { content: "请提供对话内容。" },
          { status: 400 }
        );
      }

      if (messages[messages.length - 1].role !== "user") {
        return NextResponse.json(
          { content: "最后一条消息须为用户提问。" },
          { status: 400 }
        );
      }

      const apiMessages: ApiMessage[] = [
        {
          role: "system",
          content:
            ERROR_EXPLAINER_FOLLOW_UP_SYSTEM_PROMPT +
            buildErrorExplainerFollowUpContext(logs),
        },
        ...messages.map((msg) => ({
          role: msg.role,
          content: msg.content,
        })),
      ];

      const response = await callChatApi(
        provider,
        apiKey,
        getTextModel(provider),
        apiMessages
      );

      const data = await response.json();

      if (!response.ok) {
        const errMsg =
          data?.error?.message ??
          `${provider === "openai" ? "OpenAI" : "OpenRouter"} 请求失败 (${response.status})`;

        return NextResponse.json(
          { content: errMsg },
          { status: response.status }
        );
      }

      return NextResponse.json({
        content:
          data?.choices?.[0]?.message?.content ?? "No response received",
      });
    }

    if (mode === "error-explainer") {
      if (!logs?.trim()) {
        return NextResponse.json(
          { content: "请提供错误信息或堆栈跟踪。" },
          { status: 400 }
        );
      }

      const apiMessages: ApiMessage[] = [
        {
          role: "system",
          content: ERROR_EXPLAINER_SYSTEM_PROMPT,
        },
        {
          role: "user",
          content: buildErrorExplainerUserPrompt(logs.trim()),
        },
      ];

      const response = await callChatApi(
        provider,
        apiKey,
        getTextModel(provider),
        apiMessages
      );

      const data = await response.json();

      if (!response.ok) {
        const errMsg =
          data?.error?.message ??
          `${provider === "openai" ? "OpenAI" : "OpenRouter"} 请求失败 (${response.status})`;

        return NextResponse.json(
          { content: errMsg },
          { status: response.status }
        );
      }

      return NextResponse.json({
        content:
          data?.choices?.[0]?.message?.content ?? "No response received",
      });
    }

    const hasLogs = Boolean(logs?.trim());
    const hasImages = images.length > 0;

    if (!hasLogs && !hasImages) {
      return NextResponse.json(
        { content: "请提供日志文本、.log 文件或图片。" },
        { status: 400 }
      );
    }

    const userContent = buildUserContent(logs, images);
    const apiMessages: ApiMessage[] = [
      {
        role: "system",
        content: getAnalysisSystemPrompt(hasLogs, hasImages),
      },
      { role: "user", content: userContent },
    ];

    const response = await callChatApi(
      provider,
      apiKey,
      getModel(provider, hasImages),
      apiMessages
    );

    const data = await response.json();

    if (!response.ok) {
      const errMsg =
        data?.error?.message ??
        `${provider === "openai" ? "OpenAI" : "OpenRouter"} 请求失败 (${response.status})`;

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
        content: getErrorMessage(error),
      },
      {
        status: 500,
      }
    );
  }
}
