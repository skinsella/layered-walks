-- 0001 — extensions + enums
-- See docs/01-database-schema.md §1.

create extension if not exists postgis;
create extension if not exists pgcrypto;   -- gen_random_uuid()
create extension if not exists pg_trgm;     -- fuzzy theme/tour search

create type tour_status      as enum ('draft', 'in_review', 'published', 'archived');
create type creator_status   as enum ('pending', 'approved', 'suspended');
create type difficulty_level as enum ('easy', 'moderate', 'strenuous');
create type purchase_status  as enum ('pending', 'completed', 'refunded', 'failed');
create type payout_status    as enum ('pending', 'in_transit', 'paid', 'failed');
