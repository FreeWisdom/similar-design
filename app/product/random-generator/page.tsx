"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Loader2 } from "lucide-react";
import MainFunction from "@/components/product/mainFunction";
import { useCallback, useEffect } from "react";
import { useAnalysisStore } from "@/stores/useAnalysisStore";
import { useToast } from "@/hooks/use-toast";
import { useCreateStore } from "@/stores/useCreateStore";

export default function RandomNameGeneratorPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { files, loading, setLoading, setResult, result, contentText } = useAnalysisStore();
	const { setGenImgRes, setGenImgResloading } = useCreateStore();

  const onSubmit = useCallback(async () => {
    if (files.length === 0) {
      toast({ title: "请先选择图片", variant: "destructive" });
      return;
    }
    setLoading(true);
    setResult(null);

    async function tryOnce(): Promise<Response> {
      const fd = new FormData();
      files.forEach((f) => fd.append("images", f));
      return fetch("/api/reverse-design/analyze", {
        method: "POST",
        body: fd,
        cache: "no-store",
      });
    }

    try {
      // 尝试请求，失败时自动重试一次（应对冷启动）
      let res = await tryOnce();
      if (!res.ok) {
        await new Promise((r) => setTimeout(r, 500));
        res = await tryOnce();
      }

      if (!res.ok) {
        let msg = "";
        try {
          const data = await res.json();
          msg = data?.error || JSON.stringify(data);
        } catch {
          try {
            msg = await res.text();
          } catch { }
        }
        throw new Error(msg || `分析失败 (${res.status})`);
      }

      const data = await res.json();
      setResult(data.analysis);
      toast({ title: "分析完成", description: "已生成提示词模板" });
    } catch (e: any) {
      toast({
        title: "请求失败",
        description: e.message || String(e),
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [files, toast, setLoading, setResult]);

  const startGen = async () => {
    if (!result || !result.prompt) {
      toast({ title: "请先完成分析", description: "需要先生成提示词模板", variant: "destructive" });
      return;
    }

    // todo
    const textPrompt = `\n\n**文本内容处理方式**：\n
      - 分析需要处理的文本内容，根据内容提炼出N关键主题，并且生成N张相应的知识图片（如果提炼出5个关键主题，则生成5张图片）；
      - 每个主题都要总结该主题的要点归纳，尽量用可视化方式，将要点在知识图片上用可视化图表直观的呈现出来；`

    const newRes = result.prompt + `\n\n**需要处理的文本内容如下**：\n【${contentText}】`;

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
      console.log("data", data)
      setGenImgRes(data.image)
      // setResult({ ...result, image: data.image, model: data.model, prompt: newRes });
      // toast({ title: "生成完成", description: "已生成图片" });
    } catch (e: any) {
      toast({ title: "生成失败", description: e.message || String(e), variant: "destructive" });
    } finally {
      setGenImgResloading(false);
    }
  };

  return (
    <div>
      {/* Header */}
      <header className="border-b backdrop-blur-sm sticky top-0 z-50 bg-background">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push('/')}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Home
            </Button>

            <div className="flex-1 text-center">
              <h1 className="text-2xl md:text-3xl font-bold text-violet-900">
                Random Name Generator
              </h1>
              <p className="text-violet-600 mt-1">
                Generate beautiful Chinese names instantly
              </p>
            </div>

            <Button
              onClick={onSubmit}
              disabled={loading || files.length === 0}
              className="shadow-sm"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> 分析中…
                </>
              ) : (
                "开始分析"
              )}
            </Button>

            <Button onClick={startGen}>开始生成</Button>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8 max-w-6xl">
        {/* <RandomNameGenerator /> */}
        <MainFunction />
      </div>
    </div>
  );
}