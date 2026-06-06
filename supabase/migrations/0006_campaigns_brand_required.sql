-- gamer / 0006_campaigns_brand_required.sql
-- Phase 3 step 3.0 (completion): once every campaign has an owning brand,
-- make the link mandatory. Run AFTER 0005 and after any existing rows have
-- been backfilled with a brand_id (the seed assigns one to all test campaigns).
alter table campaigns alter column brand_id set not null;
