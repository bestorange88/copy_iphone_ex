-- Seed data for development and testing
-- This file contains sample data for the database

-- Sample deposit addresses
INSERT INTO public.deposit_addresses (coin_symbol, coin_name, network, address, min_deposit, confirmations_required, is_active)
VALUES 
  ('BTC', 'Bitcoin', 'Bitcoin', '1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa', 0.001, 3, true),
  ('ETH', 'Ethereum', 'ERC20', '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb', 0.01, 12, true),
  ('USDT', 'Tether', 'TRC20', 'TYASr5UV6HEcXatwdFQfmLVUqQQQMUxHLS', 10, 1, true),
  ('USDT', 'Tether', 'ERC20', '0xdAC17F958D2ee523a2206206994597C13D831ec7', 10, 12, true)
ON CONFLICT DO NOTHING;

-- Sample earn products
INSERT INTO public.earn_products (product_type, coin_symbol, coin_name, apy_rate, lock_period_days, min_amount, max_amount, risk_level, is_active)
VALUES 
  ('flexible', 'USDT', 'Tether', 5.00, NULL, 100, NULL, 'low', true),
  ('fixed', 'USDT', 'Tether', 8.00, 30, 1000, 100000, 'low', true),
  ('fixed', 'BTC', 'Bitcoin', 6.50, 90, 0.01, 10, 'medium', true),
  ('flexible', 'ETH', 'Ethereum', 4.50, NULL, 0.1, NULL, 'low', true)
ON CONFLICT DO NOTHING;

-- Sample OTC merchants
INSERT INTO public.otc_merchants (merchant_name, merchant_level, completion_rate, support_coins, is_active)
VALUES 
  ('Global Trader', 'gold', 98.5, ARRAY['BTC', 'ETH', 'USDT'], true),
  ('Fast Exchange', 'silver', 95.0, ARRAY['BTC', 'USDT'], true),
  ('Crypto Pro', 'platinum', 99.2, ARRAY['BTC', 'ETH', 'USDT', 'BNB'], true)
ON CONFLICT DO NOTHING;

-- Sample time contract assets
INSERT INTO public.time_contract_assets (coin_symbol, coin_name, min_stake_amount, is_active)
VALUES 
  ('BTC', 'Bitcoin', 0.001, true),
  ('ETH', 'Ethereum', 0.01, true),
  ('USDT', 'Tether', 100, true)
ON CONFLICT DO NOTHING;

-- Sample time contract configurations
INSERT INTO public.time_contract_configs (duration_minutes, profit_rate, min_amount, max_amount, is_active)
VALUES 
  (1, 0.85, 10, 10000, true),
  (3, 2.50, 10, 10000, true),
  (5, 4.20, 10, 10000, true),
  (10, 8.50, 10, 10000, true)
ON CONFLICT DO NOTHING;

-- Sample platform announcements
INSERT INTO public.platform_announcements (title, content, is_important, published_at)
VALUES 
  ('Welcome to ARX Exchange', 'Welcome to our cryptocurrency trading platform. Start trading with confidence!', true, NOW()),
  ('New Trading Pairs Available', 'We have added support for more trading pairs. Check out the markets page for details.', false, NOW() - INTERVAL '1 day'),
  ('Maintenance Notice', 'Scheduled maintenance will be performed on Sunday at 2:00 AM UTC.', true, NOW() - INTERVAL '2 days')
ON CONFLICT DO NOTHING;

-- Sample crypto news
INSERT INTO public.crypto_news (title, summary, content, source, source_url, category, language, published_at, is_hot)
VALUES 
  ('Bitcoin Reaches New Milestone', 'Bitcoin continues its upward trend in the market.', 'Bitcoin has shown strong performance this week, reaching new price levels. Market analysts are optimistic about future trends.', 'CryptoNews', 'https://example.com/news/1', 'market', 'en', NOW(), true),
  ('Ethereum Upgrade Successful', 'Latest Ethereum network upgrade completed without issues.', 'The Ethereum network has successfully completed its latest upgrade, improving transaction speeds and reducing fees.', 'BlockchainDaily', 'https://example.com/news/2', 'technology', 'en', NOW() - INTERVAL '1 day', false),
  ('比特币创新高', '比特币市场表现强劲', '比特币本周表现强劲，达到新的价格水平。市场分析师对未来趋势持乐观态度。', '加密资讯', 'https://example.com/news/3', 'market', 'zh-CN', NOW(), true)
ON CONFLICT DO NOTHING;

-- Sample system configurations
INSERT INTO public.system_configs (config_key, config_value, description)
VALUES 
  ('trading_fee_rate', '{"maker": 0.001, "taker": 0.002}'::jsonb, 'Trading fee rates for maker and taker'),
  ('withdrawal_fee', '{"BTC": 0.0005, "ETH": 0.005, "USDT": 1}'::jsonb, 'Withdrawal fees by currency'),
  ('min_withdrawal', '{"BTC": 0.001, "ETH": 0.01, "USDT": 10}'::jsonb, 'Minimum withdrawal amounts'),
  ('kyc_required_amount', '{"USD": 10000}'::jsonb, 'Amount threshold requiring KYC verification')
ON CONFLICT (config_key) DO UPDATE SET config_value = EXCLUDED.config_value;
