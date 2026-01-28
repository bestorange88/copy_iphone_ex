import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export default function PaymentLogin() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    localStorage.setItem('payment_logged_in', 'true');
    navigate('/payment-platform');
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#1a1f3c] to-[#0d1025] flex flex-col items-center justify-center px-4">
      <main className="w-full max-w-md">
        <div className="flex justify-center mb-8">
          <img 
            src="/uploads/20250915/76ecd1a8e0ff1d4c9503e6f8fe4c3.png" 
            alt="SAXO Logo" 
            className="h-16 w-auto"
            onError={(e) => {
              (e.target as HTMLImageElement).src = 'https://placehold.co/200x80/1a1f3c/00d4aa?text=SAXO';
            }}
          />
        </div>
        
        <h1 className="text-2xl font-bold text-white text-center mb-8">用戶登錄</h1>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-gray-400 text-sm mb-2">郵箱/手機號碼</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </span>
              <input
                type="text"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="請輸入您的郵箱/手機號碼"
                className="w-full bg-[#252a4a] border border-[#3a4070] rounded-lg py-3 pl-10 pr-4 text-white placeholder-gray-500 focus:outline-none focus:border-[#00d4aa]"
              />
            </div>
          </div>
          
          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="text-gray-400 text-sm">密碼</label>
              <a href="#" className="text-[#00d4aa] text-sm hover:underline">忘記密碼?</a>
            </div>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </span>
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="請輸入您的密碼"
                className="w-full bg-[#252a4a] border border-[#3a4070] rounded-lg py-3 pl-10 pr-10 text-white placeholder-gray-500 focus:outline-none focus:border-[#00d4aa]"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  {showPassword ? (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  ) : (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                  )}
                </svg>
              </button>
            </div>
          </div>
          
          <div className="flex items-center">
            <input
              type="checkbox"
              id="remember"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              className="w-4 h-4 rounded border-gray-600 bg-[#252a4a] text-[#00d4aa] focus:ring-[#00d4aa]"
            />
            <label htmlFor="remember" className="ml-2 text-gray-400 text-sm">記住我的登錄狀態</label>
          </div>
          
          <button
            type="submit"
            className="w-full bg-gradient-to-r from-[#00d4aa] to-[#00b894] text-white font-semibold py-3 rounded-lg hover:opacity-90 transition-opacity"
          >
            登錄
          </button>
          
          <div className="text-center text-gray-500">或</div>
        </form>
        
        <div className="mt-6 text-center">
          <span className="text-gray-400">還沒有帳戶？ </span>
          <button onClick={() => navigate('/register')} className="text-[#00d4aa] hover:underline">立即註冊</button>
        </div>
        
        <div className="mt-8 text-center text-gray-500 text-xs">
          2021-2026 Saxo 2025 LiziQing.Ex All rights reserved.
        </div>
      </main>
      
      <div className="fixed bottom-4 left-4 flex items-center gap-2 text-gray-400 text-sm">
        <img src="/base/tw-flag.svg" alt="TW Flag" className="w-5 h-5" onError={(e) => {
          (e.target as HTMLImageElement).style.display = 'none';
        }} />
        <span>繁體中文</span>
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </div>
    </div>
  );
}
