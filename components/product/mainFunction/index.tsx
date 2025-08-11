"use client";

import React, { useCallback, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  FileText,
  Upload,
  ImagePlus,
  X,
  ChevronLeft,
  ChevronRight,
  Copy,
  Download,
  Loader2,
  CheckCircle2,
} from "lucide-react";

const MAX_FILES = 6;
const MAX_SIZE_MB = 8; // 与服务端保持一致
const ACCEPTED_EXTENSIONS = [".png", ".jpg", ".jpeg", ".webp"];
const isAcceptedImage = (file: File) =>
  file.type ? file.type.startsWith("image/") : true;

function readableSize(bytes: number) {
  if (!bytes) return "0B";
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(2)} ${sizes[i]}`;
}

function getFileSignature(file: File) {
  return `${file.name}|${file.size}|${file.lastModified}`;
}

function PreviewList({
  files,
  onRemove,
  onMove,
}: {
  files: File[];
  onRemove: (index: number) => void;
  onMove: (index: number, direction: "left" | "right") => void;
}) {
  const [previews, setPreviews] = useState<string[]>([]);

  React.useEffect(() => {
    let cancelled = false;
    async function gen() {
      const urls: string[] = [];
      for (const f of files) {
        urls.push(URL.createObjectURL(f));
      }
      if (!cancelled) setPreviews(urls);
      return () => urls.forEach((u) => URL.revokeObjectURL(u));
    }
    const cleanup = gen();
    return () => {
      cancelled = true;
      Promise.resolve(cleanup).then((fn) => typeof fn === "function" && fn());
    };
  }, [files]);

  if (!files.length) return null;

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
      {files.map((file, idx) => (
        <div
          key={idx}
          className="group rounded border p-2 flex flex-col gap-2 bg-muted/30 relative overflow-hidden"
        >
          {previews[idx] && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={previews[idx]}
              alt={file.name}
              className="h-32 w-full object-cover rounded"
            />
          )}

          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/25 transition-colors" />
          <div className="absolute top-1 right-1 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <Button
              size="icon"
              variant="secondary"
              className="h-7 w-7"
              onClick={() => onMove(idx, "left")}
              title="左移"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              size="icon"
              variant="secondary"
              className="h-7 w-7"
              onClick={() => onMove(idx, "right")}
              title="右移"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button
              size="icon"
              variant="destructive"
              className="h-7 w-7"
              onClick={() => onRemove(idx)}
              title="删除"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          <div className="text-xs text-muted-foreground truncate mt-2">
            {file.name}
          </div>
          <div className="text-xs text-muted-foreground">
            {readableSize(file.size)}
          </div>
        </div>
      ))}
    </div>
  );
}

const MainFunction: React.FC = () => {
  const { toast } = useToast();
  const [files, setFiles] = useState<File[]>([]);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const prewarmedRef = useRef(false);
  const openingRef = useRef(false);
  const openingTimerRef = useRef<number | null>(null);

  const totalSize = useMemo(
    () => files.reduce((sum, f) => sum + f.size, 0),
    [files]
  );

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

  const mergeFiles = useCallback(
    (incoming: File[]) => {
      // 过滤类型
      const accepted = incoming.filter((f) => isAcceptedImage(f));
      if (accepted.length !== incoming.length) {
        toast({
          title: "仅支持 PNG/JPEG/WebP",
          description: "已自动忽略非图片文件",
          variant: "destructive",
        });
      }

      // 过滤大小
      const sizeOk = accepted.filter(
        (f) => f.size <= MAX_SIZE_MB * 1024 * 1024
      );
      if (sizeOk.length !== accepted.length) {
        const dropped = accepted.filter(
          (f) => f.size > MAX_SIZE_MB * 1024 * 1024
        );
        toast({
          title: `单图大小需 ≤ ${MAX_SIZE_MB}MB`,
          description: `已忽略 ${dropped.length} 张过大图片`,
          variant: "destructive",
        });
      }

      // 去重
      const existingSignatures = new Set(files.map(getFileSignature));
      const deduped = sizeOk.filter(
        (f) => !existingSignatures.has(getFileSignature(f))
      );

      // 限制数量
      const remainingSlots = Math.max(0, MAX_FILES - files.length);
      const toAdd = deduped.slice(0, remainingSlots);
      if (deduped.length > remainingSlots) {
        toast({
          title: `最多上传 ${MAX_FILES} 张图片`,
          description: `已自动截取前 ${toAdd.length} 张`,
          variant: "destructive",
        });
      }

      if (toAdd.length === 0) {
        if (files.length >= MAX_FILES) {
          toast({
            title: `已达到 ${MAX_FILES} 张上限`,
            variant: "destructive",
          });
        } else if (accepted.length === 0) {
          toast({
            title: "未选中有效图片类型",
            description: "请使用 PNG / JPEG / WebP",
            variant: "destructive",
          });
        } else {
          toast({
            title: "没有新增图片",
            description: "选择的图片可能过大或与现有重复",
            variant: "destructive",
          });
        }
        return;
      }
      setFiles((prev) => [...prev, ...toAdd]);
      toast({ title: `已添加 ${toAdd.length} 张图片` });
    },
    [files, toast]
  );

  const onFilesChange = useCallback(
    (selected: FileList | null) => {
      if (!selected) {
        // 可能是取消选择，解锁打开保护
        if (openingTimerRef.current) {
          window.clearTimeout(openingTimerRef.current);
          openingTimerRef.current = null;
        }
        openingRef.current = false;
        return;
      }
      mergeFiles(Array.from(selected));
      // 重置 input 值，允许选择相同文件再次触发 onChange
      if (inputRef.current) inputRef.current.value = "";
      // 本次选择完成，解锁打开保护
      if (openingTimerRef.current) {
        window.clearTimeout(openingTimerRef.current);
        openingTimerRef.current = null;
      }
      openingRef.current = false;
    },
    [mergeFiles]
  );

  const onDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);
      const dropped = Array.from(e.dataTransfer.files || []);
      if (!dropped.length) return;
      mergeFiles(dropped);
    },
    [mergeFiles]
  );

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
          } catch {}
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
  }, [files, toast]);

  const prettyJson = useMemo(() => {
    if (!result) return "";
    try {
      return JSON.stringify(result, null, 2);
    } catch {
      return "";
    }
  }, [result]);

  const removeFile = useCallback((index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const moveFile = useCallback((index: number, direction: "left" | "right") => {
    setFiles((prev) => {
      const next = [...prev];
      const target = direction === "left" ? index - 1 : index + 1;
      if (target < 0 || target >= next.length) return prev;
      const [moved] = next.splice(index, 1);
      next.splice(target, 0, moved);
      return next;
    });
  }, []);

  const handleCopy = useCallback(async () => {
    if (!prettyJson) return;
    await navigator.clipboard.writeText(prettyJson);
    toast({ title: "已复制到剪贴板" });
  }, [prettyJson, toast]);

  const handleDownload = useCallback(() => {
    if (!prettyJson) return;
    const blob = new Blob([prettyJson], {
      type: "application/json;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "analysis.json";
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }, [prettyJson]);

  const openFileDialog = useCallback(() => {
    if (files.length >= MAX_FILES) {
      toast({ title: `最多选择 ${MAX_FILES} 张图片`, variant: "destructive" });
      return;
    }
    // 防连点/冒泡导致的重复打开：同一选择流程仅允许一次
    if (openingRef.current) return;
    openingRef.current = true;
    try {
      inputRef.current?.click();
    } finally {
      // 若用户取消或浏览器未触发 change，设置兜底超时后解锁
      if (openingTimerRef.current) {
        window.clearTimeout(openingTimerRef.current);
      }
      openingTimerRef.current = window.setTimeout(() => {
        openingRef.current = false;
        openingTimerRef.current = null;
      }, 2000);
    }
  }, [files.length, toast]);

  return (
    <div className="flex flex-col md:flex-row gap-4 items-start">
      <Card className="w-full flex-1">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>上传优秀图片</CardTitle>
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="text-xs">
                {files.length}/{MAX_FILES}
              </Badge>
              <Badge variant="outline" className="text-xs">
                {readableSize(totalSize)}
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div
            className={
              `rounded-md border-2 border-dashed p-6 transition-all cursor-default relative overflow-hidden ` +
              (isDragging
                ? "border-primary bg-primary/5 shadow-inner"
                : "border-muted-foreground/30 hover:border-primary/50")
            }
            onDragOver={(e) => {
              e.preventDefault();
              e.stopPropagation();
              if (!isDragging) setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={onDrop}
          >
            {loading && (
              <div className="absolute inset-0 bg-background/60 backdrop-blur-sm flex items-center justify-center z-10">
                <div className="flex items-center gap-2 text-primary">
                  <Loader2 className="h-5 w-5 animate-spin" />
                  <span className="text-sm">分析中…</span>
                </div>
              </div>
            )}
            <div className="flex flex-col items-center justify-center gap-2 text-center">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Upload className="h-5 w-5" />
                <span className="text-sm">拖拽图片到此处，或点击选择</span>
              </div>
              <div className="text-xs text-muted-foreground">
                支持 PNG / JPEG / WebP，最多 {MAX_FILES} 张
              </div>
              <div>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  className="mt-2"
                  onClick={(e) => {
                    e.stopPropagation();
                    openFileDialog();
                  }}
                  disabled={loading}
                >
                  <ImagePlus className="h-4 w-4 mr-2" />
                  选择图片
                </Button>
              </div>
            </div>
            <Input
              ref={inputRef}
              id="images"
              type="file"
              accept={ACCEPTED_EXTENSIONS.join(",")}
              multiple
              onChange={(e) => onFilesChange(e.target.files)}
              className="sr-only"
            />
          </div>

          <PreviewList files={files} onRemove={removeFile} onMove={moveFile} />

          <div className="flex flex-col md:flex-row gap-4 items-start">
            <div className="flex gap-2 w-full md:w-auto">
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
              <Button
                variant="secondary"
                onClick={() => {
                  setFiles([]);
                  setResult(null);
                }}
                disabled={loading}
              >
                重置
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="w-full md:flex-1">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>生成提示词模板</CardTitle>
            {result ? (
              <div className="flex items-center gap-2">
                <Button variant="secondary" size="sm" onClick={handleCopy}>
                  <Copy className="h-4 w-4 mr-1.5" /> 复制
                </Button>
                <Button variant="outline" size="sm" onClick={handleDownload}>
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
  );
};

export default MainFunction;
