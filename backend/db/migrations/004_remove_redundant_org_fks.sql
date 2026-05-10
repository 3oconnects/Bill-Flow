-- ============================================================
-- 004: CONFIRM SIMPLE ORG FKs FOR DIRECT OWNERSHIP
-- Every table gets org_id → organizations(id) for ownership.
-- Composite FKs handle cross-entity org-level isolation.
-- This is idempotent — safe to run regardless of current state.
-- ============================================================
BEGIN;

-- Drop then re-add to ensure correct definition
ALTER TABLE sessions        DROP CONSTRAINT IF EXISTS fk_sessions_org;
ALTER TABLE invoice_items   DROP CONSTRAINT IF EXISTS fk_items_org;
ALTER TABLE product_vendors DROP CONSTRAINT IF EXISTS fk_pv_org;
ALTER TABLE warranty_claims DROP CONSTRAINT IF EXISTS fk_warranty_org;
ALTER TABLE vendor_documents DROP CONSTRAINT IF EXISTS fk_vdocs_org;

ALTER TABLE sessions        ADD CONSTRAINT fk_sessions_org FOREIGN KEY (org_id) REFERENCES organizations(id) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE invoice_items   ADD CONSTRAINT fk_items_org    FOREIGN KEY (org_id) REFERENCES organizations(id) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE product_vendors ADD CONSTRAINT fk_pv_org       FOREIGN KEY (org_id) REFERENCES organizations(id) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE warranty_claims ADD CONSTRAINT fk_warranty_org  FOREIGN KEY (org_id) REFERENCES organizations(id) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE vendor_documents ADD CONSTRAINT fk_vdocs_org   FOREIGN KEY (org_id) REFERENCES organizations(id) ON DELETE RESTRICT ON UPDATE CASCADE;

COMMIT;
