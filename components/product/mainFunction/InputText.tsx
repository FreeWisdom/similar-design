"use client";

import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { useAnalysisStore } from "@/stores/useAnalysisStore";
import { useToast } from "@/hooks/use-toast";
import { useCreateStore } from "@/stores/useCreateStore";

const EXAMPLE_TEXT = `在信息过载的时代，只有结构化、可视化的内容才能快速抓住注意力。
-自媒体创作者 用卡片图解让知识在社交平台裂变传播；
-企业培训师 将复杂流程转化为一眼就懂的图表；
-创业者与投资人 用结构化PPT精准传递商业价值；
-知识博主 将课程亮点视觉化，提升付费转化率；
-营销策划人 拆解爆款案例，用结构输出提升落地效率。
-视觉化，是让你的观点被更多人理解、记住、分享的加速器。`;

const MAX_LENGTH = 5000;

const InputText: React.FC = () => {
  const { contentText, setContentText, result } = useAnalysisStore();
  const { setGenImgRes, setGenImgResloading } = useCreateStore();

  const handleUseExample = () => setContentText(EXAMPLE_TEXT);
  const handleClear = () => setContentText("");

  const { toast } = useToast();

  const startGen = async () => {
    if (!result || !result.prompt) {
      toast({
        title: "请先完成分析",
        description: "需要先生成提示词模板",
        variant: "destructive",
      });
      return;
    }

    // todo
    const textPrompt = `\n\n**文本内容处理方式**：\n
      - 分析需要处理的文本内容，根据内容提炼出N个关键主题，并且生成N张相应的知识图片（如：提炼出5个关键主题，则生成5张知识图片）；
      - 每个主题都要总结其中的要点归纳，尽量用可视化方式，将要点在知识图片上用可视化图表直观的呈现出来；`;

    const newRes =
      result.prompt +
      `\n\n**需要处理的文本内容如下**：\n【${contentText}】` +
      textPrompt;

    try {
      // setLoading(true);
      const res = await fetch("/api/reverse-design/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: newRes,
          // size: "1024x1024"
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error || `生成失败 (${res.status})`);
      }
      const data = await res.json();
      console.log("data", data);
      setGenImgRes(data.image);
      // setResult({ ...result, image: data.image, model: data.model, prompt: newRes });
      // toast({ title: "生成完成", description: "已生成图片" });
    } catch (e: any) {
      toast({
        title: "生成失败",
        description: e.message || String(e),
        variant: "destructive",
      });
    } finally {
      setGenImgResloading(false);
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
            <Button onClick={startGen} disabled={!contentText}>
              文字分析
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
