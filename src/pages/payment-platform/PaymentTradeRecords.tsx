import React, { useState } from 'react';
import { useLocation } from 'wouter';

const tradeRecords = [
  { id: 1, pair: 'XAU', name: 'London Gold', type: 'buy', result: 'win', period: 30, ytm: 40, profit: 2000, openPrice: 5188.21, closePrice: 5190.81, time: '01/22/2026, 16:36:41', orderId: '202601230036101795' },
  { id: 2, pair: 'XAU', name: 'London Gold', type: 'buy', result: 'win', period: 60, ytm: 50, profit: 2500, openPrice: 5185.50, closePrice: 5190.81, time: '01/22/2026, 16:27:43', orderId: '202601230026424050' },
  { id: 3, pair: 'XAU', name: 'London Gold', type: 'sell', result: 'win', period: 30, ytm: 40, profit: 2000, openPrice: 5192.30, closePrice: 5190.81, time: '01/22/2026, 16:26:06', orderId: '202601230025357630' },
  { id: 4, pair: 'BTC', name: 'Bitcoin', type: 'buy', result: 'lose', period: 60, ytm: 50, profit: -5000, openPrice: 89500.00, closePrice: 89426.83, time: '01/22/2026, 16:20:15', orderId: '202601230020154892' },
  { id: 5, pair: 'ETH', name: 'Ethereum', type: 'buy', result: 'win', period: 90, ytm: 60, profit: 3000, openPrice: 3010.50, closePrice: 3018.86, time: '01/22/2026, 16:15:30', orderId: '202601230015302145' },
  { id: 6, pair: 'XAG', name: 'London Silver', type: 'sell', result: 'win', period: 120, ytm: 70, profit: 3500, openPrice: 114.20, closePrice: 113.52, time: '01/22/2026, 16:10:22', orderId: '202601230010221478' },
  { id: 7, pair: 'CL', name: 'WTI Oil', type: 'buy', result: 'lose', period: 30, ytm: 40, profit: -2000, openPrice: 62.50, closePrice: 62.38, time: '01/22/2026, 16:05:18', orderId: '202601230005184521' },
];

const filters = {
  status: ['全部', '盈利', '虧損', '平局'],
  type: ['全部', '買漲', '買跌'],
  period: ['全部', '30秒', '60秒', '90秒', '120秒', '180秒', '360秒'],
};

