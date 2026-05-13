-- ─────────────────────────────────────────────────────────────────────────────
-- 005_drop_unused_school_columns.sql
--
-- Drops columns removed in ER diagram v2.0 simplification:
--   fiscal_code, chamber_of_commerce_no, ministerial_authorization,
--   avg_exam_wait_days, has_female_instructor, instructor_specializations,
--   languages_spoken, documents_required, medical_visit, exam_fees,
--   pass_rates, proprietary_app, accessibility, founding_partner
--
-- Also drops school_completion view (was only used for founding partner gate).
-- ─────────────────────────────────────────────────────────────────────────────

-- 1. Drop dependent view
drop view if exists public.school_completion;

-- 2. Drop GIN indexes on removed array columns
drop index if exists public.driving_schools_languages_gin;
drop index if exists public.driving_schools_specs_gin;

-- 3. Drop columns
alter table public.driving_schools
  drop column if exists fiscal_code,
  drop column if exists chamber_of_commerce_no,
  drop column if exists ministerial_authorization,
  drop column if exists avg_exam_wait_days,
  drop column if exists has_female_instructor,
  drop column if exists instructor_specializations,
  drop column if exists languages_spoken,
  drop column if exists documents_required,
  drop column if exists medical_visit,
  drop column if exists exam_fees,
  drop column if exists pass_rates,
  drop column if exists proprietary_app,
  drop column if exists accessibility,
  drop column if exists founding_partner;
