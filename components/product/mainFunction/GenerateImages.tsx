import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useCreateStore } from "@/stores/useCreateStore";
import { Download, ImagePlus, Loader2 } from "lucide-react";

const GenerateImages = () => {
	const { genImgRes, genImgResloading } = useCreateStore();

	const value = (genImgRes as unknown as string) || "";
    console.log("value", value, genImgRes)
	const trimmed = value.trim();
	const isSvgDataUrl = typeof value === "string" && value.startsWith("data:image/svg+xml");
	const isRawSvg = typeof trimmed === "string" && trimmed.startsWith("<svg");

	function handleDownload() {
		if (!value) return;
		// 若为原始 SVG 文本，转为 Blob 下载 .svg
		if (isRawSvg) {
			const blob = new Blob([value], { type: "image/svg+xml;charset=utf-8" });
			const url = URL.createObjectURL(blob);
			const link = document.createElement("a");
			link.href = url;
			link.download = "reverse-design.svg";
			document.body.appendChild(link);
			link.click();
			link.remove();
			URL.revokeObjectURL(url);
			return;
		}
		// 否则直接下载 Data URL 或远程 URL，扩展名按类型判断
		const isSvg = isSvgDataUrl || value.endsWith(".svg");
		const link = document.createElement("a");
		link.href = value;
		link.download = isSvg ? "reverse-design.svg" : "reverse-design.png";
		document.body.appendChild(link);
		link.click();
		link.remove();
	}

	return (
		<div className="flex flex-col md:flex-row gap-4 items-start">
			<Card className="w-full">
				<CardHeader>
					<div className="flex items-center justify-between">
						<CardTitle>生成图片预览</CardTitle>
						{value ? (
							<div className="flex items-center gap-2">
								<Button variant="outline" size="sm" onClick={handleDownload}>
									<Download className="h-4 w-4 mr-1.5" /> 下载图片
								</Button>
							</div>
						) : null}
					</div>
				</CardHeader>
				<CardContent>
					<div className="relative">
						{genImgResloading && (
							<div className="absolute inset-0 bg-background/60 backdrop-blur-sm flex items-center justify-center z-10">
								<div className="flex items-center gap-2 text-primary">
									<Loader2 className="h-5 w-5 animate-spin" />
									<span className="text-sm">生成中…</span>
								</div>
							</div>
						)}
						{value ? (
							isRawSvg ? (
								<div
									className="w-full max-h-[512px] overflow-auto rounded border bg-white"
									dangerouslySetInnerHTML={{ __html: value }}
								/>
							) : (
								// eslint-disable-next-line @next/next/no-img-element
								<img
									src={value}
									alt="生成结果"
									className="w-full max-h-[512px] object-contain rounded border"
								/>
							)
						) : (
							<div className="flex items-center justify-center rounded border-2 border-dashed text-muted-foreground py-10">
								<div className="flex items-center gap-2">
									<ImagePlus className="h-5 w-5" />
									<span className="text-sm">暂无生成图片</span>
								</div>
							</div>
						)}
					</div>
				</CardContent>
			</Card>
		</div>
	);
}

export default GenerateImages;