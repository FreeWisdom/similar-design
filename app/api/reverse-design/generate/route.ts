import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
    try {
        const body = await req.json().catch(() => ({}));
        const prompt = (body?.prompt ?? "").toString().trim();
        // const size = (body?.size ?? "1024x1024").toString();

        if (!prompt) {
            return NextResponse.json({ error: "缺少提示词 prompt" }, { status: 400 });
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

        // // 将 size 形如 1024x1024 转为 width/height，用于提示
        // let width = "1024";
        // let height = "1024";
        // if (typeof size === "string" && size.includes("x")) {
        //     const [w, h] = size.split("x");
        //     if (w) width = String(parseInt(w, 10) || 1024);
        //     if (h) height = String(parseInt(h, 10) || 1024);
        // }

        const systemPrompt = "你是专业的矢量图与前端图形工程师。严格只输出合法的 SVG 文本，不要解释，不要使用 Markdown 代码块。";
        const userPrompt = [
            "根据以下需求生成一个精简、语义清晰、可直接渲染的 SVG：",
            "- 使用 <svg xmlns=\"http://www.w3.org/2000/svg\"> 根节点",
            "- 尽量内联样式，避免外链",
            "- 只输出完整 SVG，不要任何解释或包裹符号",
            "",
            `需求：\n${prompt}`,
        ].join("\n");
                    // `- 设置 width=\"${width}\"、height=\"${height}\"、viewBox=\"0 0 ${width} ${height}\"`,


        const completion = await openai.chat.completions.create({
            model: MODEL,
            temperature: 0.4,
            messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: userPrompt },
            ],
        });

        const svg = (completion?.choices?.[0]?.message?.content || "").trim();
        if (!svg || !svg.toLowerCase().includes("<svg") || !svg.toLowerCase().includes("</svg>")) {
            return NextResponse.json(
                { error: "模型未返回有效 SVG" },
                { status: 502 }
            );
        }

        const dataUrl = `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;

        return NextResponse.json({ success: true, model: MODEL, image: dataUrl, svg });
    } catch (error) {
        console.error("Reverse design generate error:", error);
        return NextResponse.json(
            {
                error: "生成失败，请稍后重试",
                details: error instanceof Error ? error.message : "Unknown error",
            },
            { status: 500 }
        );
    }
} 