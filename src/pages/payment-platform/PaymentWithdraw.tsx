import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const networks = [
  { id: 'trc20', name: 'Tron (TRC20)', icon: '/uploads/20250618/79cbcbdfcc32e9ed14054fb9f306d.png' },
];

export default function PaymentWithdraw() {
  const navigate = useNavigate();
  const [selectedNetwork, setSelectedNetwork] = useState(networks[0]);
  const [showNetworkSelector, setShowNetworkSelector] = useState(false);
  const [address, setAddress] = useState('');
  const [amount, setAmount] = useState('');
  const [password, setPassword] = useState('');

  const balance = 4552025.50;
  const minWithdraw = 10;
  const fee = 1;

  const handleSubmit = () => {
    if (!address) {
      alert('請輸入取款地址');
      return;
    }
    if (!amount || parseFloat(amount) < minWithdraw) {
      alert(`最低取款金額為 ${minWithdraw} USDT`);
      return;
    }
    if (parseFloat(amount) > balance) {
      alert('餘額不足');
      return;
    }
    if (!password) {
      alert('請輸入交易密碼');
      return;
    }
    alert('取款申請已成功提交！');
    navigate('/payment-platform/wallet');
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#1a1f3c] to-[#0d1025]">
      <header className="px-4 py-4 flex items-center justify-between">
        <button onClick={() => navigate('/payment-platform/wallet')} className="text-gray-400">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h3 className="text-white text-xl font-semibold">取款</h3>
        <button className="text-gray-400">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        </button>
      </header>

      <main className="px-4 pb-8">
        <div className="bg-[#1a2040] rounded-xl p-4 mb-4">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-white font-semibold">取款網絡</h3>
            <button 
              onClick={() => setShowNetworkSelector(true)}
              className="flex items-center gap-1 bg-[#00d4aa] text-white px-3 py-1 rounded-full text-sm"
            >
              {selectedNetwork.name.split(' ')[0]}
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
              </svg>
            </button>
          </div>

          <div className="space-y-4">
            <div>
              <label className="text-gray-400 text-sm mb-2 block">取款地址</label>
              <input 
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="請輸入USDT取款地址"
                className="w-full bg-[#252a4a] rounded-lg p-3 text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-[#00d4aa]"
              />
            </div>

            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="text-gray-400 text-sm">取款金額</label>
                <span className="text-gray-500 text-sm">可用: {balance.toLocaleString()} USDT</span>
              </div>
              <div className="flex items-center bg-[#252a4a] rounded-lg">
                <input 
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="請輸入取款金額"
                  className="flex-1 bg-transparent p-3 text-white placeholder-gray-500 focus:outline-none"
                />
                <button 
                  onClick={() => setAmount((balance - fee).toString())}
                  className="text-[#00d4aa] px-4"
                >
                  全部
                </button>
              </div>
            </div>

            <div>
              <label className="text-gray-400 text-sm mb-2 block">交易密碼</label>
              <input 
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="請輸入交易密碼"
                className="w-full bg-[#252a4a] rounded-lg p-3 text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-[#00d4aa]"
              />
            </div>
          </div>
        </div>

        <div className="bg-[#1a2040] rounded-xl p-4 mb-4">
          <h3 className="text-white font-semibold mb-4">取款信息</h3>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-400">貨幣</span>
              <span className="text-white">Tether USD (USDT)</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">網絡</span>
              <span className="text-white">{selectedNetwork.name.split(' ')[0]}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">最低取款</span>
              <span className="text-white">{minWithdraw} USDT</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">網絡手續費</span>
              <span className="text-white">{fee} USDT</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">實際到賬</span>
              <span className="text-[#00d4aa]">
                {amount ? Math.max(0, parseFloat(amount) - fee).toFixed(2) : '0.00'} USDT
              </span>
            </div>
          </div>
        </div>

        <div className="bg-[#1a2040] rounded-xl p-4 mb-4">
          <h3 className="text-white font-semibold mb-2">重要提示</h3>
          <ul className="text-gray-400 text-sm space-y-2">
            <li className="flex items-start gap-2">
              <span className="text-[#00d4aa]">•</span>
              請確保取款地址正確，錯誤的地址可能導致資產永久丟失。
            </li>
            <li className="flex items-start gap-2">
              <span className="text-[#00d4aa]">•</span>
              取款通常在24小時內處理完成。
            </li>
            <li className="flex items-start gap-2">
              <span className="text-[#00d4aa]">•</span>
              大額取款可能需要額外驗證。
            </li>
          </ul>
        </div>

        <button 
          onClick={handleSubmit}
          className="w-full bg-gradient-to-r from-red-500 to-pink-500 text-white py-4 rounded-xl font-semibold flex items-center justify-center gap-2 hover:opacity-90 transition-opacity"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
          </svg>
          提交取款申請
        </button>
      </main>

      {showNetworkSelector && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end">
          <div className="bg-[#1a2040] w-full rounded-t-2xl p-4">
            <div className="flex items-center gap-2 mb-4">
              <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
              </svg>
              <h3 className="text-white font-semibold">選擇取款網絡</h3>
            </div>
            {networks.map((network) => (
              <button
                key={network.id}
                onClick={() => {
                  setSelectedNetwork(network);
                  setShowNetworkSelector(false);
                }}
                className={`w-full flex items-center justify-between p-4 rounded-lg mb-2 ${
                  selectedNetwork.id === network.id
                    ? 'bg-[#00d4aa]/20 border border-[#00d4aa]'
                    : 'bg-[#252a4a]'
                }`}
              >
                <div className="flex items-center gap-3">
                  <img 
                    src={network.icon} 
                    alt={network.name} 
                    className="w-8 h-8 rounded-full"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = 'https://placehold.co/32x32/1a1f3c/00d4aa?text=T';
                    }}
                  />
                  <div className="text-left">
                    <div className="text-white font-medium">{network.name}</div>
                  </div>
                </div>
                {selectedNetwork.id === network.id && (
                  <svg className="w-5 h-5 text-[#00d4aa]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
