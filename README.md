# SAXO Trading Platform Frontend Template

A 1:1 replica of the SAXO cryptocurrency/futures trading platform UI, built with React + TypeScript + Tailwind CSS.

## Features

- **10 Pages**: Login, Register, Home, Trade, Market, Wallet, Profile, Deposit, Withdraw, Trade Records
- **Traditional Chinese (繁體中文)**: All UI text in Traditional Chinese
- **Mobile-First Design**: Optimized for mobile devices with bottom navigation
- **Dark Theme**: Professional dark theme with cyan accent color (#00d4aa)

## Pages

| Route | Page | Description |
|-------|------|-------------|
| `/login` | 登入 | Login page with email/password form |
| `/register` | 註冊 | Registration page |
| `/` | 首頁 | Home page with market data and quick actions |
| `/trade` | 交易 | Trading page with K-line chart and buy/sell modal |
| `/market` | 市場 | Market page with filtering and favorites |
| `/wallet` | 錢包 | Wallet page with balance and asset distribution |
| `/profile` | 我的 | Profile page with settings menu |
| `/deposit` | 入款 | Deposit page with QR code and address |
| `/withdraw` | 取款 | Withdraw page with address input |
| `/trade-records` | 交易記錄 | Trade records with statistics |

## Tech Stack

- React 18
- TypeScript
- Vite
- Tailwind CSS
- Wouter (routing)

## Getting Started

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build
```

## License

MIT
