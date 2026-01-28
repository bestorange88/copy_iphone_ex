import { ReactNode, useState, useEffect } from 'react';

interface PhoneFrameProps {
  children: ReactNode;
}

export default function PhoneFrame({ children }: PhoneFrameProps) {
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
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[126px] h-[34px] bg-black rounded-b-[18px] z-50 flex items-center justify-center gap-2">
            <div className="w-[8px] h-[8px] bg-[#1a1a2e] rounded-full"></div>
            <div className="w-[50px] h-[5px] bg-[#1a1a2e] rounded-full"></div>
          </div>
          
          <div className="absolute top-[6px] left-0 right-0 h-[28px] flex items-center justify-between px-8 z-40">
            <span className="text-white text-[14px] font-semibold tracking-tight">{currentTime}</span>
            <div className="flex items-center gap-[6px]">
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

          <div className="w-full h-full overflow-hidden">
            <div className="w-full h-full overflow-y-auto overflow-x-hidden"
                 style={{ 
                   scrollbarWidth: 'none', 
                   msOverflowStyle: 'none',
                   WebkitOverflowScrolling: 'touch'
                 }}>
              <style>{`
                .phone-screen::-webkit-scrollbar {
                  display: none;
                }
              `}</style>
              <div className="phone-screen">
                {children}
              </div>
            </div>
          </div>

          <div className="absolute bottom-[8px] left-1/2 -translate-x-1/2 w-[134px] h-[5px] bg-white/80 rounded-full"></div>
        </div>
      </div>
    </div>
  );
}
