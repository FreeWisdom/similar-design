"use client";

import React, { useCallback, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';

const MAX_FILES = 6;
const ACCEPTED_TYPES = ['image/png', 'image/jpeg', 'image/webp'];

function readableSize(bytes: number) {
  if (!bytes) return '0B';
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(2)} ${sizes[i]}`;
}

function PreviewList({ files }: { files: File[] }) {
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
      Promise.resolve(cleanup).then((fn) => typeof fn === 'function' && fn());
    };
  }, [files]);

  if (!files.length) return null;

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
      {files.map((file, idx) => (
        <div key={idx} className="rounded border p-2 flex flex-col gap-2 bg-muted/30">
          {previews[idx] && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={previews[idx]} alt={file.name} className="h-32 w-full object-cover rounded" />
          )}
          <div className="text-xs text-muted-foreground truncate">{file.name}</div>
          <div className="text-xs text-muted-foreground">{readableSize(file.size)}</div>
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

  const onFilesChange = useCallback((selected: FileList | null) => {
    if (!selected) return;
    const list = Array.from(selected);

    if (list.length > MAX_FILES) {
      toast({ title: '最多上传 6 张图片', variant: 'destructive' });
      return;
    }
    const filtered = list.filter((f) => ACCEPTED_TYPES.includes(f.type));
    if (filtered.length !== list.length) {
      toast({ title: '仅支持 PNG/JPEG/WebP', variant: 'destructive' });
    }
    setFiles(filtered);
  }, [toast]);

  const onSubmit = useCallback(async () => {
    if (files.length === 0) {
      toast({ title: '请先选择图片', variant: 'destructive' });
      return;
    }
    setLoading(true);
    setResult(null);
    try {
      const fd = new FormData();
      files.forEach((f) => fd.append('images', f));

      const res = await fetch('/api/reverse-design/analyze', {
        method: 'POST',
        body: fd,
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `分析失败 (${res.status})`);
      }

      const data = await res.json();
      setResult(data.analysis);
      toast({ title: '分析完成', description: '已生成提示词模板' });
    } catch (e: any) {
      toast({ title: '请求失败', description: e.message || String(e), variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [files, toast]);

  const prettyJson = useMemo(() => {
    if (!result) return '';
    try { return JSON.stringify(result, null, 2); } catch { return ''; }
  }, [result]);

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>反向设计分析（上传优秀图片 → 生成提示词模板）</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="space-y-2">
          <Label htmlFor="images">上传图片（最多 {MAX_FILES} 张）</Label>
          <Input id="images" type="file" accept={ACCEPTED_TYPES.join(',')} multiple onChange={(e) => onFilesChange(e.target.files)} />
        </div>

        <PreviewList files={files} />

        <div className="flex gap-2">
          <Button onClick={onSubmit} disabled={loading || files.length === 0}>
            {loading ? '分析中…' : '开始分析'}
          </Button>
          <Button variant="secondary" onClick={() => { setFiles([]); setResult(null); }} disabled={loading}>重置</Button>
        </div>

        {result && (
          <div className="space-y-2">
            <div className="text-sm font-medium">分析结果（JSON 模板）</div>
            <pre className="whitespace-pre-wrap rounded bg-muted p-3 text-xs overflow-auto max-h-[480px]">
{prettyJson}
            </pre>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default MainFunction;