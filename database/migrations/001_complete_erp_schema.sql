-- Complete ERP Schema Implementation
-- Migration: 001_complete_erp_schema
-- Purpose: Add missing core ERP financial and transactional tables
-- Author: System
-- Date: 2025-10-03

BEGIN;

-- Enable required extensions if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements";

-- Create erp schema if not exists
CREATE SCHEMA IF NOT EXISTS erp;

-- Set search path for this session
SET search_path TO erp, public;

-- =============================================
-- FINANCIAL MASTER DATA TABLES
-- =============================================

-- Chart of Accounts
CREATE TABLE IF NOT EXISTS chart_of_accounts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    account_code VARCHAR(20) NOT NULL UNIQUE,
    account_name VARCHAR(255) NOT NULL,
    account_type VARCHAR(50) NOT NULL CHECK (account_type IN ('ASSET', 'LIABILITY', 'EQUITY', 'REVENUE', 'EXPENSE')),
    parent_id UUID REFERENCES chart_of_accounts(id),
    level INTEGER NOT NULL DEFAULT 1,
    is_active BOOLEAN DEFAULT true,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    created_by UUID,
    updated_by UUID
);

-- Currency Master
CREATE TABLE IF NOT EXISTS currency (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    currency_code VARCHAR(3) NOT NULL UNIQUE,
    currency_name VARCHAR(100) NOT NULL,
    symbol VARCHAR(10),
    decimal_places INTEGER DEFAULT 2,
    is_base_currency BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    created_by UUID,
    updated_by UUID
);

-- Exchange Rates
CREATE TABLE IF NOT EXISTS exchange_rates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    from_currency_id UUID NOT NULL REFERENCES currency(id),
    to_currency_id UUID NOT NULL REFERENCES currency(id),
    exchange_rate NUMERIC(15,6) NOT NULL CHECK (exchange_rate > 0),
    effective_date DATE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    created_by UUID,
    UNIQUE(from_currency_id, to_currency_id, effective_date)
);

-- =============================================
-- CUSTOMER AND VENDOR MANAGEMENT
-- =============================================

-- Customers
CREATE TABLE IF NOT EXISTS customers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    customer_code VARCHAR(50) NOT NULL UNIQUE,
    company_name VARCHAR(255) NOT NULL,
    contact_person VARCHAR(255),
    email VARCHAR(255) UNIQUE,
    phone VARCHAR(20),
    address JSONB,
    tax_id VARCHAR(50),
    credit_limit NUMERIC(15,2) DEFAULT 0,
    payment_terms INTEGER DEFAULT 30, -- days
    customer_type VARCHAR(50) DEFAULT 'REGULAR',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    created_by UUID,
    updated_by UUID
);

-- Vendors/Suppliers
CREATE TABLE IF NOT EXISTS vendors (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    vendor_code VARCHAR(50) NOT NULL UNIQUE,
    company_name VARCHAR(255) NOT NULL,
    contact_person VARCHAR(255),
    email VARCHAR(255) UNIQUE,
    phone VARCHAR(20),
    address JSONB,
    tax_id VARCHAR(50),
    payment_terms INTEGER DEFAULT 30, -- days
    vendor_type VARCHAR(50) DEFAULT 'SUPPLIER',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    created_by UUID,
    updated_by UUID
);

-- =============================================
-- PRODUCT AND INVENTORY MANAGEMENT
-- =============================================

-- Product Categories
CREATE TABLE IF NOT EXISTS product_categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    category_code VARCHAR(50) NOT NULL UNIQUE,
    category_name VARCHAR(255) NOT NULL,
    parent_id UUID REFERENCES product_categories(id),
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    created_by UUID,
    updated_by UUID
);

-- Products
CREATE TABLE IF NOT EXISTS products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_code VARCHAR(50) NOT NULL UNIQUE,
    product_name VARCHAR(255) NOT NULL,
    category_id UUID REFERENCES product_categories(id),
    description TEXT,
    unit_of_measure VARCHAR(20) DEFAULT 'PIECE',
    unit_price NUMERIC(15,2) DEFAULT 0 CHECK (unit_price >= 0),
    cost_price NUMERIC(15,2) DEFAULT 0 CHECK (cost_price >= 0),
    minimum_stock_level NUMERIC(15,3) DEFAULT 0,
    maximum_stock_level NUMERIC(15,3),
    reorder_level NUMERIC(15,3),
    is_active BOOLEAN DEFAULT true,
    product_type VARCHAR(50) DEFAULT 'STOCK_ITEM',
    specifications JSONB,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    created_by UUID,
    updated_by UUID
);

-- =============================================
-- TRANSACTION TABLES
-- =============================================

