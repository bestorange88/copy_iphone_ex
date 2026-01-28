import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import PaymentNavBar from './components/PaymentNavBar';

const allMarketData = [
  { id: 1, name: 'London Gold', symbol: 'XAU', price: '5,190.08', change: '+2.06%', category: 'cfd', icon: '/uploads/20250717/676d9c325102c0f69aa65aeb3ccfa.png' },
  { id: 2, name: 'London Silver', symbol: 'XAG', price: '113.52', change: '+5.03%', category: 'cfd', icon: '/uploads/20250718/e2c28bd2dd44b4da3299699df97d3.png' },
  { id: 3, name: 'WTI Oil', symbol: 'CL', price: '62.436', change: '+1.34%', category: 'cfd', icon: '/uploads/20250718/cc6047bdc0f293b45bc4b8693b7e1.png' },
  { id: 4, name: 'COMEX Copper', symbol: 'HG', price: '592.661', change: '+1.27%', category: 'cfd', icon: '/uploads/20250718/3712605e266b2e8325d840c2ffb65.png' },
  { id: 5, name: 'Natural Gas Futures', symbol: 'NG', price: '3.787', change: '+2.58%', category: 'cfd', icon: '/uploads/20250718/5d4025a5cd86fef8d115f56ec5b44.png' },
  { id: 6, name: 'USDAUD', symbol: 'USDAUD', price: '1.4300', change: '-0.40%', category: 'forex', icon: '/uploads/20250718/507accb0a0759f55a672c6b9a6ee9.png' },
  { id: 7, name: 'USDGBP', symbol: 'USDGBP', price: '0.7241', change: '-0.45%', category: 'forex', icon: '/uploads/20250718/8a452b0d7f6204306f2980c25f5b4.png' },
  { id: 8, name: 'USDJPY', symbol: 'USDJPY', price: '152.8133', change: '-0.28%', category: 'forex', icon: '/uploads/20250718/f369c3c87f6a50a73eaf6119caa38.png' },
  { id: 9, name: 'Bitcoin', symbol: 'BTC', price: '89,439.99', change: '+1.29%', category: 'crypto', icon: '/uploads/20250618/f98ae7d53c3a9416849987953d958.png' },
  { id: 10, name: 'Ethereum', symbol: 'ETH', price: '3,018.86', change: '+3.41%', category: 'crypto', icon: '/uploads/20250618/e5e10544329b54ac4f31b2f2d7adf.png' },
  { id: 11, name: 'Dogecoin', symbol: 'DOGE', price: '0.12544', change: '+2.67%', category: 'crypto', icon: '/uploads/20250618/d64ee06715b458079829d3c452a03.png' },
  { id: 12, name: 'Cardano', symbol: 'ADA', price: '0.3577', change: '+1.65%', category: 'crypto', icon: '/uploads/20250618/55f45ce48d644f690da9506a165a0.png' },
  { id: 13, name: 'Solana', symbol: 'SOL', price: '127.21', change: '+2.56%', category: 'crypto', icon: '/uploads/20250618/5e22a9302a4383454bfe530f0ddff.png' },
  { id: 14, name: 'Ripple', symbol: 'XRP', price: '1.9047', change: '+0.27%', category: 'crypto', icon: '/uploads/20250618/92f9d15be55070c0f267e7b960921.png' },
  { id: 15, name: 'Binance Coin', symbol: 'BNB', price: '900.02', change: '+2.62%', category: 'crypto', icon: '/uploads/20250618/cb84d3ca48a52e3df1025731a8bef.png' },
  { id: 16, name: 'USD Coin', symbol: 'USDC', price: '1.0010', change: '+0.02%', category: 'crypto', icon: '/uploads/20250618/4a0e5e239b274e9ec4a17ac738ab4.png' },
  { id: 17, name: 'TRON', symbol: 'TRX', price: '0.2942', change: '-0.74%', category: 'crypto', icon: '/uploads/20250618/79cbcbdfcc32e9ed14054fb9f306d.png' },
  { id: 18, name: 'Wrapped Bitcoin', symbol: 'WBTC', price: '89,233.88', change: '+1.28%', category: 'crypto', icon: '/uploads/20250618/6ed88c45b665c3040f6355a0fa67c.png' },
  { id: 19, name: 'Stellar Lumens', symbol: 'XLM', price: '0.2082', change: '+0.53%', category: 'crypto', icon: '/uploads/20250618/d6deb1aa7365929e2cf751b88e56b.png' },
  { id: 20, name: 'Sui', symbol: 'SUI', price: '1.4339', change: '-0.47%', category: 'crypto', icon: '/uploads/20250618/e243d03f847e04a3bcaf9238d2d79.png' },
  { id: 21, name: 'Bitcoin Cash', symbol: 'BCH', price: '600.00', change: '+3.61%', category: 'crypto', icon: '/uploads/20250618/d34183db66626408066857b67f790.png' },
  { id: 22, name: 'Chainlink', symbol: 'LINK', price: '12.03', change: '+0.67%', category: 'crypto', icon: '/uploads/20250618/1d8873b15ce7e65a262d1788f1991.png' },
  { id: 23, name: 'Avalanche', symbol: 'AVAX', price: '12.11', change: '+3.42%', category: 'crypto', icon: '/uploads/20250618/155f85dfe1fe971302126e81ecbee.png' },
  { id: 24, name: 'SHIBA INU', symbol: 'SHIB', price: '0.00000779', change: '+1.17%', category: 'crypto', icon: '/uploads/20250618/8d274732cb54e6941ea4bddcfba64.png' },
  { id: 25, name: 'U.S. Soybean', symbol: 'S', price: '1,068.938', change: '+0.03%', category: 'cfd', icon: '/uploads/20250718/52d1c05b874421a2b23ba94cee8e2.png' },
  { id: 26, name: 'London Platinum', symbol: 'XPT', price: '2,678.646', change: '+4.34%', category: 'cfd', icon: '/uploads/20250718/f9c43202e85aef5a21ebb37ddf0d0.png' },
  { id: 27, name: 'Iron Ore', symbol: 'FEF', price: '103.515', change: '+0.02%', category: 'cfd', icon: '/uploads/20250718/382f8aaaa276c53373d367dc02787.png' },
  { id: 28, name: 'USDEUR', symbol: 'USDEUR', price: '0.8329', change: '-0.47%', category: 'forex', icon: '/uploads/20250718/b090c3700be4e48a5f1e72299df9a.png' },
  { id: 29, name: 'USDHKD', symbol: 'USDHKD', price: '7.8014', change: '+0.03%', category: 'forex', icon: '/uploads/20250718/e678bb3ceb11de6b492fbdca42b86.png' },
  { id: 30, name: 'USDTWD', symbol: 'USDTWD', price: '31.3002', change: '-0.36%', category: 'forex', icon: '/uploads/20250718/acae89acf8cd1c3bdd938c57f2af9.png' },
];

