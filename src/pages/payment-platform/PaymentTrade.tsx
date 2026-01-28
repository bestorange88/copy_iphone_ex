import React, { useState } from 'react';
import { useLocation } from 'wouter';
import PaymentNavBar from './components/PaymentNavBar';

const tradingPairs = [
  { id: 1, name: 'London Gold', symbol: 'XAU', price: 5190.81, change: 2.07, high: 5201.73, low: 5076.52 },
  { id: 2, name: 'London Silver', symbol: 'XAG', price: 113.66, change: 5.16, high: 115.20, low: 108.10 },
  { id: 3, name: 'WTI Oil', symbol: 'CL', price: 62.438, change: 1.34, high: 63.50, low: 61.20 },
  { id: 4, name: 'Bitcoin', symbol: 'BTC', price: 89426.83, change: 1.32, high: 90500, low: 87800 },
];

const periods = [
  { seconds: 360, ytm: 90 },
  { seconds: 180, ytm: 80 },
  { seconds: 120, ytm: 70 },
  { seconds: 90, ytm: 60 },
  { seconds: 60, ytm: 50 },
  { seconds: 30, ytm: 40 },
];

const quickAmounts = [500, 1000, 2000, 5000, 10000];

export default function PaymentTrade() {
  const [, setLocation] = useLocation();
  const [selectedPair, setSelectedPair] = useState(tradingPairs[0]);
  const [showPairSelector, setShowPairSelector] = useState(false);
  const [showTradeModal, setShowTradeModal] = useState(false);
  const [tradeType, setTradeType] = useState<'buy' | 'sell'>('buy');
  const [selectedPeriod, setSelectedPeriod] = useState(periods[0]);
  const [amount, setAmount] = useState('');
  const [isFavorite, setIsFavorite] = useState(false);

  const balance = 4552025.50;

  const handleTrade = () => {
    if (!amount || parseFloat(amount) <= 0) {
      alert('Please enter investment amount');
      return;
    }
    alert(`${tradeType === 'buy' ? 'Buy' : 'Sell'} order placed: ${amount} USDT for ${selectedPeriod.seconds} seconds`);
    setShowTradeModal(false);
    setAmount('');
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#1a1f3c] to-[#0d1025] pb-20">
      <header className="px-4 py-3 flex justify-between items-center">
        <button 
          onClick={() => setLocation('/trade-records')}
          className="text-gray-400 text-sm"
        >
          交易記錄
        </button>
        <button 
          onClick={() => setShowPairSelector(true)}
          className="flex items-center gap-2 text-white"
        >
          <span className="font-semibold">{selectedPair.name}</span>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
        <button 
          onClick={() => setIsFavorite(!isFavorite)}
          className={isFavorite ? 'text-yellow-500' : 'text-gray-500'}
        >
          <svg className="w-6 h-6" fill={isFavorite ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
          </svg>
        </button>
      </header>

      <div className="px-4">
        <div className="bg-[#1a2040] rounded-xl p-4 mb-4">
          <div className="flex items-center gap-3 mb-4">
            <img 
              src={`/uploads/20250717/676d9c325102c0f69aa65aeb3ccfa.png`}
              alt={selectedPair.name}
              className="w-10 h-10 rounded-full"
              onError={(e) => {
                (e.target as HTMLImageElement).src = `https://placehold.co/40x40/1a1f3c/00d4aa?text=${selectedPair.symbol.charAt(0)}`;
              }}
            />
            <div>
              <h3 className="text-white font-semibold">{selectedPair.name}</h3>
              <span className="text-gray-500 text-sm">{selectedPair.symbol}</span>
            </div>
            <div className="ml-auto flex gap-2">
              <button className="bg-[#252a4a] text-gray-400 px-3 py-1 rounded text-sm">分時</button>
              <button className="bg-[#252a4a] text-gray-400 px-3 py-1 rounded text-sm">24小時</button>
              <button className="bg-[#00d4aa] text-white px-3 py-1 rounded text-sm">更多</button>
            </div>
          </div>

          <div className="flex justify-between items-start mb-4 bg-gradient-to-r from-[#2a2a5a] to-[#3a3a6a] rounded-lg p-3">
            <div>
              <div className="text-gray-500 text-sm">最新價格</div>
              <div className="text-2xl font-bold text-white">{selectedPair.price.toLocaleString()}</div>
              <div className={`text-sm ${selectedPair.change >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                24小時漲跌幅 {selectedPair.change >= 0 ? '+' : ''}{selectedPair.change}%
              </div>
            </div>
            <div className="text-right text-sm">
              <div className="text-gray-500">24小時最高價 <span className="text-white">{selectedPair.high.toLocaleString()}</span></div>
              <div className="text-gray-500">24小時最低價 <span className="text-white">{selectedPair.low.toLocaleString()}</span></div>
              <div className="text-gray-500">24小時成交量 <span className="text-white">-</span></div>
              <div className="text-gray-500">24小時成交額 <span className="text-white">-</span></div>
            </div>
          </div>
        </div>

        <div className="bg-[#1a2040] rounded-xl p-4 mb-4 h-64 flex items-center justify-center">
          <div className="text-center">
            <img 
              src="https://www.saxowdaer.top/base/whitelogo-B8chil.png"
              alt="Chart"
              className="w-32 h-32 mx-auto opacity-30"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = 'none';
              }}
            />
            <p className="text-gray-500 mt-4">K-Line Chart Area</p>
            <p className="text-gray-600 text-sm">Real-time trading chart will be displayed here</p>
          </div>
        </div>

        {/* Floating Buy/Sell Buttons - Mobile Style */}
        <div className="fixed right-4 bottom-24 flex flex-col gap-3 z-40">
          <button 
            onClick={() => {
              setTradeType('buy');
              setShowTradeModal(true);
            }}
            className="w-16 h-16 bg-gradient-to-br from-green-500 to-green-600 text-white rounded-2xl flex flex-col items-center justify-center shadow-lg hover:opacity-90 transition-opacity"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
            </svg>
            <span className="text-xs font-medium">買漲</span>
          </button>
          <button 
            onClick={() => {
              setTradeType('sell');
              setShowTradeModal(true);
            }}
            className="w-16 h-16 bg-gradient-to-br from-red-500 to-red-600 text-white rounded-2xl flex flex-col items-center justify-center shadow-lg hover:opacity-90 transition-opacity"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
            </svg>
            <span className="text-xs font-medium">買跌</span>
          </button>
        </div>
      </div>

      {showPairSelector && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end">
          <div className="bg-[#1a2040] w-full rounded-t-2xl p-4 max-h-[70vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-white font-semibold">Select Trading Pair</h3>
              <button onClick={() => setShowPairSelector(false)} className="text-gray-500">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            {tradingPairs.map((pair) => (
              <button
                key={pair.id}
                onClick={() => {
                  setSelectedPair(pair);
                  setShowPairSelector(false);
                }}
                className={`w-full flex items-center justify-between p-3 rounded-lg mb-2 ${
                  selectedPair.id === pair.id ? 'bg-[#00d4aa]/20 border border-[#00d4aa]' : 'bg-[#252a4a]'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-gradient-to-br from-yellow-500 to-orange-500 rounded-full flex items-center justify-center text-white font-bold text-sm">
                    {pair.symbol.charAt(0)}
                  </div>
                  <div className="text-left">
                    <div className="text-white font-medium">{pair.name}</div>
                    <div className="text-gray-500 text-sm">{pair.symbol}</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-white">${pair.price.toLocaleString()}</div>
                  <div className={pair.change >= 0 ? 'text-green-500 text-sm' : 'text-red-500 text-sm'}>
                    {pair.change >= 0 ? '+' : ''}{pair.change}%
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {showTradeModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end">
          <div className="bg-[#1a2040] w-full rounded-t-2xl p-4">
            <div className="h-1 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 rounded-full mb-4"></div>
            
            <div className="flex justify-between items-center mb-4">
              <div className="flex items-center gap-2">
                <span className={`px-3 py-1 rounded border ${tradeType === 'buy' ? 'text-green-500 border-green-500' : 'text-red-500 border-red-500'}`}>
                  {tradeType === 'buy' ? '買漲' : '買跌'} · {selectedPair.name}({selectedPair.symbol})
                </span>
                <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                </svg>
              </div>
              <div className="text-[#00d4aa] font-semibold">{selectedPair.price.toLocaleString()}</div>
            </div>

            <div className="mb-4">
              <label className="text-gray-400 text-sm mb-2 block">期限</label>
              <div className="grid grid-cols-3 gap-2">
                {periods.map((period) => (
                  <button
                    key={period.seconds}
                    onClick={() => setSelectedPeriod(period)}
                    className={`p-3 rounded-lg text-center ${
                      selectedPeriod.seconds === period.seconds
                        ? 'bg-[#00d4aa]/20 border border-[#00d4aa]'
                        : 'bg-[#252a4a]'
                    }`}
                  >
                    <div className="flex items-center justify-center gap-1 text-white">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      {period.seconds}秒
                    </div>
                    <div className="text-gray-500 text-xs mt-1">到期收益率</div>
                    <div className="text-red-500 font-semibold">{period.ytm}.00%</div>
                  </button>
                ))}
              </div>
            </div>

            <div className="mb-4">
              <label className="text-gray-400 text-sm mb-2 block">投資金額</label>
              <div className="flex items-center bg-[#252a4a] rounded-lg">
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="投資金額 (USDT)"
                  className="flex-1 bg-transparent px-4 py-3 text-white placeholder-gray-500 focus:outline-none"
                />
                <button 
                  onClick={() => setAmount(balance.toString())}
                  className="text-[#00d4aa] px-4"
                >
                  全部
                </button>
              </div>
            </div>

            <div className="flex gap-2 mb-6">
              {quickAmounts.map((amt) => (
                <button
                  key={amt}
                  onClick={() => setAmount(amt.toString())}
                  className="flex-1 bg-[#252a4a] text-gray-400 py-2 rounded text-sm hover:bg-[#3a4070] transition-colors"
                >
                  {amt.toLocaleString()}
                </button>
              ))}
            </div>

            <button
              onClick={handleTrade}
              className="w-full py-4 rounded-xl font-semibold flex items-center justify-center gap-2 bg-gradient-to-r from-cyan-500 to-blue-500 text-white"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
              </svg>
              立即交易
            </button>

            <button
              onClick={() => setLocation('/market')}
              className="w-full py-4 rounded-xl font-semibold flex items-center justify-center gap-2 mt-2 bg-[#252a4a] text-white"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
              </svg>
              市場
            </button>

            <div className="text-center text-gray-500 text-sm mt-4">
              可用餘額: {balance.toLocaleString()} USDT
            </div>

            <button 
              onClick={() => setShowTradeModal(false)}
              className="absolute top-4 right-4 text-gray-500"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}

      <PaymentNavBar active="trade" />
    </div>
  );
}
