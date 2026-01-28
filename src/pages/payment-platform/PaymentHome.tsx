import React from 'react';
import { useNavigate } from 'react-router-dom';
import PaymentNavBar from './components/PaymentNavBar';

const marketData = [
  { id: 1, name: 'London Gold', symbol: 'XAU', price: '5,190.81', change: '+2.07%', icon: '/uploads/20250717/676d9c325102c0f69aa65aeb3ccfa.png' },
  { id: 2, name: 'London Silver', symbol: 'XAG', price: '113.66', change: '+5.16%', icon: '/uploads/20250718/e2c28bd2dd44b4da3299699df97d3.png' },
  { id: 3, name: 'WTI Oil', symbol: 'CL', price: '62.438', change: '+1.34%', icon: '/uploads/20250718/cc6047bdc0f293b45bc4b8693b7e1.png' },
  { id: 4, name: 'COMEX Copper', symbol: 'HG', price: '592.408', change: '+1.23%', icon: '/uploads/20250718/3712605e266b2e8325d840c2ffb65.png' },
  { id: 5, name: 'Natural Gas Futures', symbol: 'NG', price: '3.788', change: '+2.61%', icon: '/uploads/20250718/5d4025a5cd86fef8d115f56ec5b44.png' },
  { id: 6, name: 'USDAUD', symbol: 'USDAUD', price: '1.4297', change: '-0.42%', icon: '/uploads/20250718/507accb0a0759f55a672c6b9a6ee9.png' },
  { id: 7, name: 'USDGBP', symbol: 'USDGBP', price: '0.7239', change: '-0.48%', icon: '/uploads/20250718/8a452b0d7f6204306f2980c25f5b4.png' },
  { id: 8, name: 'USDJPY', symbol: 'USDJPY', price: '152.7939', change: '-0.29%', icon: '/uploads/20250718/f369c3c87f6a50a73eaf6119caa38.png' },
  { id: 9, name: 'Bitcoin', symbol: 'BTC', price: '89,426.83', change: '+1.32%', icon: '/uploads/20250618/f98ae7d53c3a9416849987953d958.png' },
  { id: 10, name: 'Ethereum', symbol: 'ETH', price: '3,019.72', change: '+3.53%', icon: '/uploads/20250618/e5e10544329b54ac4f31b2f2d7adf.png' },
];

