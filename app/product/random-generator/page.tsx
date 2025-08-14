"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Loader2 } from "lucide-react";
import MainFunction from "@/components/product/mainFunction";
import { useToast } from "@/hooks/use-toast";
import { useCreateStore } from "@/stores/useCreateStore";
import { useAnalysisTextStore } from "@/stores/useAnalysisTextStore";
import { useAnalysisStore } from "@/stores/useAnalysisStore";

export default function RandomNameGeneratorPage() {
  const { anaTextRes } = useAnalysisTextStore();
  const { result: anaImgRes } = useAnalysisStore();
  const { genImgRes, setGenImgRes, genImgResloading, addItem } = useCreateStore();

  const router = useRouter();

  const handleCreate = async () => {
    console.log("anaTextRes", anaTextRes)
    console.log("genImgRes", anaImgRes)

    for (const item of anaTextRes.segments) {
      const { content } = item;
      const prompt = anaImgRes.prompt + '\n\nHere is the article content:' + `\n\n"""{{${content}}}"""`
      const res = await fetch("/api/reverse-design/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error || `生成失败 (${res.status})`);
      }
      const data = await res.json();
      console.log("data", data);
      // const newImgRes: any[] = [];
      // genImgRes.push(data.image)
      // setGenImgRes(newImgRes);
      addItem(data.image)
    }
  }

  console.log("genImgRes && anaTextRes", anaImgRes, anaTextRes)

  return (
    <div>
      {/* Header */}
      <header className="border-b backdrop-blur-sm sticky top-0 z-50 bg-background">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push("/")}
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

            <Button disabled={!anaImgRes || !anaTextRes} onClick={handleCreate}>
              {genImgResloading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> 分析中…
                </>
              ) : (
                "开始生成"
              )}
            </Button>
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
