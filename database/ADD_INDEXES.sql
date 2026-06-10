-- Performance optimization indexes for finance page
-- Run this script to add indexes that will significantly improve query performance

-- Indexes for finance_income table
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_finance_income_date ON finance_income(tx_date DESC);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_finance_income_type ON finance_income(type);

-- Indexes for finance_expense table
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_finance_expense_date ON finance_expense(tx_date DESC);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_finance_expense_type ON finance_expense(type);

-- Indexes for finance_warist table
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_finance_warist_date ON finance_warist(tx_date DESC);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_finance_warist_type ON finance_warist(type);

-- Indexes for investment_transactions table
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_investment_transactions_date ON investment_transactions(tx_date DESC);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_investment_transactions_type ON investment_transactions(type);

-- Indexes for inventory_items table
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_inventory_items_kategori ON inventory_items(kategori);

-- For SQLite (run separately if using SQLite)
-- CREATE INDEX IF NOT EXISTS idx_finance_income_date ON finance_income(tx_date DESC);
-- CREATE INDEX IF NOT EXISTS idx_finance_income_type ON finance_income(type);
-- CREATE INDEX IF NOT EXISTS idx_finance_expense_date ON finance_expense(tx_date DESC);
-- CREATE INDEX IF NOT EXISTS idx_finance_expense_type ON finance_expense(type);
-- CREATE INDEX IF NOT EXISTS idx_finance_warist_date ON finance_warist(tx_date DESC);
-- CREATE INDEX IF NOT EXISTS idx_finance_warist_type ON finance_warist(type);
-- CREATE INDEX IF NOT EXISTS idx_investment_transactions_date ON investment_transactions(tx_date DESC);
-- CREATE INDEX IF NOT EXISTS idx_investment_transactions_type ON investment_transactions(type);
-- CREATE INDEX IF NOT EXISTS idx_inventory_items_kategori ON inventory_items(kategori);