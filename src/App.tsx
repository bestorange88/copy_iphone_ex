import { Route, Switch } from 'wouter';
import {
  PaymentLogin,
  PaymentRegister,
  PaymentHome,
  PaymentTrade,
  PaymentMarket,
  PaymentWallet,
  PaymentProfile,
  PaymentDeposit,
  PaymentWithdraw,
  PaymentTradeRecords,
} from './pages/payment-platform';

function App() {
  return (
    <Switch>
      <Route path="/login" component={PaymentLogin} />
      <Route path="/register" component={PaymentRegister} />
      <Route path="/" component={PaymentHome} />
      <Route path="/trade" component={PaymentTrade} />
      <Route path="/market" component={PaymentMarket} />
      <Route path="/wallet" component={PaymentWallet} />
      <Route path="/profile" component={PaymentProfile} />
      <Route path="/deposit" component={PaymentDeposit} />
      <Route path="/withdraw" component={PaymentWithdraw} />
      <Route path="/trade-records" component={PaymentTradeRecords} />
    </Switch>
  );
}

export default App;