-- Sales Orders
CREATE TABLE IF NOT EXISTS sales_orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_number VARCHAR(50) NOT NULL UNIQUE,
    customer_id UUID NOT NULL REFERENCES customers(id),
    order_date DATE NOT NULL DEFAULT CURRENT_DATE,
    delivery_date DATE,
    status VARCHAR(20) DEFAULT 'DRAFT' CHECK (status IN ('DRAFT', 'CONFIRMED', 'SHIPPED', 'DELIVERED', 'CANCELLED')),
    currency_id UUID REFERENCES currency(id),
    exchange_rate NUMERIC(15,6) DEFAULT 1,
    subtotal NUMERIC(15,2) DEFAULT 0 CHECK (subtotal >= 0),
    tax_amount NUMERIC(15,2) DEFAULT 0 CHECK (tax_amount >= 0),
    discount_amount NUMERIC(15,2) DEFAULT 0 CHECK (discount_amount >= 0),
    total_amount NUMERIC(15,2) GENERATED ALWAYS AS (subtotal + tax_amount - discount_amount) STORED,
    notes TEXT,
    delivery_address JSONB,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    created_by UUID,
    updated_by UUID
);

-- Sales Order Details
CREATE TABLE IF NOT EXISTS sales_order_details (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sales_order_id UUID NOT NULL REFERENCES sales_orders(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(id),
    quantity NUMERIC(15,3) NOT NULL CHECK (quantity > 0),
    unit_price NUMERIC(15,2) NOT NULL CHECK (unit_price >= 0),
    discount_percentage NUMERIC(5,2) DEFAULT 0 CHECK (discount_percentage >= 0 AND discount_percentage <= 100),
    line_total NUMERIC(15,2) GENERATED ALWAYS AS (quantity * unit_price * (1 - discount_percentage/100)) STORED,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(sales_order_id, product_id)
);

-- Purchase Orders
CREATE TABLE IF NOT EXISTS purchase_orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_number VARCHAR(50) NOT NULL UNIQUE,
    vendor_id UUID NOT NULL REFERENCES vendors(id),
    order_date DATE NOT NULL DEFAULT CURRENT_DATE,
    expected_delivery_date DATE,
    status VARCHAR(20) DEFAULT 'DRAFT' CHECK (status IN ('DRAFT', 'APPROVED', 'SENT', 'RECEIVED', 'CANCELLED')),
    currency_id UUID REFERENCES currency(id),
    exchange_rate NUMERIC(15,6) DEFAULT 1,
    subtotal NUMERIC(15,2) DEFAULT 0 CHECK (subtotal >= 0),
    tax_amount NUMERIC(15,2) DEFAULT 0 CHECK (tax_amount >= 0),
    total_amount NUMERIC(15,2) GENERATED ALWAYS AS (subtotal + tax_amount) STORED,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    created_by UUID,
    updated_by UUID
);

-- Purchase Order Details
CREATE TABLE IF NOT EXISTS purchase_order_details (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    purchase_order_id UUID NOT NULL REFERENCES purchase_orders(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(id),
    quantity NUMERIC(15,3) NOT NULL CHECK (quantity > 0),
    unit_price NUMERIC(15,2) NOT NULL CHECK (unit_price >= 0),
    line_total NUMERIC(15,2) GENERATED ALWAYS AS (quantity * unit_price) STORED,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(purchase_order_id, product_id)
);

-- =============================================
-- INVENTORY MOVEMENTS (PARTITIONED)
-- =============================================

-- Main inventory movements table (will be partitioned by month)
CREATE TABLE inventory_movements (
    id UUID DEFAULT uuid_generate_v4(),
    movement_date TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    product_id UUID NOT NULL REFERENCES products(id),
    movement_type VARCHAR(20) NOT NULL CHECK (movement_type IN ('IN', 'OUT', 'TRANSFER', 'ADJUSTMENT')),
    reference_type VARCHAR(50), -- 'SALES_ORDER', 'PURCHASE_ORDER', 'TRANSFER', 'ADJUSTMENT'
    reference_id UUID,
    quantity NUMERIC(15,3) NOT NULL CHECK (quantity != 0),
    unit_cost NUMERIC(15,2) CHECK (unit_cost >= 0),
    warehouse_id UUID, -- For future warehouse management
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    created_by UUID,
    PRIMARY KEY (id, movement_date)
) PARTITION BY RANGE (movement_date);

-- Create initial partitions for current and next few months
CREATE TABLE inventory_movements_2025_10 PARTITION OF inventory_movements
    FOR VALUES FROM ('2025-10-01') TO ('2025-11-01');

CREATE TABLE inventory_movements_2025_11 PARTITION OF inventory_movements
    FOR VALUES FROM ('2025-11-01') TO ('2025-12-01');

CREATE TABLE inventory_movements_2025_12 PARTITION OF inventory_movements
    FOR VALUES FROM ('2025-12-01') TO ('2026-01-01');

-- =============================================
-- AUDIT LOG PARTITIONING
-- =============================================

-- Convert existing audit_logs to partitioned table
-- First, create a new partitioned table
CREATE TABLE audit_logs_new (
    id UUID DEFAULT uuid_generate_v4(),
    table_name VARCHAR(50) NOT NULL,
    record_id VARCHAR(50) NOT NULL,
    action VARCHAR(20) NOT NULL,
    old_data JSONB,
    new_data JSONB,
    changed_fields TEXT[],
    user_id UUID,
    session_id VARCHAR(255),
    ip_address INET,
    user_agent TEXT,
    timestamp TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id, timestamp)
) PARTITION BY RANGE (timestamp);

