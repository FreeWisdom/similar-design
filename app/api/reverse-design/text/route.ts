import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function stripCodeFences(s: string): string {
  return (s || "")
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();
}

function removeTrailingCommas(s: string): string {
  return (s || "").replace(/,(\s*[}\]])/g, "$1");
}

function normalizeJsonLike(s: string): string {
  let out = stripCodeFences(s);
  // Normalize smart quotes to plain quotes
  out = out.replace(/[“”]/g, '"').replace(/[‘’]/g, "'");
  // Remove trailing commas
  out = removeTrailingCommas(out);
  // Quote single-quoted keys: 'key': -> "key":
  out = out.replace(/'([A-Za-z0-9_\-]+)'\s*:/g, '"$1":');
  // Convert single-quoted string values to double quotes: : 'value' -> : "value"
  out = out.replace(/:\s*'([^']*)'/g, ': "$1"');
  return out;
}

function extractJsonArray(text: string): any[] {
  const trimmed = (text || "").trim();
  const start = trimmed.indexOf("[");
  const end = trimmed.lastIndexOf("]");
  if (start !== -1 && end !== -1 && end > start) {
    const maybe = trimmed.substring(start, end + 1);
    return JSON.parse(maybe);
  }
  const match = trimmed.match(/\[[\s\S]*\]/);
  if (match) return JSON.parse(match[0]);
  throw new Error("No valid JSON array found in AI response");
}

function extractSegments(text: string): any[] {
  const cleaned = normalizeJsonLike(text);
  const trimmed = (cleaned || "").trim();
  // Try parse as full JSON first
  try {
    const parsed = JSON.parse(trimmed);
    if (Array.isArray(parsed)) return parsed;
    if (parsed && Array.isArray((parsed as any).texts)) return (parsed as any).texts;
  } catch {}

  // Try to extract JSON object substring
  try {
    const startObj = trimmed.indexOf("{");
    const endObj = trimmed.lastIndexOf("}");
    if (startObj !== -1 && endObj !== -1 && endObj > startObj) {
      const objStr = trimmed.substring(startObj, endObj + 1);
      const repaired = normalizeJsonLike(objStr);
      const obj = JSON.parse(repaired);
      if (Array.isArray(obj)) return obj;
      if (obj && Array.isArray((obj as any).texts)) return (obj as any).texts;
    }
  } catch {}

  // Fallback: extract array only
  return extractJsonArray(trimmed);
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const prompt = (body?.prompt ?? "").toString().trim();

    if (!prompt) {
      return NextResponse.json(
        { error: "缺少提示词 prompt" },
        { status: 400 }
      );
    }

    const openai = new OpenAI({
      baseURL: process.env.OPENAI_BASE_URL || "https://openrouter.ai/api/v1",
      apiKey: process.env.OPENROUTER_API_KEY || process.env.OPENAI_API_KEY || "",
    });

    if (!openai.apiKey) {
      return NextResponse.json(
        { error: "服务未配置 OPENROUTER_API_KEY/OPENAI_API_KEY" },
        { status: 500 }
      );
    }

    const MODEL = "anthropic/claude-sonnet-4";

    const completion = await openai.chat.completions.create({
      model: MODEL,
      temperature: 0.3,
      messages: [
        {
          role: "system",
          content:
            "You are an expert text analyst. Respond with valid JSON only. No commentary, no markdown.",
        },
        { role: "user", content: prompt },
      ],
    });

    const content = completion?.choices?.[0]?.message?.content || "";
    if (!content) {
      return NextResponse.json(
        { error: "模型无响应，请稍后重试" },
        { status: 502 }
      );
    }

    console.log("content", content)
    let segments: any[] = [];
    try {
      segments = extractSegments(content);
    } catch (e) {
      return NextResponse.json(
        {
          error: "AI 返回数据解析失败",
          details: e instanceof Error ? e.message : String(e),
          raw: content,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, model: MODEL, segments });
  } catch (error) {
    console.error("Reverse design analyze text error:", error);
    return NextResponse.json(
      {
        error: "服务异常，请稍后重试",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
