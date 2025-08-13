"use client";

import React, { useMemo, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText, Copy, Download, CheckCircle2 } from "lucide-react";
import InputText from "./InputText";
import { useAnalysisStore } from "@/stores/useAnalysisStore";
import GenerateImages from "./GenerateImages";
import InputImgs from "./InputImgs";

const MainFunction: React.FC = () => {
  const { result } = useAnalysisStore();

  const prewarmedRef = useRef(false);

  // 预热 API，避免首次编译/冷启动造成的失败
  React.useEffect(() => {
    if (prewarmedRef.current) return;
    prewarmedRef.current = true;
    fetch("/api/reverse-design/analyze", {
      method: "GET",
      cache: "no-store",
      keepalive: true,
    }).catch(() => {});
  }, []);

  const prettyJson = useMemo(() => {
    if (!result) return "";
    try {
      return JSON.stringify(result, null, 2);
    } catch {
      return "";
    }
  }, [result]);

  return (
    <div className="w-full">
      <div className="flex flex-col md:flex-row gap-4 items-start">
        <InputImgs />
        <InputText />
      </div>
      <div className="flex flex-col md:flex-row gap-4 items-start">
        <Card className="w-full md:flex-1">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>生成提示词模板</CardTitle>
              {result ? (
                <div className="flex items-center gap-2">
                  <Button variant="secondary" size="sm">
                    <Copy className="h-4 w-4 mr-1.5" /> 复制
                  </Button>
                  <Button variant="outline" size="sm">
                    <Download className="h-4 w-4 mr-1.5" /> 下载
                  </Button>
                </div>
              ) : null}
            </div>
          </CardHeader>
          <CardContent>
            {result ? (
              <div className="space-y-2">
                <div className="text-sm font-medium flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-600" />{" "}
                  分析结果（JSON 模板）
                </div>
                <pre className="whitespace-pre-wrap rounded bg-muted p-3 text-xs overflow-auto max-h-[420px] font-mono leading-relaxed">
                  {prettyJson}
                </pre>
              </div>
            ) : (
              <div className="flex items-center justify-center rounded border-2 border-dashed text-muted-foreground py-10">
                <div className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  <span className="text-sm">暂无分析结果</span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <GenerateImages />
    </div>
  );
};

export default MainFunction;
