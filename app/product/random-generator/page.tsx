"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import MainFunction from "@/components/product/mainFunction";
import { useAnalysisStore } from "@/stores/useAnalysisStore";
import { useToast } from "@/hooks/use-toast";
import { useCreateStore } from "@/stores/useCreateStore";

export default function RandomNameGeneratorPage() {
  const router = useRouter();

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
