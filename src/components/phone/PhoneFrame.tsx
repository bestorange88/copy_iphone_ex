import { ReactNode, useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

interface PhoneFrameProps {
  children: ReactNode;
  showNavBar?: boolean;
}

interface PhoneNavBarProps {
  currentPath: string;
  onNavigate: (path: string) => void;
}

function PhoneNavBar({ currentPath, onNavigate }: PhoneNavBarProps) {
  const getActiveTab = () => {
    if (currentPath === '/' || currentPath === '/home') return 'home';
    if (currentPath.includes('/trade')) return 'trade';
    if (currentPath.includes('/market')) return 'market';
    if (currentPath.includes('/wallet')) return 'wallet';
    if (currentPath.includes('/profile')) return 'profile';
    return 'home';
  };
  
  const active = getActiveTab();

  const navItems = [
    {
      id: 'home',
      label: '首頁',
      path: '/home',
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
    <nav className="bg-[#0d1025] border-t border-gray-800 px-4 py-2">
      <div className="flex justify-around items-center">
        {navItems.map((item) => (
          <button
            key={item.id}
            onClick={() => onNavigate(item.path)}
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

export default function PhoneFrame({ children, showNavBar = true }: PhoneFrameProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const [currentTime, setCurrentTime] = useState('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const hours = now.getHours().toString().padStart(2, '0');
      const minutes = now.getMinutes().toString().padStart(2, '0');
      setCurrentTime(`${hours}:${minutes}`);
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen w-full flex items-center justify-center relative overflow-hidden"
         style={{ 
           background: 'linear-gradient(to bottom, #0a1628 0%, #1a2a4a 30%, #2a3a5a 50%, #1a2a4a 70%, #0a1628 100%)'
         }}>
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute bottom-0 left-0 right-0 h-[60%]"
             style={{
               background: 'linear-gradient(180deg, transparent 0%, rgba(30, 60, 100, 0.3) 30%, rgba(40, 80, 140, 0.4) 60%, rgba(20, 40, 80, 0.5) 100%)',
               clipPath: 'polygon(0 30%, 15% 45%, 30% 35%, 50% 50%, 70% 40%, 85% 55%, 100% 40%, 100% 100%, 0 100%)'
             }}>
        </div>
        <div className="absolute bottom-0 left-0 right-0 h-[40%]"
             style={{
               background: 'linear-gradient(180deg, transparent 0%, rgba(20, 50, 90, 0.5) 50%, rgba(15, 35, 70, 0.7) 100%)',
               clipPath: 'polygon(0 50%, 20% 35%, 40% 55%, 60% 40%, 80% 60%, 100% 45%, 100% 100%, 0 100%)'
             }}>
        </div>
      </div>

      <div className="relative z-10">
        <div className="relative w-[375px] h-[812px] bg-[#0d1025] rounded-[55px] border-[14px] border-[#2a2a3e] shadow-2xl overflow-hidden"
             style={{
               boxShadow: '0 0 0 2px #1a1a2e, 0 25px 50px -12px rgba(0, 0, 0, 0.5), inset 0 0 0 1px rgba(255,255,255,0.05)'
             }}>
          
          <div className="absolute top-[12px] left-0 right-0 h-[32px] flex items-center justify-between px-6 z-40">
            <span className="text-white text-[15px] font-semibold tracking-tight">{currentTime}</span>
            <div className="absolute left-1/2 -translate-x-1/2 w-[120px] h-[36px] bg-black rounded-full flex items-center justify-center">
              <div className="w-[12px] h-[12px] bg-[#1a1a2e] rounded-full absolute left-[14px]"></div>
            </div>
            <div className="flex items-center gap-[5px]">
              <svg className="w-[17px] h-[11px] text-white" viewBox="0 0 17 11" fill="currentColor">
                <rect x="0" y="3" width="3" height="8" rx="0.5" fillOpacity="0.3" />
                <rect x="4.5" y="2" width="3" height="9" rx="0.5" fillOpacity="0.5" />
                <rect x="9" y="1" width="3" height="10" rx="0.5" fillOpacity="0.7" />
                <rect x="13.5" y="0" width="3" height="11" rx="0.5" />
              </svg>
              <span className="text-white text-[12px] font-semibold">5G</span>
              <div className="flex items-center">
                <div className="w-[25px] h-[12px] border-[1.5px] border-white rounded-[3px] flex items-center p-[2px] relative">
                  <div className="w-full h-full bg-[#34c759] rounded-[1px]"></div>
                </div>
                <div className="w-[1.5px] h-[5px] bg-white ml-[1px] rounded-r-sm"></div>
              </div>
            </div>
          </div>

          <div className="absolute inset-0 top-[50px] bottom-[20px] flex flex-col" id="phone-screen-container">
            <style>{`
              #phone-screen-container ::-webkit-scrollbar {
                display: none;
              }
              #phone-screen-container > div:first-child nav {
                display: none !important;
              }
            `}</style>
            <div className="flex-1 overflow-y-auto overflow-x-hidden"
                 style={{ 
                   scrollbarWidth: 'none', 
                   msOverflowStyle: 'none',
                   WebkitOverflowScrolling: 'touch'
                 }}>
              <div className="pb-[70px]">
                {children}
              </div>
            </div>
            
            {showNavBar && (
              <PhoneNavBar currentPath={location.pathname} onNavigate={navigate} />
            )}
          </div>

          <div className="absolute bottom-[8px] left-1/2 -translate-x-1/2 w-[134px] h-[5px] bg-white/80 rounded-full z-50"></div>
        </div>
      </div>
    </div>
  );
}
