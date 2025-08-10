import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import OpenAI from "openai";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// 初始化 OpenAI/OpenRouter 客户端
const openai = new OpenAI({
  baseURL: process.env.OPENAI_BASE_URL || "https://openrouter.ai/api/v1",
  apiKey: process.env.OPENROUTER_API_KEY || process.env.OPENAI_API_KEY || "",
});

// 期望模型（需支持视觉理解）。如需替换，请统一在此处更改。
const VISION_MODEL = "gpt-5";

// 将 File 转为 data URL（base64）
async function fileToDataUrl(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  const base64 = buffer.toString("base64");
  const mime = file.type || "image/png";
  return `data:${mime};base64,${base64}`;
}

// 从大模型响应中提取 JSON
function extractJsonObject(text: string): any {
  const trimmed = text.trim();
  const start = trimmed.indexOf("{");
  const end = trimmed.lastIndexOf("}");
  if (start !== -1 && end !== -1 && end > start) {
    const maybe = trimmed.substring(start, end + 1);
    return JSON.parse(maybe);
  }
  const match = trimmed.match(/\{[\s\S]*\}/);
  if (match) return JSON.parse(match[0]);
  throw new Error("No valid JSON object found in AI response");
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // 鉴权：需要登录
    // const {
    //   data: { user },
    //   error: authError,
    // } = await supabase.auth.getUser();
    // if (authError || !user) {
    //   return NextResponse.json(
    //     { error: "需要登录后才能使用设计反推功能" },
    //     { status: 401 }
    //   );
    // }

    // 解析表单（multipart/form-data）
    const formData = await request.formData();
    const files = formData.getAll("images") as File[];

    if (!files || files.length === 0) {
      return NextResponse.json(
        { error: "请至少上传一张图片" },
        { status: 400 }
      );
    }

    // 基础限制
    const MAX_FILES = 6;
    const MAX_SIZE_MB = 8; // 单图 8MB 限制

    if (files.length > MAX_FILES) {
      return NextResponse.json(
        { error: `一次最多上传 ${MAX_FILES} 张图片` },
        { status: 400 }
      );
    }

    for (const f of files) {
      const sizeMb = (f.size || 0) / (1024 * 1024);
      if (sizeMb > MAX_SIZE_MB) {
        return NextResponse.json(
          { error: `图片 ${f.name || ""} 超过 ${MAX_SIZE_MB}MB 大小限制` },
          { status: 400 }
        );
      }
      if (!f.type?.startsWith("image/")) {
        return NextResponse.json(
          { error: `文件 ${f.name || ""} 不是有效图片类型` },
          { status: 400 }
        );
      }
    }

    // 转为 data URL 以便多模态输入
    const dataUrls = await Promise.all(files.map(fileToDataUrl));

    // 组合多图输入与中文系统提示
    const systemPrompt = `你是资深 UI/UX 设计审稿专家与提示词工程专家。你的任务：
- 从给定的优秀图片范例中，系统性地分析其设计语言（布局/网格、信息层级、排版、配色、留白、对齐、对比、图标/插画风格、组件与交互动效暗示、阴影/质感、模块编排等）。
- 统一多图的共性风格，指出差异化元素与可变参数，避免逐图重复罗列。
- 输出完全结构化的 JSON（只输出 JSON），用于复用在 AIGC 生成任务中的“提示词模板”。`;

    const expectedSchema = `严格只输出以下 JSON 结构：
{
  "summary": {
    "overallStyle": "整体风格摘要（如：极简中性色、卡片化、玻璃拟态、插画扁平化等）",
    "designPrinciples": ["关键设计原则1", "关键设计原则2", "..."]
  },
  "visualSystem": {
    "layout": { "grid": "网格/列/间距要点", "composition": "构图与模块编排" },
    "typography": { "families": ["字体家族"], "scale": "层级与字号体系", "lineHeight": "行距", "letterSpacing": "字间距" },
    "colors": { "palette": ["#RRGGBB"], "usage": "主/辅色与使用场景" },
    "shadowsAndDepth": "阴影/层级/质感处理",
    "imagesAndIcons": { "illustrationStyle": "插画/图形风格", "iconStyle": "图标风格" },
    "spacingAndRhythm": "留白/韵律/分割线规则",
    "interactionHints": "交互暗示（悬浮、点击、滚动反馈等）"
  },
  "componentPatterns": [
    { "name": "组件名", "anatomy": "结构组成", "variants": ["变体1", "变体2"], "states": ["默认", "悬浮", "激活", "禁用"], "usageNotes": "使用要点" }
  ],
  "constraints": {
    "mustHave": ["必须包含的要素"],
    "avoid": ["应避免的要素"],
    "adaptableParams": ["可抽象成参数并在模板中替换的槽位，如主题色、品牌名、文案语气"]
  },
  "promptTemplates": {
    "genericTemplate": "通用提示词模板（包含可替换槽位，如【主题色】、【品牌名】、【主标题】、【受众】、【组件清单】等）",
    "detailedExample": "结合上文要点给出一段完整可复制的提示词示例",
    "negativePrompts": ["需要避免的风格或低质量特征关键词"]
  }
}`;

    const userIntro = `请基于所有图片的共性生成一个可复用的设计提示词模板，并覆盖上述 JSON 字段。确保：
- 聚焦可迁移的设计规律与参数化槽位；
- 用简洁、可执行的语言描述；
- 仅输出 JSON，不要任何解释、Markdown 或额外文本。`;

    const messageContent: any[] = [
      {
        type: "input_text",
        text: `${userIntro}\n\n输出格式要求：\n${expectedSchema}`,
      },
      // 依次附上多张图片
      ...dataUrls.map((url) => ({ type: "input_image", image_url: url })),
    ];

    const completion = await openai.responses.create({
      model: VISION_MODEL,
      input: [
        { role: "system", content: systemPrompt },
        { role: "user", content: messageContent as any },
      ],
      temperature: 0.6,
      max_output_tokens: 1800, // 改为新版参数名
      top_p: 0.9,
    });

    const content = completion.output_text || "";
    if (!content) {
      return NextResponse.json(
        { error: "模型无响应，请稍后重试" },
        { status: 502 }
      );
    }

    let analysis: any;
    try {
      analysis = extractJsonObject(content);
    } catch (e) {
      return NextResponse.json(
        {
          error: "AI 返回数据解析失败",
          details: e instanceof Error ? e.message : String(e),
        },
        { status: 500 }
      );
    }

    // 可选：记录审计日志（不阻断主流程）
    // try {
    //   await supabase.from("name_generation_logs").insert({
    //     user_id: user.id,
    //     plan_type: "reverse_design",
    //     credits_used: 0,
    //     names_generated: 0,
    //     metadata: {
    //       operation: "reverse_design_analyze",
    //       image_count: files.length,
    //       model: VISION_MODEL,
    //       timestamp: new Date().toISOString(),
    //     },
    //   });
    // } catch {}

    return NextResponse.json({
      success: true,
      images: files.length,
      model: VISION_MODEL,
      analysis,
      message: "分析完成，已生成可复用提示词模板",
    });
  } catch (error) {
    console.error("Reverse design analyze error:", error);
    return NextResponse.json(
      {
        error: "服务异常，请稍后重试",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
