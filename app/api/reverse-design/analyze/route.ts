import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import OpenAI from "openai";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// function getOpenAIClient() {
//   const baseURL = process.env.OPENAI_BASE_URL || "https://openrouter.ai/api/v1";
//   const apiKey = process.env.OPENROUTER_API_KEY || process.env.OPENAI_API_KEY || "";
//   if (!apiKey) return null;
//   return new OpenAI({ baseURL, apiKey });
// }

// 初始化 OpenAI/OpenRouter 客户端
const openai = new OpenAI({
  baseURL: process.env.OPENAI_BASE_URL || "https://openrouter.ai/api/v1",
  apiKey: process.env.OPENROUTER_API_KEY || process.env.OPENAI_API_KEY || "",
});

// 期望模型（需支持视觉理解）。如需替换，请统一在此处更改。
const VISION_MODEL = "anthropic/claude-sonnet-4";

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

// function buildMockAnalysis(imageCount: number) {
//   return {
//     summary: {
//       overallStyle: "极简中性色卡片化",
//       designPrinciples: ["对比与留白", "统一网格", "层级清晰"],
//     },
//     visualSystem: {
//       layout: { grid: "12列 24px 间距", composition: "主副双栏，卡片分组" },
//       typography: {
//         families: ["Inter", "SF Pro"],
//         scale: "32/24/18/16/14",
//         lineHeight: "1.4-1.6",
//         letterSpacing: "-0.2~0",
//       },
//       colors: { palette: ["#111827", "#374151", "#F3F4F6", "#3B82F6"], usage: "深色文字、浅色卡片、主色点缀" },
//       shadowsAndDepth: "卡片柔和阴影 + 悬浮加深",
//       imagesAndIcons: { illustrationStyle: "扁平矢量", iconStyle: "线性 + 轻填充" },
//       spacingAndRhythm: "8px 基数节奏，分割线弱化",
//       interactionHints: "悬浮提升/点击按压反馈",
//     },
//     componentPatterns: [
//       {
//         name: "Card",
//         anatomy: "容器/标题/内容/操作",
//         variants: ["默认", "强调"],
//         states: ["默认", "悬浮", "激活", "禁用"],
//         usageNotes: "对比度与层级清楚，保持统一内边距",
//       },
//     ],
//     constraints: {
//       mustHave: ["统一网格", "足够留白"],
//       avoid: ["过度阴影", "色彩过多"],
//       adaptableParams: ["主题色", "品牌名", "标题文案"],
//     },
//     promptTemplates: {
//       genericTemplate: "以【主题色】为主色，采用【整体风格】，生成包含【组件清单】的界面...",
//       detailedExample: "生成一个面向【受众】的仪表盘...",
//       negativePrompts: ["过度饱和", "杂乱布局"],
//     },
//     _mock: true,
//     _images: imageCount,
//   };
// }

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
- 从给定的优秀图片范例中，系统性地分析其内容结构（主标题、副标题、核心观点、数据点、支撑性说明文字、视觉化数据图表、字体层级、信息密度等）。
- 统一多图的共性风格，指出差异化元素与可变参数，避免逐图重复罗列。`;
    // - 逆向分析给定的图片范例的设计风格，结合后续我发送的一段文本内容，帮我生成几张类似于给定图片风格的知识卡片，并生成通用的提示词到输出 JSON 的 prompt 字段中。`;
    // - 输出完全结构化的 JSON（只输出 JSON），用于复用在 AIGC 生成任务中的“提示词模板”。`;

    const expectedSchema = `严格只输出以下 JSON 结构：
      {
        "prompt": "",
      }
    `;
    // {
    //   "summary": {
    //     "overallStyle": "整体风格摘要（如：极简中性色、卡片化、玻璃拟态、插画扁平化等）",
    //     "designPrinciples": ["关键设计原则1", "关键设计原则2", "..."]
    //   },
    //   "visualSystem": {
    //     "layout": { "grid": "网格/列/间距要点", "composition": "构图与模块编排" },
    //     "typography": { "families": ["字体家族"], "scale": "层级与字号体系", "lineHeight": "行距", "letterSpacing": "字间距" },
    //     "colors": { "palette": ["#RRGGBB"], "usage": "主/辅色与使用场景" },
    //     "shadowsAndDepth": "阴影/层级/质感处理",
    //     "imagesAndIcons": { "illustrationStyle": "插画/图形风格", "iconStyle": "图标风格" },
    //     "spacingAndRhythm": "留白/韵律/分割线规则",
    //     "interactionHints": "交互暗示（悬浮、点击、滚动反馈等）"
    //   },
    //   "componentPatterns": [
    //     { "name": "组件名", "anatomy": "结构组成", "variants": ["变体1", "变体2"], "states": ["默认", "悬浮", "激活", "禁用"], "usageNotes": "使用要点" }
    //   ],
    //   "constraints": {
    //     "mustHave": ["必须包含的要素"],
    //     "avoid": ["应避免的要素"],
    //     "adaptableParams": ["可抽象成参数并在模板中替换的槽位，如主题色、品牌名、文案语气"]
    //   },
    //   "promptTemplates": {
    //     "genericTemplate": "通用提示词模板（包含可替换槽位，如【主题色】、【品牌名】、【主标题】、【受众】、【组件清单】等）",
    //     "detailedExample": "结合上文要点给出一段完整可复制的提示词示例",
    //     "negativePrompts": ["需要避免的风格或低质量特征关键词"]
    //   }
    // }`;

    //     const userIntro = `请基于所有图片的共性生成一个可复用的设计提示词模板，并覆盖上述 JSON 字段。确保：
    // - 聚焦可迁移的设计规律与参数化槽位；
    // - 用简洁、可执行的语言描述；
    // - 仅输出 JSON，不要任何解释、Markdown 或额外文本。`;

    const userIntro = `
      请根据我提供的知识卡片图片，为我逆向分析知识卡片图片的设计风格，并生成通用的提示词。确保提示词中包含：
      - 整体风格（如：极简中性色、卡片化、玻璃拟态、插画扁平化等，要保留一个或几个关键设计原则）；
      - 整体配色方案（包含：背景/文字，其各自的主/辅色与使用场景等）；
      - 整体排版方案（包含：字体风格、层级与字号体系、行距、字间距等）；
      - 整体卡片尺寸；
      - 整体布局方式（包含：网格/列/间距要点、构图与模块编排等）；
      - 整体间距和节奏（包含：留白/韵律/分割线规则）；
      - 整体阴影和深度设计（包含：阴影/层级/质感处理）；
      - 整体图片和图标（包含：插画/图形风格，图标风格）；
      - 单卡片标题设计（包含：主标题/副标题/标题颜色）；
      - 单卡片内容结构（包含：核心观点/数据支撑/补充说明）；
      - 单卡片视觉元素（包含：背景装饰/数据图表/高亮元素/留白处理）；
      - 单卡片文字规范（包含：主要文字/强调文字/字体层级/是否多语言混排等）；
      - 单卡片输出格式（根据提供的图片进行总结）；
      - 生成的提示词要考虑到，有可能生成一张或多张图片的情况，所以不要在生成的提示词中明确的表示生成几张图片；
    `;
    //   - 文本内容处理要先进性内容分析，根据内容提炼出N关键主题，并且生成N张相应的知识图片（如果提炼出5个关键主题，则生成5张图片）；
    //   - 每个主题都要总结该主题的要点归纳，尽量用可视化方式，将要点在知识图片上用可视化图表直观的呈现出来；
    // `

    const messageContent: any[] = [
      {
        type: "text",
        // text: `输出格式要求：\n${expectedSchema}`,
        text: `${userIntro}\n\n输出格式要求：\n${expectedSchema}`,
      },
      // 依次附上多张图片
      ...dataUrls.map((url) => ({ type: "image_url", image_url: url })),
    ];

    // 环境校验与 OpenAI 客户端
    // const openai = getOpenAIClient();
    // if (!openai) {
    //   if (process.env.NODE_ENV !== "production") {
    //     return NextResponse.json({ success: true, images: files.length, model: VISION_MODEL, analysis: buildMockAnalysis(files.length), message: "开发模式：使用本地 mock 分析结果" });
    //   }
    //   return NextResponse.json({ error: "后端未配置 OPENROUTER_API_KEY/OPENAI_API_KEY" }, { status: 500 });
    // }

    // 请求大模型
    const completion = await openai.chat.completions.create({
      model: VISION_MODEL,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: messageContent as any },
      ],
      temperature: 0.6,
      // max_output_tokens: 1800, // 改为新版参数名
      top_p: 0.9,
    });

    const content = completion.choices[0].message.content || "";
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

// export async function GET() {
//   // 轻量心跳/预热接口：用于首次调用时预编译与唤醒
//   return NextResponse.json({ ok: true });
// }
