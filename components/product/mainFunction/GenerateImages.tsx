import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useCreateStore } from "@/stores/useCreateStore";
import { Download, ImagePlus, Loader2 } from "lucide-react";

const GenerateImages = () => {
	const { genImgRes, genImgResloading } = useCreateStore();

	const images = Array.isArray(genImgRes) ? (genImgRes as unknown as string[]) : ((genImgRes ? [genImgRes as unknown as string] : []) as string[]);
	console.log("genImgRes", genImgRes)

	function handleDownload(imgValue: string) {
		if (!imgValue) return;
		// 若为原始 SVG 文本，转为 Blob 下载 .svg
		const trimmed = imgValue.trim();
		const isSvgDataUrl = typeof imgValue === "string" && imgValue.startsWith("data:image/svg+xml");
		const isRawSvg = typeof trimmed === "string" && trimmed.startsWith("<svg");
		if (isRawSvg) {
			const blob = new Blob([imgValue], { type: "image/svg+xml;charset=utf-8" });
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
		const isSvg = isSvgDataUrl || imgValue.endsWith(".svg");
		const link = document.createElement("a");
		link.href = imgValue;
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
						{images.length === 1 ? (
							<div className="flex items-center gap-2">
								<Button variant="outline" size="sm" onClick={() => handleDownload(images[0])}>
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
						{images.length > 0 ? (
							<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
								{images.map((img, idx) => {
									const trimmed = typeof img === "string" ? img.trim() : "";
									const isRawSvg = typeof trimmed === "string" && trimmed.startsWith("<svg");
									return (
										<div key={idx} className="relative">
											<div className="absolute top-2 right-2 z-10">
												<Button variant="outline" size="sm" onClick={() => handleDownload(img)}>
													<Download className="h-4 w-4 mr-1.5" /> 下载
												</Button>
											</div>
											{isRawSvg ? (
												<div
													className="w-full max-h-[512px] overflow-auto rounded border bg-white"
													dangerouslySetInnerHTML={{ __html: img }}
												/>
											) : (
												// eslint-disable-next-line @next/next/no-img-element
												<img
													src={img}
													alt={`生成结果 ${idx + 1}`}
													className="w-full max-h-[512px] object-contain rounded border"
												/>
											)}
										</div>
									);
								})}
							</div>
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