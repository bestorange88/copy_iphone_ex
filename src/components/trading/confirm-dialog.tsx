

import type { OrderData } from "./trade-order"

interface ConfirmDialogProps {
  order: OrderData
  onCancel: () => void
  onConfirm: () => void
}

export function ConfirmDialog({ order, onCancel, onConfirm }: ConfirmDialogProps) {
  const expectedProfit = (order.amount * order.returnRate) / 100

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60" onClick={onCancel} onKeyDown={() => {}} />
      
      {/* Dialog */}
      <div className="relative bg-white rounded-2xl w-[90%] max-w-[340px] overflow-hidden">
        {/* Header */}
        <div className="px-6 py-5 text-center">
          <h2 className="text-xl font-bold text-gray-900">確認訂單</h2>
        </div>

        {/* Content */}
        <div className="px-6 pb-4 space-y-4">
          {/* Order Type */}
          <div className="flex items-center justify-between">
            <span className="text-gray-500">訂單類型</span>
            <span className="px-3 py-1 rounded-full border border-[#f97316]/50 text-[#f97316] text-sm">
              買漲 · {order.product}
            </span>
          </div>

          {/* Amount */}
          <div className="flex items-center justify-between">
            <span className="text-gray-500">訂單金額</span>
            <span className="text-[#f97316] font-semibold">{order.amount.toLocaleString()}.00 USDT</span>
          </div>

          {/* Duration */}
          <div className="flex items-center justify-between">
            <span className="text-gray-500">合約期限</span>
            <span className="text-gray-900">{order.duration} 秒</span>
          </div>

          {/* Expected Return Rate */}
          <div className="flex items-center justify-between">
            <span className="text-gray-500">預期收益</span>
            <span className="text-gray-900">{order.returnRate.toFixed(2)}%</span>
          </div>

          {/* Expected Profit */}
          <div className="flex items-center justify-between">
            <span className="text-gray-500">預期收益率</span>
            <span className="text-[#f97316] font-semibold">{expectedProfit.toFixed(2)} USDT</span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex border-t border-gray-200">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 py-4 text-gray-900 font-medium text-center hover:bg-gray-50 transition-colors"
          >
            取消
          </button>
          <div className="w-px bg-gray-200" />
          <button
            type="button"
            onClick={onConfirm}
            className="flex-1 py-4 text-[#f97316] font-medium text-center hover:bg-orange-50 transition-colors"
          >
            確認
          </button>
        </div>
      </div>
    </div>
  )
}
