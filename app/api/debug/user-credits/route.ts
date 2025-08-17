import { createClient } from "@/utils/supabase/server";
import { createServiceRoleClient } from "@/utils/supabase/service-role";
import { NextResponse } from "next/server";

export async function GET() {
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

    // 使用服务角色客户端查询详细信息
    const serviceClient = createServiceRoleClient();

    // 查询客户记录
    const { data: customer, error: customerError } = await serviceClient
      .from("customers")
      .select("*")
      .eq("user_id", user.id)
      .single();

    // 查询积分历史
    const { data: creditsHistory, error: historyError } = await serviceClient
      .from("credits_history")
      .select("*")
      .eq("customer_id", customer?.id || "")
      .order("created_at", { ascending: false });

    // 查询订阅信息
    const { data: subscriptions, error: subError } = await serviceClient
      .from("subscriptions")
      .select("*")
      .eq("customer_id", customer?.id || "");

    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
      },
      customer: customer || null,
      customerError: customerError?.message || null,
      credits_history: creditsHistory || [],
      historyError: historyError?.message || null,
      subscriptions: subscriptions || [],
      subError: subError?.message || null,
      debug_info: {
        timestamp: new Date().toISOString(),
        customer_exists: !!customer,
        credits_count: creditsHistory?.length || 0,
        current_credits: customer?.credits || 0,
      },
    });
  } catch (error) {
    console.error("Debug API Error:", error);
    return NextResponse.json(
      {
        error: "Debug failed",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
