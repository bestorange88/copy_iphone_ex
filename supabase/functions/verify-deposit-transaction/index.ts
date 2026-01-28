import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface DepositVerificationRequest {
  txHash: string;
  network: string;
  coinSymbol: string;
  toAddress: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { txHash, network, coinSymbol, toAddress }: DepositVerificationRequest = await req.json();

    console.log('Verifying deposit transaction:', { txHash, network, coinSymbol, toAddress });

    // 根据不同网络调用不同的区块链浏览器 API
    let transactionData;
    
    if (network === 'BTC' || network === 'Bitcoin') {
      // 使用 Blockchain.info API 查询 BTC 交易
      transactionData = await verifyBTCTransaction(txHash, toAddress);
    } else if (network === 'ETH' || network === 'Ethereum' || network === 'ERC20') {
      // 使用 Etherscan API 查询 ETH/ERC20 交易
      transactionData = await verifyETHTransaction(txHash, toAddress, coinSymbol);
    } else if (network === 'TRC20' || network === 'TRON') {
      // 使用 Tronscan API 查询 TRC20 交易
      transactionData = await verifyTRC20Transaction(txHash, toAddress, coinSymbol);
    } else {
      // 其他网络暂不支持自动验证，返回需要人工审核
      return new Response(
        JSON.stringify({
          success: false,
          needsManualReview: true,
          message: `${network} 网络暂不支持自动验证，需要人工审核`,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!transactionData.success) {
      return new Response(
        JSON.stringify({
          success: false,
          error: transactionData.error,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 验证成功，返回交易详情
    return new Response(
      JSON.stringify({
        success: true,
        transaction: {
          amount: transactionData.amount,
          fromAddress: transactionData.fromAddress,
          toAddress: transactionData.toAddress,
          confirmations: transactionData.confirmations,
          timestamp: transactionData.timestamp,
        },
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Error verifying deposit:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error?.message || '验证失败',
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});

async function verifyBTCTransaction(txHash: string, expectedToAddress: string) {
  try {
    // 使用 Blockchain.info API (免费)
    const response = await fetch(`https://blockchain.info/rawtx/${txHash}`);
    
    if (!response.ok) {
      return { success: false, error: '无法查询交易，请检查交易哈希是否正确' };
    }

    const txData = await response.json();
    
    // 查找发送到目标地址的输出
    const output = txData.out.find((out: any) => out.addr === expectedToAddress);
    
    if (!output) {
      return { success: false, error: '交易中未找到指定的充值地址' };
    }

    // BTC 金额单位是 satoshi，需要转换为 BTC
    const amount = output.value / 100000000;
    
    // 获取发送地址（第一个输入地址）
    const fromAddress = txData.inputs[0]?.prev_out?.addr || 'Unknown';

    return {
      success: true,
      amount,
      fromAddress,
      toAddress: expectedToAddress,
      confirmations: 0, // Blockchain.info 不直接提供确认数
      timestamp: new Date(txData.time * 1000).toISOString(),
    };
  } catch (error) {
    console.error('BTC verification error:', error);
    return { success: false, error: 'BTC 交易验证失败' };
  }
}

async function verifyETHTransaction(txHash: string, expectedToAddress: string, coinSymbol: string) {
  try {
    // 注意：这里需要 Etherscan API Key，建议用户在生产环境配置
    // 免费 API 有速率限制
    const apiKey = Deno.env.get('ETHERSCAN_API_KEY') || 'YourApiKeyToken';
    const response = await fetch(
      `https://api.etherscan.io/api?module=proxy&action=eth_getTransactionByHash&txhash=${txHash}&apikey=${apiKey}`
    );

    if (!response.ok) {
      return { success: false, error: '无法查询交易' };
    }

    const data = await response.json();
    const tx = data.result;

    if (!tx) {
      return { success: false, error: '交易不存在或尚未确认' };
    }

    // 验证接收地址
    if (tx.to.toLowerCase() !== expectedToAddress.toLowerCase()) {
      return { success: false, error: '交易接收地址不匹配' };
    }

    // ETH 金额转换 (wei to ETH)
    const amount = parseInt(tx.value, 16) / 1e18;

    // 获取交易确认数
    const receiptResponse = await fetch(
      `https://api.etherscan.io/api?module=proxy&action=eth_getTransactionReceipt&txhash=${txHash}&apikey=${apiKey}`
    );
    const receiptData = await receiptResponse.json();
    const blockNumber = parseInt(receiptData.result?.blockNumber || '0', 16);
    
    // 获取当前区块高度
    const blockResponse = await fetch(
      `https://api.etherscan.io/api?module=proxy&action=eth_blockNumber&apikey=${apiKey}`
    );
    const blockData = await blockResponse.json();
    const currentBlock = parseInt(blockData.result, 16);
    
    const confirmations = currentBlock - blockNumber;

    return {
      success: true,
      amount,
      fromAddress: tx.from,
      toAddress: tx.to,
      confirmations,
      timestamp: new Date().toISOString(), // Etherscan 需要额外查询获取时间戳
    };
  } catch (error) {
    console.error('ETH verification error:', error);
    return { success: false, error: 'ETH 交易验证失败' };
  }
}

async function verifyTRC20Transaction(txHash: string, expectedToAddress: string, coinSymbol: string) {
  try {
    // 使用 Tronscan API (免费)
    const response = await fetch(`https://apilist.tronscan.org/api/transaction-info?hash=${txHash}`);
    
    if (!response.ok) {
      return { success: false, error: '无法查询交易' };
    }

    const txData = await response.json();

    if (!txData || txData.contractRet !== 'SUCCESS') {
      return { success: false, error: '交易不存在或执行失败' };
    }

    // TRC20 转账需要解析合约调用参数
    // 这里简化处理，实际需要根据合约调用详情解析
    const toAddress = txData.toAddress || '';
    
    if (toAddress.toLowerCase() !== expectedToAddress.toLowerCase()) {
      return { success: false, error: '交易接收地址不匹配' };
    }

    // TRX/TRC20 金额转换
    const amount = (txData.amount || 0) / 1e6; // TRX 使用 6 位小数

    return {
      success: true,
      amount,
      fromAddress: txData.ownerAddress || txData.fromAddress,
      toAddress,
      confirmations: txData.confirmed ? 19 : 0,
      timestamp: new Date(txData.timestamp).toISOString(),
    };
  } catch (error) {
    console.error('TRC20 verification error:', error);
    return { success: false, error: 'TRC20 交易验证失败' };
  }
}
