"use client";

import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { useAnalysisTextStore } from "@/stores/useAnalysisTextStore";
import { useToast } from "@/hooks/use-toast";
import { useCreateStore } from "@/stores/useCreateStore";
import { Loader2 } from "lucide-react";

const EXAMPLE_TEXT = `在信息过载的时代，只有结构化、可视化的内容才能快速抓住注意力。
-自媒体创作者 用卡片图解让知识在社交平台裂变传播；
-企业培训师 将复杂流程转化为一眼就懂的图表；
-创业者与投资人 用结构化PPT精准传递商业价值；
-知识博主 将课程亮点视觉化，提升付费转化率；
-营销策划人 拆解爆款案例，用结构输出提升落地效率。
-视觉化，是让你的观点被更多人理解、记住、分享的加速器。`;

const MAX_LENGTH = 5000;

const InputText: React.FC = () => {
  // const { contentText, setContentText
  //   // , result
  // } = useAnalysisStore();
  const { contentText, setContentText, setAnaTextRes, setAnaTextLoading, anaTextLoading } = useAnalysisTextStore();
  // const { setGenImgRes, setGenImgResloading } = useCreateStore();

  const handleUseExample = () => setContentText(EXAMPLE_TEXT);
  const handleClear = () => setContentText("");

  const { toast } = useToast();

  const startGen = async () => {
    // if (!result || !result.prompt) {
    //   toast({
    //     title: "请先完成分析",
    //     description: "需要先生成提示词模板",
    //     variant: "destructive",
    //   });
    //   return;
    // }

    const textPrompt = `
      You are an expert text analyst.
      Task:
      1. Read the following full article content.
      2. Identify and list several key themes/topics from the article. Each theme should be concise and reflect the main ideas of the text.
      3. Split the original article into multiple segments based on these themes. Each segment should only contain the text related to that theme, keeping the original wording unchanged.

      Requirements:
      - Do not add extra commentary.
      - Keep all original article text exactly as it is inside the "content" fields.
      - Ensure the array is ordered in the same sequence the themes appear in the article.

      Strict rules for output:
      - Escape all double quotes in 'content' with a backslash (\").
      - Preserve all line breaks using '\n'.
      - Do not add any text outside of the JSON.
      - Ensure the JSON is syntactically valid and can be parsed by standard JSON parsers.

      Here is the article content:
    `;

    const expectedSchema = `严格只输出以下 JSON 结构：
      {
        texts: [
          {
            "theme": "<Theme name>",
            "content": "<Original text content related to this theme>"
          }
        ] 
      }
    `;

    const prompt = textPrompt + `\n\n"""{{${contentText}}}"""` + `\n\n输出格式要求：\n${expectedSchema}`;

    try {
      setAnaTextLoading(true);
      const res = await fetch("/api/reverse-design/text", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error || `生成失败 (${res.status})`);
      }

      const data = await res.json();
      setAnaTextRes({ segments: data.segments, model: data.model });
      toast({ title: "分析完成", description: "已生成主题分段结果" });
    } catch (e: any) {
      toast({
        title: "生成失败",
        description: e?.message || String(e),
        variant: "destructive",
      });
    } finally {
      setAnaTextLoading(false);
    }
  };

  return (
    <Card className="w-full md:flex-1">
      <CardHeader>
        <div className="flex items-center justify-between gap-2">
          <CardTitle>输入文字稿</CardTitle>
          <div className="flex items-center gap-2">
            <Button variant="secondary" size="sm" onClick={handleUseExample}>
              使用示例
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleClear}
              disabled={!contentText}
            >
              清空
            </Button>
            <Button onClick={startGen} disabled={!contentText || anaTextLoading}>
              {anaTextLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> 分析中…
                </>
              ) : (
                "文字分析"
              )}
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        <Textarea
          value={contentText}
          onChange={(e) => setContentText(e.target.value.slice(0, MAX_LENGTH))}
          placeholder={`例如：${EXAMPLE_TEXT}`}
          rows={8}
          maxLength={MAX_LENGTH}
          className="min-h-[170px] resize-y"
        />
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>可粘贴你的文字内容，支持长文本</span>
          <span>
            {contentText.length}/{MAX_LENGTH}
          </span>
        </div>
      </CardContent>
    </Card>
  );
};

export default InputText;