export default function PaymentHome() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#1a1f3c] to-[#0d1025] pb-20">
      <header className="px-4 py-3 flex justify-between items-center">
        <img 
          src="/uploads/20250915/44e14db51291aa31792ea3a464cac.png" 
          alt="SAXO" 
          className="h-8"
          onError={(e) => {
            (e.target as HTMLImageElement).src = 'https://placehold.co/120x32/1a1f3c/00d4aa?text=SAXO';
          }}
        />
        <div className="flex gap-3">
          <button className="text-white">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
          </button>
          <button className="text-white">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </button>
        </div>
      </header>

      <section className="px-4 py-8 bg-gradient-to-r from-[#1a2a4a] to-[#2a3a5a] mx-4 rounded-xl relative overflow-hidden">
        <div className="relative z-10">
          <h1 className="text-2xl font-bold text-white mb-2">
            未来 <span className="text-[#00d4aa]">由您掌握</span>
          </h1>
          <p className="text-gray-400 text-sm mb-6">
            全球資本市場中處處充滿機遇，我們相信，每個人都有能力實現自己的夢想，我們始終致力於幫助您進行投資和交易，助您將未來掌握在自己手中。
          </p>
          <button 
            onClick={() => window.open('https://www.saxotdader.top/download/', '_blank')}
            className="bg-[#00d4aa] text-white px-6 py-2 rounded-full flex items-center gap-2 hover:bg-[#00b894] transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
            </svg>
            下載App
          </button>
        </div>
        <div className="absolute right-0 top-0 w-1/2 h-full opacity-20">
          <div className="w-full h-full bg-gradient-to-l from-[#00d4aa] to-transparent"></div>
        </div>
      </section>

      <div className="flex justify-around py-6 px-4">
        <button 
          onClick={() => navigate('/payment-platform/deposit')}
          className="flex flex-col items-center gap-2"
        >
          <div className="w-12 h-12 bg-gradient-to-br from-yellow-500 to-orange-500 rounded-full flex items-center justify-center">
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
          </div>
          <span className="text-gray-400 text-sm">入款</span>
        </button>
        <button 
          onClick={() => navigate('/payment-platform/withdraw')}
          className="flex flex-col items-center gap-2"
        >
          <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-full flex items-center justify-center">
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
            </svg>
          </div>
          <span className="text-gray-400 text-sm">取款</span>
        </button>
        <button className="flex flex-col items-center gap-2">
          <div className="w-12 h-12 bg-gradient-to-br from-red-500 to-pink-500 rounded-full flex items-center justify-center">
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
          </div>
          <span className="text-gray-400 text-sm">客服中心</span>
        </button>
      </div>

      <section className="px-4">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-white text-lg font-semibold">市場數據</h2>
          <button className="bg-[#00d4aa] text-white px-4 py-1 rounded-full text-sm">
            期權
          </button>
        </div>
        
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
              {marketData.map((item) => (
                <tr 
                  key={item.id} 
                  className="border-b border-gray-800 hover:bg-[#252a4a] cursor-pointer transition-colors"
                  onClick={() => navigate('/payment-platform/trade')}
                >
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-3">
                      <img 
                        src={item.icon} 
                        alt={item.name} 
                        className="w-8 h-8 rounded-full"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = `https://placehold.co/32x32/1a1f3c/00d4aa?text=${item.symbol.charAt(0)}`;
                        }}
                      />
                      <div>
                        <div className="text-white font-medium">{item.symbol}</div>
                        <div className="text-gray-500 text-xs">{item.name}</div>
                      </div>
                    </div>
                  </td>
                  <td className="text-right py-3 px-4 text-white">$ {item.price}</td>
                  <td className={`text-right py-3 px-4 ${item.change.startsWith('+') ? 'text-green-500' : 'text-red-500'}`}>
                    {item.change}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="text-center py-3">
            <button 
              onClick={() => navigate('/payment-platform/market')}
              className="text-[#00d4aa] text-sm hover:underline"
            >
              查看全部
            </button>
          </div>
        </div>
      </section>

      <section className="px-4 mt-8">
        <h2 className="text-white text-lg font-semibold mb-4">Why Choose Us</h2>
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-[#1a2040] p-4 rounded-xl">
            <div className="w-10 h-10 bg-[#00d4aa]/20 rounded-lg flex items-center justify-center mb-3">
              <svg className="w-5 h-5 text-[#00d4aa]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
            <h3 className="text-white font-medium mb-1">Bank - level Security</h3>
            <p className="text-gray-500 text-xs">Multi - signature cold wallet storage</p>
          </div>
          <div className="bg-[#1a2040] p-4 rounded-xl">
            <div className="w-10 h-10 bg-[#00d4aa]/20 rounded-lg flex items-center justify-center mb-3">
              <svg className="w-5 h-5 text-[#00d4aa]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <h3 className="text-white font-medium mb-1">Fast Trading</h3>
            <p className="text-gray-500 text-xs">Million - level TPS processing capacity</p>
          </div>
          <div className="bg-[#1a2040] p-4 rounded-xl">
            <div className="w-10 h-10 bg-[#00d4aa]/20 rounded-lg flex items-center justify-center mb-3">
              <svg className="w-5 h-5 text-[#00d4aa]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="text-white font-medium mb-1">Low Fees</h3>
            <p className="text-gray-500 text-xs">0.1% trading fee</p>
          </div>
          <div className="bg-[#1a2040] p-4 rounded-xl">
            <div className="w-10 h-10 bg-[#00d4aa]/20 rounded-lg flex items-center justify-center mb-3">
              <svg className="w-5 h-5 text-[#00d4aa]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
              </svg>
            </div>
            <h3 className="text-white font-medium mb-1">Blockchain Market</h3>
            <p className="text-gray-500 text-xs">Support 24-hour multiple digital currency trading</p>
          </div>
        </div>
      </section>

      <section className="px-4 mt-8">
        <div className="bg-gradient-to-r from-[#1a2a4a] to-[#2a3a5a] p-6 rounded-xl">
          <h2 className="text-white text-lg font-semibold mb-2">Deposit and Withdraw, Fast and Convenient</h2>
          <p className="text-gray-400 text-sm mb-4">Supports multiple deposit methods, fast arrival, and instant withdrawal processing.</p>
          <div className="flex gap-4">
            <button 
              onClick={() => navigate('/payment-platform/deposit')}
              className="bg-[#00d4aa] text-white px-6 py-2 rounded-lg hover:bg-[#00b894] transition-colors"
            >
              Deposit
            </button>
            <button 
              onClick={() => navigate('/payment-platform/withdraw')}
              className="bg-transparent border border-[#00d4aa] text-[#00d4aa] px-6 py-2 rounded-lg hover:bg-[#00d4aa]/10 transition-colors"
            >
              Withdraw
            </button>
          </div>
        </div>
      </section>

      <section className="px-4 mt-8 mb-8">
        <p className="text-gray-400 text-sm text-center mb-4">
          SAXO provides world-class, satisfactory services for millions of investors across thousands of contract products, 24/7.
        </p>
        <img 
          src="/base/saxo_index_banner-BRBsTUh3.png" 
          alt="SAXO Banner" 
          className="w-full rounded-xl"
          onError={(e) => {
            (e.target as HTMLImageElement).src = 'https://placehold.co/400x200/1a1f3c/00d4aa?text=SAXO+Trading';
          }}
        />
        <p className="text-gray-500 text-xs mt-4 text-center">
          Regarding Contracts for Difference (CFDs), you should know that CFDs are financial derivatives that allow you to earn potential net profits by predicting the rapid price fluctuations of futures, bonds, foreign exchange, and other commodities.
        </p>
      </section>

      <PaymentNavBar />
    </div>
  );
}
