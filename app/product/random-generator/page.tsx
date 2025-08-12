"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Loader2 } from "lucide-react";
// import RandomNameGenerator from "@/components/product/random/random-name-generator";
import MainFunction from "@/components/product/mainFunction";
import { useCallback, useEffect } from "react";
import { useReverseDesignStore } from "@/stores/useReverseDesignStore";
import { useToast } from "@/hooks/use-toast";

export default function RandomNameGeneratorPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { files, loading, setLoading, setResult, result, contentText } = useReverseDesignStore();

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

  // const joinJson = `
  // "contentSource": {
  //   "type": "article",
  //   "format": "plaintext",
  //   "rawText": ${JSON.stringify(contentText ?? "")}
  // },
  // "contentProcessing": {
  //   "summarization": true,
  //   "visualization": true,
  //   "outputFormat": "ppt" 
  // }`;


  // try {
  //   const addition = JSON.parse(`{${joinJson}}`);
  //   const base = (result && typeof result === "object" && !Array.isArray(result)) ? result : {};
  //   setResult({ ...base, ...addition });
  //   toast({ title: "已追加生成配置字段" });
  // } catch (e: any) {
  //   toast({ title: "追加失败", description: e.message || String(e), variant: "destructive" });
  // }

  const startGen = () => {
    console.log("result", result)

    // const content = "Raw text content：/n" + "【" + JSON.stringify(contentText ?? "") + "】";
    // const base = (result && typeof result === "object" && !Array.isArray(result)) ? result : {};
    // setResult({ ...base, content });
    // toast({ title: "已将 content 追加到 result" });
  };

  useEffect(() => {
    console.log("result", result)
  }, [result])

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