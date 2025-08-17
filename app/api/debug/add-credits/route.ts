import { createClient } from "@/utils/supabase/server";
import {
  addCreditsToCustomer,
  createOrUpdateCustomer,
} from "@/utils/supabase/subscriptions";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    // 获取当前用户
    const supabase = await createClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const body = await request.json();
    const {
      credits = 1000,
      description = "Manual credit addition for debugging",
    } = body;

    // 创建或获取客户记录
    const mockCreemCustomer = {
      id: `mock_${user.id}`,
      email: user.email!,
      name: user.email!,
      country: "US",
    };

    const customerId = await createOrUpdateCustomer(mockCreemCustomer, user.id);

    // 添加积分
    const newCredits = await addCreditsToCustomer(
      customerId,
      credits,
      `debug_order_${Date.now()}`,
      description
    );

    return NextResponse.json({
      success: true,
      message: `Successfully added ${credits} credits`,
      new_total: newCredits,
      customer_id: customerId,
      user_id: user.id,
      user_email: user.email,
    });
  } catch (error) {
    console.error("Add credits error:", error);
    return NextResponse.json(
      {
        error: "Failed to add credits",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
