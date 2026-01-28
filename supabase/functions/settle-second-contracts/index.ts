import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log("Starting second contract settlement check...");

    // 1) 获取全局控制设置
    const { data: globalConfig, error: globalErr } = await supabase
      .from("system_configs")
      .select("config_value")
      .eq("config_key", "second_contract_global_control")
      .maybeSingle();

    if (globalErr) console.warn("Global config query error:", globalErr);

    const globalControlMode = (globalConfig?.config_value as any)?.mode || "none";
    console.log(`Global control mode: ${globalControlMode}`);

    // 2) 获取用户级别输赢控制设置
    const { data: userControlConfig, error: userCtrlErr } = await supabase
      .from("system_configs")
      .select("config_value")
      .eq("config_key", "second_contract_user_controls")
      .maybeSingle();

    if (userCtrlErr) console.warn("User control config query error:", userCtrlErr);

    const userControlMap: Record<string, string> = (userControlConfig?.config_value as any)?.users || {};
    console.log(`User control map has ${Object.keys(userControlMap).length} users configured`);

    // 3) 获取所有时间合约配置（用于 loss_type）
    const { data: timeContractConfigs, error: cfgErr } = await supabase
      .from("time_contract_configs")
      .select("duration_minutes, loss_type");

    if (cfgErr) console.warn("time_contract_configs query error:", cfgErr);

    // duration_minutes -> loss_type 映射
    const lossTypeMap: Record<number, string> = {};
    if (timeContractConfigs) {
      for (const config of timeContractConfigs as any[]) {
        lossTypeMap[config.duration_minutes] = config.loss_type || "rate";
      }
    }
    console.log("Loss type map:", lossTypeMap);

    // 3) 查询所有待结算且已到期的订单
    const now = new Date().toISOString();
    const { data: pendingOrders, error: queryError } = await supabase
      .from("second_contract_orders")
      .select("*")
      .eq("status", "pending")
      .lte("settlement_time", now);

    if (queryError) {
      console.error("Error querying orders:", queryError);
      throw queryError;
    }

    console.log(`Found ${pendingOrders?.length || 0} orders to settle`);

    let settledCount = 0;
    let errorCount = 0;

    // 4) 结算每个订单
    for (const order of pendingOrders || []) {
      try {
        let finalResult: "win" | "lose";
        let finalPrice = order.entry_price;
        let profit = 0;

        // 优先级：订单单独控制 > 用户级别控制 > 全局控制 > 真实市场价格
        let effectiveControl = order.admin_result;
        if (!effectiveControl || effectiveControl === "real") {
          // 检查用户级别控制
          const userControl = userControlMap[order.user_id];
          if (userControl && userControl !== "none") {
            effectiveControl = userControl;
            console.log(`Order ${order.id} using user-level control: ${userControl} for user ${order.user_id}`);
          } else if (globalControlMode !== "none") {
            effectiveControl = globalControlMode;
          } else {
            effectiveControl = "real";
          }
        }

        const lossType = lossTypeMap[order.duration_minutes] || "rate";

        if (effectiveControl === "win") {
          finalResult = "win";
          profit = Number(order.amount) * order.yield_rate;
          finalPrice = order.direction === "up"
            ? order.entry_price + 50
            : order.entry_price - 50;
          console.log(
            `Order ${order.id} set to WIN by ${order.admin_result ? "individual" : "global"} control`,
          );
        } else if (effectiveControl === "lose") {
          finalResult = "lose";
          // 根据 loss_type 决定亏损计算方式
          profit = lossType === "full"
            ? -Number(order.amount)
            : -Number(order.amount) * order.yield_rate;

          finalPrice = order.direction === "up"
            ? order.entry_price - 50
            : order.entry_price + 50;

          console.log(
            `Order ${order.id} set to LOSE by ${order.admin_result ? "individual" : "global"} control, loss_type: ${lossType}`,
          );
        } else {
          // real：多源取价 -> 中位数
          try {
            const prices = await Promise.allSettled([
              fetch(`https://www.okx.com/api/v5/market/ticker?instId=${order.symbol}`)
                .then((res) => res.json())
                .then((data) =>
                  data.code === "0" && data.data?.[0] ? parseFloat(data.data[0].last) : null
                ),
              fetch(
                `https://api.huobi.pro/market/detail/merged?symbol=${order.symbol.toLowerCase().replace("-", "")}`,
              )
                .then((res) => res.json())
                .then((data) => (data.status === "ok" && data.tick ? data.tick.close : null)),
              fetch(
                `https://api.binance.com/api/v3/ticker/price?symbol=${order.symbol.replace("-", "")}`,
              )
                .then((res) => res.json())
                .then((data) => (data.price ? parseFloat(data.price) : null)),
            ]);

            const validPrices = prices
              .filter((p) => p.status === "fulfilled" && p.value !== null)
              .map((p) => (p as PromiseFulfilledResult<number>).value);

            console.log(
              `Retrieved ${validPrices.length} valid prices for ${order.symbol}:`,
              validPrices,
            );

            if (validPrices.length < 2) {
              console.error(
                `Insufficient price sources for order ${order.id}. Got ${validPrices.length}, need at least 2. Skipping settlement.`,
              );

              await supabase.from("audit_logs").insert({
                user_id: order.user_id,
                action: "contract_settlement_failed",
                resource_type: "second_contract_order",
                resource_id: order.id,
                details: {
                  reason: "insufficient_price_sources",
                  sources_available: validPrices.length,
                  symbol: order.symbol,
                },
              });

              errorCount++;
              continue;
            }

            validPrices.sort((a, b) => a - b);
            const mid = Math.floor(validPrices.length / 2);
            finalPrice = validPrices.length % 2 === 0
              ? (validPrices[mid - 1] + validPrices[mid]) / 2
              : validPrices[mid];

            const deviation = Math.abs(finalPrice - order.entry_price) / order.entry_price;
            if (deviation > 0.1) {
              console.warn(
                `Large price deviation detected for order ${order.id}: ${(deviation * 100).toFixed(2)}%`,
              );

              await supabase.from("audit_logs").insert({
                user_id: order.user_id,
                action: "contract_settlement_deviation_alert",
                resource_type: "second_contract_order",
                resource_id: order.id,
                details: {
                  entry_price: order.entry_price,
                  settlement_price: finalPrice,
                  deviation_percent: deviation * 100,
                  price_sources: validPrices,
                },
              });
            }

            console.log(
              `Using median price ${finalPrice} from ${validPrices.length} sources for ${order.symbol}`,
            );
          } catch (priceError) {
            console.error("Error fetching real price:", priceError);
            console.error(`Failed to fetch prices for order ${order.id}. Skipping settlement.`);

            await supabase.from("audit_logs").insert({
              user_id: order.user_id,
              action: "contract_settlement_failed",
              resource_type: "second_contract_order",
              resource_id: order.id,
              details: {
                reason: "price_fetch_error",
                error: priceError instanceof Error ? priceError.message : String(priceError),
                symbol: order.symbol,
              },
            });

            errorCount++;
            continue;
          }

          const isWin = (order.direction === "up" && finalPrice > order.entry_price) ||
            (order.direction === "down" && finalPrice < order.entry_price);

          finalResult = isWin ? "win" : "lose";

          if (isWin) {
            profit = Number(order.amount) * order.yield_rate;
          } else {
            profit = lossType === "full"
              ? -Number(order.amount)
              : -Number(order.amount) * order.yield_rate;
          }

          console.log(
            `Order ${order.id} settled by REAL market price: ${finalPrice}, loss_type: ${lossType}`,
          );
        }

        // 5) 更新订单状态
        const { error: updateOrderError } = await supabase
          .from("second_contract_orders")
          .update({
            status: "settled",
            result: finalResult,
            final_price: finalPrice,
            profit,
            settled_at: new Date().toISOString(),
          })
          .eq("id", order.id);

        if (updateOrderError) {
          console.error(`Error updating order ${order.id}:`, updateOrderError);
          errorCount++;
          continue;
        }

        // 6) 更新用户余额（统一账户：使用现货账户 spot）
        const { data: existingBalance, error: balFetchErr } = await supabase
          .from("user_balances")
          .select("*")
          .eq("user_id", order.user_id)
          .eq("currency", "USDT")
          .eq("account_type", "spot")
          .maybeSingle();

        if (balFetchErr) console.warn(`Balance fetch error for user ${order.user_id}:`, balFetchErr);

        if (existingBalance) {
          const totalReturn = Number(order.amount) + profit; // profit 可能为负
          const newAvailable = Number(existingBalance.available) + totalReturn;
          const newFrozen = Math.max(0, Number(existingBalance.frozen) - Number(order.amount));
          const newUsdValue = newAvailable + newFrozen;

          const { error: balanceError } = await supabase
            .from("user_balances")
            .update({
              available: newAvailable,
              frozen: newFrozen,
              usd_value: newUsdValue,
              updated_at: new Date().toISOString(),
            })
            .eq("id", existingBalance.id);

          if (balanceError) {
            console.error(`Error updating balance for order ${order.id}:`, balanceError);
            errorCount++;
            continue;
          }

          console.log(
            `Balance updated for user ${order.user_id}: available=${newAvailable}, frozen=${newFrozen}`,
          );
        } else {
          // 理论上不该发生：下单时应已创建余额
          const totalReturn = Number(order.amount) + profit;
          const { error: balanceError } = await supabase
            .from("user_balances")
            .insert({
              user_id: order.user_id,
              currency: "USDT",
              account_type: "spot",
              available: totalReturn,
              frozen: 0,
              usd_value: totalReturn,
            });

          if (balanceError) {
            console.error(`Error creating balance for order ${order.id}:`, balanceError);
            errorCount++;
            continue;
          }
        }

                // 7) 审计日志
                await supabase.from("audit_logs").insert({
                  user_id: order.user_id,
                  action: "contract_auto_settled",
                  resource_type: "second_contract_order",
                  resource_id: order.id,
                  details: {
                    symbol: order.symbol,
                    direction: order.direction,
                    amount: order.amount,
                    entry_price: order.entry_price,
                    final_price: finalPrice,
                    result: finalResult,
                    profit,
                    admin_result: order.admin_result,
                    global_control_used: globalControlMode !== "none" ? globalControlMode : null,
                    loss_type: lossType,
                    effective_control: effectiveControl,
                  },
                });

        // 8) 发送系统消息通知用户
        const isWinResult = finalResult === "win";
        const messageType = isWinResult ? "contract_win" : "contract_lose";
        const messageTitle = isWinResult ? "合約交易盈利" : "合約交易虧損";
        const messageContent = isWinResult
          ? `您的 ${order.symbol} 合約訂單已結算，盈利 ${profit.toFixed(2)} USDT`
          : `您的 ${order.symbol} 合約訂單已結算，虧損 ${Math.abs(profit).toFixed(2)} USDT`;

        await supabase.from("system_messages").insert({
          user_id: order.user_id,
          type: messageType,
          title: messageTitle,
          content: messageContent,
          is_read: false,
          details: {
            symbol: order.symbol,
            amount: order.amount,
            profit,
            isWin: isWinResult,
            order_id: order.id,
          },
        });

        settledCount++;
        console.log(`Settled order ${order.id}: ${finalResult}, profit: ${profit}`);
      } catch (orderError) {
        console.error(`Error processing order ${order.id}:`, orderError);
        errorCount++;
      }
    }

    return json(
      {
        success: true,
        message: `Settled ${settledCount} orders, ${errorCount} errors`,
        settledCount,
        errorCount,
      },
      200,
    );
  } catch (error: any) {
    console.error("Error in settlement function:", error);
    return json(
      { success: false, error: error?.message || "结算失败" },
      500,
    );
  }
});
