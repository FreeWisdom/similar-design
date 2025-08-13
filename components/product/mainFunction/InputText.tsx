"use client";

import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { useAnalysisStore } from "@/stores/useAnalysisStore";

const EXAMPLE_TEXT = `在信息过载的时代，只有结构化、可视化的内容才能快速抓住注意力。
-自媒体创作者 用卡片图解让知识在社交平台裂变传播；
-企业培训师 将复杂流程转化为一眼就懂的图表；
-创业者与投资人 用结构化PPT精准传递商业价值；
-知识博主 将课程亮点视觉化，提升付费转化率；
-营销策划人 拆解爆款案例，用结构输出提升落地效率。
-视觉化，是让你的观点被更多人理解、记住、分享的加速器。`;

const MAX_LENGTH = 5000;

const InputText: React.FC = () => {
  const { contentText, setContentText } = useAnalysisStore();

  const handleUseExample = () => setContentText(EXAMPLE_TEXT);
  const handleClear = () => setContentText("");

  return (
    <Card className="w-full md:flex-1">
      <CardHeader>
        <div className="flex items-center justify-between gap-2">
          <CardTitle>输入文字稿</CardTitle>
          <div className="flex items-center gap-2">
            <Button variant="secondary" size="sm" onClick={handleUseExample}>
              使用示例
            </Button>
            <Button variant="outline" size="sm" onClick={handleClear} disabled={!contentText}>
              清空
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