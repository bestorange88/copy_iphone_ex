import React from 'react';
import { useLocation } from 'wouter';
import PaymentNavBar from './components/PaymentNavBar';

const menuItems = [
  {
    group: 'main',
    items: [
      { id: 'notification', label: '通知', badge: 0, icon: 'bell' },
      { id: 'asset', label: '資產管理', path: '/wallet', icon: 'wallet' },
      { id: 'loan', label: '平台借貸', icon: 'bank' },
      { id: 'records', label: '交易記錄', path: '/trade-records', icon: 'history' },
    ]
  },
  {
    group: 'settings',
    items: [
      { id: 'security', label: '安全設置', icon: 'shield' },
      { id: 'auth', label: '實名認證', icon: 'id-card' },
      { id: 'language', label: '語言設置', icon: 'globe' },
      { id: 'logout', label: '退出登錄', icon: 'logout' },
    ]
  }
];

const getIcon = (iconName: string) => {
  switch (iconName) {
    case 'bell':
      return (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
      );
    case 'wallet':
      return (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
        </svg>
      );
    case 'bank':
      return (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
        </svg>
      );
    case 'history':
      return (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      );
    case 'shield':
      return (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
        </svg>
      );
    case 'id-card':
      return (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0m-5 8a2 2 0 100-4 2 2 0 000 4zm0 0c1.306 0 2.417.835 2.83 2M9 14a3.001 3.001 0 00-2.83 2M15 11h3m-3 4h2" />
        </svg>
      );
    case 'globe':
      return (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
        </svg>
      );
    case 'logout':
      return (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
        </svg>
      );
    default:
      return null;
  }
};

export default function PaymentProfile() {
  const [, setLocation] = useLocation();

  const userInfo = {
    phone: '82****88',
    id: '82536060',
    creditScore: 100,
    level: '旭陽高照',
    inviteCode: 'GpDNZNY',
  };

  const handleMenuClick = (item: { id: string; path?: string }) => {
    if (item.path) {
      setLocation(item.path);
    } else if (item.id === 'logout') {
      localStorage.removeItem('payment_logged_in');
      setLocation('/login');
    } else {
      alert(`${item.id} feature coming soon`);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    alert('已複製到剪貼板！');
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#1a1f3c] to-[#0d1025] pb-20">
      <header className="px-4 py-4">
        <h3 className="text-white text-xl font-semibold text-center">用戶中心</h3>
      </header>

      <div className="px-4">
        <p className="text-gray-400 text-sm text-center mb-6">
          無論您是活躍還是非活躍的交易客戶，您都將獲得量身定制的一流服務
        </p>

        <div className="bg-gradient-to-r from-[#1a2a4a] to-[#2a3a5a] rounded-xl p-4 mb-6">
          <div className="flex items-start justify-between mb-4">
            <div>
              <button className="text-white font-semibold mb-1">{userInfo.phone}</button>
              <button className="ml-2 text-gray-400">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                </svg>
              </button>
            </div>
            <div className="text-right text-[#00d4aa] text-2xl font-bold">SAXO</div>
          </div>

          <div className="flex items-center gap-4 mb-4">
            <div className="w-16 h-16 bg-gradient-to-br from-orange-300 to-orange-400 rounded-full flex items-center justify-center text-2xl font-bold text-white">
              旭
            </div>
            <div>
              <div className="flex items-center gap-2 text-gray-400 text-sm">
                ID:{userInfo.id}
                <button onClick={() => copyToClipboard(userInfo.id)} className="text-gray-500">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                </button>
              </div>
            </div>
          </div>

          <div className="flex justify-between items-center">
            <div>
              <div className="text-gray-400 text-sm">信用分: {userInfo.creditScore}</div>
              <div className="text-[#00d4aa] font-medium">{userInfo.level}</div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-gray-400 text-sm">邀請碼:{userInfo.inviteCode}</span>
              <button onClick={() => copyToClipboard(userInfo.inviteCode)} className="text-gray-500">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
              </button>
            </div>
          </div>
        </div>

        {menuItems.map((group, groupIndex) => (
          <div key={group.group} className={`bg-[#1a2040] rounded-xl overflow-hidden ${groupIndex > 0 ? 'mt-4' : ''}`}>
            {group.items.map((item, index) => (
              <button
                key={item.id}
                onClick={() => handleMenuClick(item)}
                className={`w-full flex items-center justify-between p-4 hover:bg-[#252a4a] transition-colors ${
                  index < group.items.length - 1 ? 'border-b border-gray-800' : ''
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className="text-gray-400">{getIcon(item.icon)}</span>
                  <span className="text-white">{item.label}</span>
                  {item.badge !== undefined && (
                    <span className="bg-[#00d4aa] text-white text-xs px-2 py-0.5 rounded-full">
                      {item.badge}
                    </span>
                  )}
                </div>
                <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            ))}
          </div>
        ))}
      </div>

      <PaymentNavBar active="profile" />
    </div>
  );
}