const tabs = [
  { id: 'optional', label: '可選' },
  { id: 'all', label: '全部' },
  { id: 'cfd', label: '差價合約' },
  { id: 'forex', label: '外匯' },
  { id: 'crypto', label: '加密貨幣' },
];

export default function PaymentMarket() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('all');
  const [favorites, setFavorites] = useState<number[]>([1, 9]);

  const filteredData = activeTab === 'all' 
    ? allMarketData 
    : activeTab === 'optional'
    ? allMarketData.filter(item => favorites.includes(item.id))
    : allMarketData.filter(item => item.category === activeTab);

  const toggleFavorite = (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    setFavorites(prev => 
      prev.includes(id) ? prev.filter(f => f !== id) : [...prev, id]
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#1a1f3c] to-[#0d1025] pb-20">
      <header className="px-4 py-4">
        <h3 className="text-white text-xl font-semibold text-center">市場</h3>
      </header>

      <div className="px-4 mb-4">
        <div className="flex gap-2 overflow-x-auto pb-2">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 rounded-full text-sm whitespace-nowrap transition-colors ${
                activeTab === tab.id
                  ? 'bg-[#00d4aa] text-white'
                  : 'bg-[#252a4a] text-gray-400 hover:bg-[#3a4070]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="px-4">
        <div className="bg-[#1a2040] rounded-xl overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="text-gray-500 text-sm border-b border-gray-700">
                <th className="text-left py-3 px-4">名稱</th>
                <th className="text-right py-3 px-4">價格</th>
                <th className="text-right py-3 px-4">24小時漲跌幅</th>
              </tr>
            </thead>
            <tbody>
              {filteredData.length === 0 ? (
                <tr>
                  <td colSpan={3} className="text-center py-8 text-gray-500">
                    {activeTab === 'optional' ? 'No favorites yet. Add some from the All tab.' : 'No data available'}
                  </td>
                </tr>
              ) : (
                filteredData.map((item) => (
                  <tr 
                    key={item.id} 
                    className="border-b border-gray-800 hover:bg-[#252a4a] cursor-pointer transition-colors"
                    onClick={() => navigate('/trade')}
                  >
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <button 
                          onClick={(e) => toggleFavorite(item.id, e)}
                          className={favorites.includes(item.id) ? 'text-yellow-500' : 'text-gray-600'}
                        >
                          <svg className="w-4 h-4" fill={favorites.includes(item.id) ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                          </svg>
                        </button>
                        <img 
                          src={item.icon} 
                          alt={item.name} 
                          className="w-8 h-8 rounded-full"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = `https://placehold.co/32x32/1a1f3c/00d4aa?text=${item.symbol.charAt(0)}`;
                          }}
                        />
                        <div>
                          <div className="text-white font-medium">{item.name}</div>
                          <div className="text-gray-500 text-xs">{item.symbol}</div>
                        </div>
                      </div>
                    </td>
                    <td className="text-right py-3 px-4 text-white">$ {item.price}</td>
                    <td className={`text-right py-3 px-4 ${item.change.startsWith('+') ? 'text-green-500' : 'text-red-500'}`}>
                      {item.change}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <PaymentNavBar />
    </div>
  );
}