-- Create audit log partitions
CREATE TABLE audit_logs_2025_10 PARTITION OF audit_logs_new
    FOR VALUES FROM ('2025-10-01') TO ('2025-11-01');

CREATE TABLE audit_logs_2025_11 PARTITION OF audit_logs_new
    FOR VALUES FROM ('2025-11-01') TO ('2025-12-01');

CREATE TABLE audit_logs_2025_12 PARTITION OF audit_logs_new
    FOR VALUES FROM ('2025-12-01') TO ('2026-01-01');

-- =============================================
-- INDEXES FOR PERFORMANCE
-- =============================================

-- Chart of Accounts indexes
CREATE INDEX IF NOT EXISTS idx_chart_accounts_code ON chart_of_accounts(account_code);
CREATE INDEX IF NOT EXISTS idx_chart_accounts_type ON chart_of_accounts(account_type);
CREATE INDEX IF NOT EXISTS idx_chart_accounts_parent ON chart_of_accounts(parent_id);

-- Currency indexes
CREATE INDEX IF NOT EXISTS idx_currency_code ON currency(currency_code);
CREATE INDEX IF NOT EXISTS idx_currency_base ON currency(is_base_currency) WHERE is_base_currency = true;

-- Exchange rates indexes
CREATE INDEX IF NOT EXISTS idx_exchange_rates_date ON exchange_rates(effective_date DESC);
CREATE INDEX IF NOT EXISTS idx_exchange_rates_currency_date ON exchange_rates(from_currency_id, to_currency_id, effective_date DESC);

-- Customer indexes
CREATE INDEX IF NOT EXISTS idx_customers_code ON customers(customer_code);
CREATE INDEX IF NOT EXISTS idx_customers_email ON customers(email) WHERE email IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_customers_active ON customers(is_active) WHERE is_active = true;

-- Vendor indexes
CREATE INDEX IF NOT EXISTS idx_vendors_code ON vendors(vendor_code);
CREATE INDEX IF NOT EXISTS idx_vendors_email ON vendors(email) WHERE email IS NOT NULL;

-- Product indexes
CREATE INDEX IF NOT EXISTS idx_products_code ON products(product_code);
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category_id);
CREATE INDEX IF NOT EXISTS idx_products_active ON products(is_active) WHERE is_active = true;

-- Sales order indexes
CREATE INDEX IF NOT EXISTS idx_sales_orders_number ON sales_orders(order_number);
CREATE INDEX IF NOT EXISTS idx_sales_orders_customer ON sales_orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_sales_orders_date ON sales_orders(order_date DESC);
CREATE INDEX IF NOT EXISTS idx_sales_orders_status ON sales_orders(status);

-- Sales order details indexes
CREATE INDEX IF NOT EXISTS idx_sales_order_details_order ON sales_order_details(sales_order_id);
CREATE INDEX IF NOT EXISTS idx_sales_order_details_product ON sales_order_details(product_id);

-- Purchase order indexes
CREATE INDEX IF NOT EXISTS idx_purchase_orders_number ON purchase_orders(order_number);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_vendor ON purchase_orders(vendor_id);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_date ON purchase_orders(order_date DESC);

-- Inventory movement indexes (will be inherited by partitions)
CREATE INDEX IF NOT EXISTS idx_inventory_movements_date ON inventory_movements(movement_date DESC);
CREATE INDEX IF NOT EXISTS idx_inventory_movements_product ON inventory_movements(product_id);
CREATE INDEX IF NOT EXISTS idx_inventory_movements_type ON inventory_movements(movement_type);
CREATE INDEX IF NOT EXISTS idx_inventory_movements_reference ON inventory_movements(reference_type, reference_id);

-- Audit log indexes (will be inherited by partitions)
CREATE INDEX IF NOT EXISTS idx_audit_logs_new_timestamp ON audit_logs_new(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_new_table ON audit_logs_new(table_name);
CREATE INDEX IF NOT EXISTS idx_audit_logs_new_user ON audit_logs_new(user_id);

COMMIT;
