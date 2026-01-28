import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const networks = [
  { id: 'trc20', name: 'Tron (TRC20)', icon: '/uploads/20250618/79cbcbdfcc32e9ed14054fb9f306d.png' },
];

const currencies = [
  { id: 'usdt', symbol: 'USDT', name: 'Tether USD', icon: '/uploads/20250618/1de5a530efde23352a4508c1c9eef.png' },
];

export default function PaymentDeposit() {
  const navigate = useNavigate();
  const [selectedCurrency] = useState(currencies[0]);
  const [selectedNetwork, setSelectedNetwork] = useState(networks[0]);
  const [showNetworkSelector, setShowNetworkSelector] = useState(false);
  const [amount, setAmount] = useState('');

  const depositAddress = 'TEwBvznTknHeS1QePBAwXdnvu5MgirSBXp';

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    alert('地址已複製到剪貼板！');
  };

  const handleSubmit = () => {
    if (!amount) {
      alert('請輸入入款金額');
      return;
    }
    alert('入款申請已成功提交！');
    navigate('/wallet');
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#1a1f3c] to-[#0d1025]">
      <header className="px-4 py-4 flex items-center justify-between">
        <button onClick={() => navigate('/wallet')} className="text-gray-400">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h3 className="text-white text-xl font-semibold">入款</h3>
        <button className="text-gray-400">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        </button>
      </header>

      <main className="px-4 pb-8">
        <button className="flex items-center gap-3 bg-[#1a2040] rounded-xl p-4 mb-4 w-full">
          <img 
            src={selectedCurrency.icon} 
            alt={selectedCurrency.symbol} 
            className="w-10 h-10 rounded-full"
            onError={(e) => {
              (e.target as HTMLImageElement).src = 'https://placehold.co/40x40/1a1f3c/00d4aa?text=U';
            }}
          />
          <span className="text-white font-semibold">{selectedCurrency.symbol}</span>
        </button>

        <div className="bg-[#1a2040] rounded-xl p-4 mb-4">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-white font-semibold">{selectedCurrency.symbol} 入款地址</h3>
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

          <div className="flex flex-col items-center mb-4">
            <div className="bg-white p-4 rounded-xl mb-4">
              <img 
                src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${depositAddress}`}
                alt="QR Code"
                className="w-40 h-40"
              />
            </div>
            
            <div className="w-full bg-[#252a4a] rounded-lg p-3 mb-3">
              <input 
                type="text" 
                value={depositAddress} 
                readOnly 
                className="w-full bg-transparent text-white text-sm text-center focus:outline-none"
              />
            </div>
            
            <button 
              onClick={() => copyToClipboard(depositAddress)}
              className="bg-transparent border border-[#00d4aa] text-[#00d4aa] px-6 py-2 rounded-lg hover:bg-[#00d4aa]/10 transition-colors"
            >
              複製地址
            </button>
          </div>

          <p className="text-gray-400 text-sm text-center mb-2">
            請使用數字貨幣錢包掃描二維碼或複製地址進行轉賬。
          </p>
          <p className="text-red-400 text-sm text-center">
            注意：請確認入款貨幣與地址匹配，否則您的資產可能會丟失。
          </p>
        </div>

        <div className="bg-[#1a2040] rounded-xl p-4 mb-4">
          <h3 className="text-white font-semibold mb-4">入款信息</h3>
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
              <span className="text-gray-400">最低入款</span>
              <span className="text-white">1.00000000 USDT</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">狀態</span>
              <span className="text-green-500">正常</span>
            </div>
          </div>
        </div>

        <div className="bg-[#1a2040] rounded-xl p-4 mb-4">
          <h3 className="text-white font-semibold mb-4">轉賬信息</h3>
          <div className="space-y-4">
            <div>
              <label className="text-gray-400 text-sm mb-2 block">金額</label>
              <input 
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="請輸入入款金額"
                className="w-full bg-[#252a4a] rounded-lg p-3 text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-[#00d4aa]"
              />
            </div>
            <div>
              <label className="text-gray-400 text-sm mb-2 block">截圖</label>
              <div className="border-2 border-dashed border-gray-600 rounded-lg p-8 text-center cursor-pointer hover:border-[#00d4aa] transition-colors">
                <svg className="w-10 h-10 text-gray-500 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <p className="text-gray-400 text-sm">點擊上傳</p>
                <p className="text-gray-500 text-xs">支持 JPG, PNG, WEBP 格式</p>
              </div>
            </div>
          </div>
        </div>

        <button 
          onClick={handleSubmit}
          className="w-full bg-[#00d4aa] text-white py-4 rounded-xl font-semibold flex items-center justify-center gap-2 hover:bg-[#00b894] transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
          </svg>
          提交入款申請
        </button>
      </main>

      {showNetworkSelector && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end">
          <div className="bg-[#1a2040] w-full rounded-t-2xl p-4">
            <div className="flex items-center gap-2 mb-4">
              <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
              </svg>
              <h3 className="text-white font-semibold">選擇入款網絡</h3>
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
                    <div className="text-gray-500 text-sm">{network.name}</div>
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
