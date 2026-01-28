import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import PaymentNavBar from './components/PaymentNavBar';

const assets = [
  { id: 1, symbol: 'USDT', name: 'Tether USD', balance: 4552025.50, value: 4552025.50, icon: '/uploads/20250618/1de5a530efde23352a4508c1c9eef.png' },
  { id: 2, symbol: 'BTC', name: 'Bitcoin', balance: 0, value: 0, icon: '/uploads/20250618/f98ae7d53c3a9416849987953d958.png' },
  { id: 3, symbol: 'ETH', name: 'Ethereum', balance: 0, value: 0, icon: '/uploads/20250618/e5e10544329b54ac4f31b2f2d7adf.png' },
  { id: 4, symbol: 'DOGE', name: 'Dogecoin', balance: 0, value: 0, icon: '/uploads/20250618/d64ee06715b458079829d3c452a03.png' },
  { id: 5, symbol: 'ADA', name: 'Cardano', balance: 0, value: 0, icon: '/uploads/20250618/55f45ce48d644f690da9506a165a0.png' },
  { id: 6, symbol: 'SOL', name: 'Solana', balance: 0, value: 0, icon: '/uploads/20250618/5e22a9302a4383454bfe530f0ddff.png' },
  { id: 7, symbol: 'XRP', name: 'Ripple', balance: 0, value: 0, icon: '/uploads/20250618/92f9d15be55070c0f267e7b960921.png' },
  { id: 8, symbol: 'BNB', name: 'Binance Coin', balance: 0, value: 0, icon: '/uploads/20250618/cb84d3ca48a52e3df1025731a8bef.png' },
];

const recentTransactions = [
  { id: 1, type: 'settlement', amount: 7000, date: '01/22/2026, 16:36:41', orderId: '202601230036101795', balance: 4552025.50 },
  { id: 2, type: 'trade', amount: -5000, date: '01/22/2026, 16:36:10', orderId: '202601230036101795', balance: 4545025.50 },
  { id: 3, type: 'settlement', amount: 7500, date: '01/22/2026, 16:27:43', orderId: '202601230026424050', balance: 4550025.50 },
  { id: 4, type: 'trade', amount: -5000, date: '01/22/2026, 16:26:42', orderId: '202601230026424050', balance: 4542525.50 },
  { id: 5, type: 'settlement', amount: 7000, date: '01/22/2026, 16:26:06', orderId: '202601230025357630', balance: 4547525.50 },
];

