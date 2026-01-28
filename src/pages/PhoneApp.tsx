import { useState, useEffect } from 'react';
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import PhoneFrame from '@/components/phone/PhoneFrame';

import PaymentHome from './payment-platform/PaymentHome';
import PaymentTrade from './payment-platform/PaymentTrade';
import PaymentMarket from './payment-platform/PaymentMarket';
import PaymentWallet from './payment-platform/PaymentWallet';
import PaymentProfile from './payment-platform/PaymentProfile';
import PaymentLogin from './payment-platform/PaymentLogin';
import PaymentRegister from './payment-platform/PaymentRegister';
import PaymentDeposit from './payment-platform/PaymentDeposit';
import PaymentWithdraw from './payment-platform/PaymentWithdraw';
import PaymentTradeRecords from './payment-platform/PaymentTradeRecords';

export default function PhoneApp() {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    if (location.pathname === '/' || location.pathname === '') {
      navigate('/home', { replace: true });
    }
  }, [location.pathname, navigate]);

  return (
    <PhoneFrame>
      <Routes>
        <Route path="/home" element={<PaymentHome />} />
        <Route path="/trade" element={<PaymentTrade />} />
        <Route path="/market" element={<PaymentMarket />} />
        <Route path="/wallet" element={<PaymentWallet />} />
        <Route path="/profile" element={<PaymentProfile />} />
        <Route path="/login" element={<PaymentLogin />} />
        <Route path="/register" element={<PaymentRegister />} />
        <Route path="/deposit" element={<PaymentDeposit />} />
        <Route path="/withdraw" element={<PaymentWithdraw />} />
        <Route path="/trade-records" element={<PaymentTradeRecords />} />
        <Route path="*" element={<PaymentHome />} />
      </Routes>
    </PhoneFrame>
  );
}
