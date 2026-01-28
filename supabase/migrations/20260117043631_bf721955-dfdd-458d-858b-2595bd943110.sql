-- Add loss_type column to time_contract_configs table
ALTER TABLE time_contract_configs ADD COLUMN IF NOT EXISTS loss_type text DEFAULT 'rate';

-- Add comment for documentation
COMMENT ON COLUMN time_contract_configs.loss_type IS 'Loss calculation type: rate (proportional to yield rate) or full (100% of amount)';