export default function PaymentWallet() {
  const navigate = useNavigate();
  const [showBalance, setShowBalance] = useState(true);
  const [hideLowBalance, setHideLowBalance] = useState(false);

  const totalBalance = assets.reduce((sum, asset) => sum + asset.value, 0);
  const todayProfit = 0;
  const locking = 0;

  const filteredAssets = hideLowBalance 
    ? assets.filter(asset => asset.balance > 0)
    : assets;

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#1a1f3c] to-[#0d1025] pb-20">
      <header className="px-4 py-4">
        <h3 className="text-white text-xl font-semibold text-center">錢包</h3>
      </header>

      <div className="px-4">
        <p className="text-gray-400 text-sm text-center mb-4">
          SAXO資產管理專家，財富由您而定
        </p>

        <div className="bg-gradient-to-r from-[#1a2a4a] to-[#2a3a5a] rounded-xl p-4 mb-4">
          <div className="flex justify-between items-center mb-2">
            <h2 className="text-gray-400 text-sm">總資產 (USDT)</h2>
            <button 
              onClick={() => setShowBalance(!showBalance)}
              className="text-gray-400"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                {showBalance ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                )}
              </svg>
            </button>
          </div>

          <div className="h-16 mb-4">
            <svg viewBox="0 0 200 50" className="w-full h-full">
              <polyline
                fill="none"
                stroke="#00d4aa"
                strokeWidth="2"
                points="0,40 20,35 40,38 60,30 80,32 100,25 120,28 140,20 160,22 180,15 200,18"
              />
            </svg>
          </div>

          <div className="flex items-baseline gap-2 mb-2">
            <p className="text-2xl font-bold text-white">
              {showBalance ? totalBalance.toLocaleString(undefined, { minimumFractionDigits: 2 }) : '*******'}
            </p>
            <span className="text-gray-400 text-sm">USDT</span>
            <span className="text-red-500 text-sm flex items-center gap-1">
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
              </svg>
              0.00%
            </span>
          </div>

          <div className="flex justify-between text-sm">
            <div>
              <span className="text-gray-500">今日收益 </span>
              <span className="text-[#00d4aa]">{todayProfit.toFixed(2)}</span>
              <span className="text-gray-500"> USDT</span>
            </div>
            <div>
              <span className="text-gray-500">鎖定中 </span>
              <span className="text-white">{locking.toFixed(2)}</span>
              <span className="text-gray-500"> USDT</span>
            </div>
          </div>
        </div>

        <div className="flex gap-3 mb-6">
          <button 
            onClick={() => navigate('/deposit')}
            className="flex-1 bg-[#00d4aa] text-white py-3 rounded-xl flex items-center justify-center gap-2 hover:bg-[#00b894] transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
            </svg>
            入款
          </button>
          <button 
            onClick={() => navigate('/withdraw')}
            className="flex-1 bg-gradient-to-r from-red-500 to-pink-500 text-white py-3 rounded-xl flex items-center justify-center gap-2 hover:opacity-90 transition-opacity"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
            </svg>
            取款
          </button>
          <button 
            onClick={() => navigate('/trade-records')}
            className="flex-1 bg-[#252a4a] text-white py-3 rounded-xl flex items-center justify-center gap-2 hover:bg-[#3a4070] transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            明細
          </button>
        </div>

        <div className="mb-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-white font-semibold">我的資產</h2>
            <button 
              onClick={() => setHideLowBalance(!hideLowBalance)}
              className="flex items-center gap-2 text-gray-400 text-sm"
            >
              <svg className={`w-4 h-4 ${hideLowBalance ? 'text-[#00d4aa]' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                {hideLowBalance ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                )}
              </svg>
              隱藏低餘額貨幣
            </button>
          </div>

          {/* Asset Distribution Pie Chart */}
          <div className="bg-[#1a2040] rounded-xl p-4 mb-4">
            <div className="flex items-center justify-center">
              <div className="relative w-32 h-32">
                <svg viewBox="0 0 100 100" className="w-full h-full transform -rotate-90">
                  <circle
                    cx="50"
                    cy="50"
                    r="40"
                    fill="none"
                    stroke="#4a90d9"
                    strokeWidth="20"
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-white text-xs">USDT</span>
                </div>
              </div>
            </div>
            <div className="flex items-center justify-end mt-2 gap-2">
              <span className="text-gray-400 text-sm">USDT</span>
              <div className="w-4 h-4 bg-blue-500 rounded"></div>
            </div>
          </div>

          <div className="bg-[#1a2040] rounded-xl overflow-hidden">
            {filteredAssets.length === 0 ? (
              <div className="text-center py-8 text-gray-500">No data</div>
            ) : (
              <div className="divide-y divide-gray-800">
                {filteredAssets.map((asset) => (
                  <div key={asset.id} className="flex items-center justify-between p-4">
                    <div className="flex items-center gap-3">
                      <img 
                        src={asset.icon} 
                        alt={asset.symbol} 
                        className="w-10 h-10 rounded-full"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = `https://placehold.co/40x40/1a1f3c/00d4aa?text=${asset.symbol.charAt(0)}`;
                        }}
                      />
                      <div>
                        <div className="text-white font-medium">{asset.symbol}</div>
                        <div className="text-gray-500 text-sm">{asset.name}</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-white">{asset.balance.toFixed(8)}</div>
                      <div className="text-gray-500 text-sm">≈ {asset.value.toFixed(2)}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="mb-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-white font-semibold">最近交易</h2>
            <button 
              onClick={() => navigate('/trade-records')}
              className="flex items-center gap-1 text-gray-400 text-sm"
            >
              更多
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>

          <div className="bg-[#1a2040] rounded-xl overflow-hidden">
            {recentTransactions.length === 0 ? (
              <div className="text-center py-8 text-gray-500">暫無數據</div>
            ) : (
              <div className="divide-y divide-gray-800">
                {recentTransactions.map((tx) => (
                  <div key={tx.id} className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-3">
                        <img 
                          src="/uploads/20250618/1de5a530efde23352a4508c1c9eef.png" 
                          alt="USDT" 
                          className="w-8 h-8 rounded-full"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = 'https://placehold.co/32x32/1a1f3c/00d4aa?text=U';
                          }}
                        />
                        <div>
                          <div className={`font-medium ${tx.amount >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                            {tx.amount >= 0 ? '+' : ''}{tx.amount.toFixed(8)}
                          </div>
                          <div className="text-gray-500 text-xs">{tx.date}</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-gray-400 text-sm">USDT {tx.balance.toFixed(8)}</div>
                      </div>
                    </div>
                    <div className="text-gray-500 text-xs">
                      {tx.type === 'settlement' ? 'Order settlement: ' : 'Trade '}{tx.orderId}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <PaymentNavBar />
    </div>
  );
}
