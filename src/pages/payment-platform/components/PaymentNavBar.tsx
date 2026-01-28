import React from 'react';
import { useLocation } from 'wouter';

interface PaymentNavBarProps {
  active: 'home' | 'trade' | 'market' | 'wallet' | 'profile';
}

export default function PaymentNavBar({ active }: PaymentNavBarProps) {
  const [, setLocation] = useLocation();

  const navItems = [
    {
      id: 'home',
      label: '首頁',
      path: '/',
      icon: (isActive: boolean) => (
        <svg className={`w-6 h-6 ${isActive ? 'text-[#00d4aa]' : 'text-gray-500'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
        </svg>
      ),
    },
    {
      id: 'trade',
      label: '交易',
      path: '/trade',
      icon: (isActive: boolean) => (
        <svg className={`w-6 h-6 ${isActive ? 'text-[#00d4aa]' : 'text-gray-500'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
        </svg>
      ),
    },
    {
      id: 'market',
      label: '市場',
      path: '/market',
      icon: (isActive: boolean) => (
        <svg className={`w-6 h-6 ${isActive ? 'text-[#00d4aa]' : 'text-gray-500'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
        </svg>
      ),
    },
    {
      id: 'wallet',
      label: '錢包',
      path: '/wallet',
      icon: (isActive: boolean) => (
        <svg className={`w-6 h-6 ${isActive ? 'text-[#00d4aa]' : 'text-gray-500'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
        </svg>
      ),
    },
    {
      id: 'profile',
      label: '我的',
      path: '/profile',
      icon: (isActive: boolean) => (
        <svg className={`w-6 h-6 ${isActive ? 'text-[#00d4aa]' : 'text-gray-500'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        </svg>
      ),
    },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-[#0d1025] border-t border-gray-800 px-4 py-2 z-50">
      <div className="flex justify-around items-center max-w-md mx-auto">
        {navItems.map((item) => (
          <button
            key={item.id}
            onClick={() => setLocation(item.path)}
            className="flex flex-col items-center gap-1 py-1 px-3"
          >
            {item.icon(active === item.id)}
            <span className={`text-xs ${active === item.id ? 'text-[#00d4aa]' : 'text-gray-500'}`}>
              {item.label}
            </span>
          </button>
        ))}
      </div>
    </nav>
  );
}