export default function PaymentTradeRecords() {
  const [, setLocation] = useLocation();
  const [statusFilter, setStatusFilter] = useState('全部');
  const [typeFilter, setTypeFilter] = useState('全部');
  const [periodFilter, setPeriodFilter] = useState('全部');

  const stats = {
    winRate: 41.79,
    orderCount: tradeRecords.length,
    profit: tradeRecords.filter(r => r.profit > 0).reduce((sum, r) => sum + r.profit, 0),
    loss: Math.abs(tradeRecords.filter(r => r.profit < 0).reduce((sum, r) => sum + r.profit, 0)),
  };

  const winCount = tradeRecords.filter(r => r.result === 'win').length;
  const loseCount = tradeRecords.filter(r => r.result === 'lose').length;
  const tieCount = tradeRecords.filter(r => r.result === 'tie').length;

  const filteredRecords = tradeRecords.filter(record => {
    if (statusFilter !== '全部') {
      const statusMap: Record<string, string> = { '盈利': 'win', '虧損': 'lose', '平局': 'tie' };
      if (record.result !== statusMap[statusFilter]) return false;
    }
    if (typeFilter !== '全部') {
      const typeMap: Record<string, string> = { '買漲': 'buy', '買跌': 'sell' };
      if (record.type !== typeMap[typeFilter]) return false;
    }
    if (periodFilter !== '全部') {
      const periodSec = parseInt(periodFilter);
      if (record.period !== periodSec) return false;
    }
    return true;
  });

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#1a1f3c] to-[#0d1025]">
      <header className="px-4 py-4 flex items-center justify-between">
        <button onClick={() => setLocation('/wallet')} className="text-gray-400">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h3 className="text-white text-xl font-semibold">交易記錄</h3>
        <div className="w-6"></div>
      </header>

      <main className="px-4 pb-8">
        <div className="bg-[#1a2040] rounded-xl p-4 mb-4">
          <h3 className="text-white font-semibold mb-4">一週合約概覽</h3>
          
          <div className="flex items-center justify-center mb-4">
            <div className="relative w-32 h-32">
              <svg viewBox="0 0 100 100" className="w-full h-full transform -rotate-90">
                <circle
                  cx="50"
                  cy="50"
                  r="40"
                  fill="none"
                  stroke="#252a4a"
                  strokeWidth="12"
                />
                <circle
                  cx="50"
                  cy="50"
                  r="40"
                  fill="none"
                  stroke="#22c55e"
                  strokeWidth="12"
                  strokeDasharray={`${(winCount / tradeRecords.length) * 251.2} 251.2`}
                />
                <circle
                  cx="50"
                  cy="50"
                  r="40"
                  fill="none"
                  stroke="#ef4444"
                  strokeWidth="12"
                  strokeDasharray={`${(loseCount / tradeRecords.length) * 251.2} 251.2`}
                  strokeDashoffset={`${-(winCount / tradeRecords.length) * 251.2}`}
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-white text-lg font-bold">{stats.winRate}%</span>
                <span className="text-gray-500 text-xs">勝率</span>
              </div>
            </div>
          </div>

          <div className="flex justify-center gap-6 mb-4">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-green-500"></div>
              <span className="text-gray-400 text-sm">盈利 ({winCount})</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-red-500"></div>
              <span className="text-gray-400 text-sm">虧損 ({loseCount})</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-gray-500"></div>
              <span className="text-gray-400 text-sm">平局 ({tieCount})</span>
            </div>
          </div>

          <div className="grid grid-cols-4 gap-2 text-center">
            <div>
              <div className="text-gray-500 text-xs">勝率</div>
              <div className="text-white font-semibold">{stats.winRate}%</div>
            </div>
            <div>
              <div className="text-gray-500 text-xs">訂單數</div>
              <div className="text-white font-semibold">{stats.orderCount}</div>
            </div>
            <div>
              <div className="text-gray-500 text-xs">盈利</div>
              <div className="text-green-500 font-semibold">{stats.profit.toLocaleString()}</div>
            </div>
            <div>
              <div className="text-gray-500 text-xs">虧損</div>
              <div className="text-red-500 font-semibold">{stats.loss.toLocaleString()}</div>
            </div>
          </div>
        </div>

        <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
          <select 
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-[#252a4a] text-white px-3 py-2 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-[#00d4aa]"
          >
            {filters.status.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <select 
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="bg-[#252a4a] text-white px-3 py-2 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-[#00d4aa]"
          >
            {filters.type.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
          <select 
            value={periodFilter}
            onChange={(e) => setPeriodFilter(e.target.value)}
            className="bg-[#252a4a] text-white px-3 py-2 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-[#00d4aa]"
          >
            {filters.period.map(p => <option key={p} value={p}>{p}</option>)}
          </select>
        </div>

        <div className="space-y-3">
          {filteredRecords.length === 0 ? (
            <div className="bg-[#1a2040] rounded-xl p-8 text-center text-gray-500">
              暫無記錄
            </div>
          ) : (
            filteredRecords.map((record) => (
              <div key={record.id} className="bg-[#1a2040] rounded-xl p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold ${
                      record.pair === 'XAU' ? 'bg-gradient-to-br from-yellow-500 to-orange-500' :
                      record.pair === 'BTC' ? 'bg-gradient-to-br from-orange-500 to-yellow-500' :
                      record.pair === 'ETH' ? 'bg-gradient-to-br from-blue-500 to-purple-500' :
                      record.pair === 'XAG' ? 'bg-gradient-to-br from-gray-400 to-gray-500' :
                      'bg-gradient-to-br from-green-500 to-teal-500'
                    }`}>
                      {record.pair.charAt(0)}
                    </div>
                    <div>
                      <div className="text-white font-medium">{record.name}</div>
                      <div className="flex items-center gap-2">
                        <span className={`text-xs px-2 py-0.5 rounded ${
                          record.result === 'win' ? 'bg-green-500/20 text-green-500' :
                          record.result === 'lose' ? 'bg-red-500/20 text-red-500' :
                          'bg-gray-500/20 text-gray-500'
                        }`}>
                          {record.result === 'win' ? '盈利' : record.result === 'lose' ? '虧損' : '平局'}
                        </span>
                        <span className={`text-xs px-2 py-0.5 rounded ${
                          record.type === 'buy' ? 'bg-green-500/20 text-green-500' : 'bg-red-500/20 text-red-500'
                        }`}>
                          {record.type === 'buy' ? '買漲' : '買跌'}
                        </span>
                        <span className="text-gray-500 text-xs">{record.period}秒</span>
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-gray-500 text-xs">實際收益率</div>
                    <div className={`font-semibold ${record.profit >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                      {record.profit >= 0 ? '+' : ''}{record.ytm}%
                    </div>
                  </div>
                </div>

                <div className="flex justify-between items-center text-sm mb-2">
                  <span className="text-gray-500">盈虧</span>
                  <span className={record.profit >= 0 ? 'text-green-500' : 'text-red-500'}>
                    {record.profit >= 0 ? '+' : ''}{record.profit.toLocaleString()} USDT
                  </span>
                </div>

                <div className="flex justify-between items-center text-sm mb-2">
                  <span className="text-gray-500">開盤價</span>
                  <span className="text-white">{record.openPrice.toLocaleString()}</span>
                </div>

                <div className="flex justify-between items-center text-sm mb-2">
                  <span className="text-gray-500">收盤價</span>
                  <span className="text-white">{record.closePrice.toLocaleString()}</span>
                </div>

                <div className="flex justify-between items-center text-xs text-gray-500 pt-2 border-t border-gray-800">
                  <span>{record.time}</span>
                  <span>訂單號: {record.orderId}</span>
                </div>
              </div>
            ))
          )}
        </div>

        {filteredRecords.length > 0 && (
          <button className="w-full mt-4 py-3 text-[#00d4aa] text-sm">
            加載更多記錄
          </button>
        )}
      </main>
    </div>
  );
}
