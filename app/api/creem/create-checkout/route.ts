import { createClient } from "@/utils/supabase/server";
import { NextResponse } from "next/server";
import { createCheckoutSession } from "@/app/actions";

export async function POST(request: Request) {
  try {
    // 验证用户身份
    const supabase = await createClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const body = await request.json();
    const { productType, quantity, userId } = body;

    // 验证请求参数
    if (!productType || !quantity || !userId) {
      return new NextResponse("Missing required parameters", { status: 400 });
    }

    // 验证用户 ID 匹配
    if (userId !== user.id) {
      return new NextResponse("User ID mismatch", { status: 403 });
    }

    // 根据产品类型获取产品 ID 和积分数量
    let productId: string;
    let creditsAmount: number;

    if (productType === "mirrordesign_zhifutest") {
      // 使用您账户中的实际产品
      productId = "prod_52XVoVfOZPKXdBYwyPzHHo"; // 您的产品ID
      creditsAmount = quantity; // 1000 积分
    } else {
      return new NextResponse("Invalid product type", { status: 400 });
    }

    // 创建结账会话
    const checkoutUrl = await createCheckoutSession(
      productId,
      user.email!,
      user.id,
      "credits",
      creditsAmount
    );

    return NextResponse.json({ checkoutUrl });
  } catch (error) {
    console.error("Error creating checkout session:", error);

    // 返回更详细的错误信息用于调试
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    return new NextResponse(
      JSON.stringify({
        error: "支付会话创建失败",
        details: errorMessage,
        timestamp: new Date().toISOString(),
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}
