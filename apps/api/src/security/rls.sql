-- Row-Level Security policies for Casa Meni (NFR8)
-- Each request sets `app.current_org` via SET LOCAL when using a per-request transaction.
-- The Postgres role used by the API must NOT be the table owner (or we use FORCE ROW LEVEL SECURITY).

-- Example bootstrap; intended to be run once by a DBA after `prisma db push`.
-- For Neon, run via the Neon SQL editor or `psql $DATABASE_URL -f rls.sql`.

ALTER TABLE properties           ENABLE ROW LEVEL SECURITY;
ALTER TABLE leases               ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions         ENABLE ROW LEVEL SECURITY;
ALTER TABLE maintenance_jobs     ENABLE ROW LEVEL SECURITY;
ALTER TABLE reservations         ENABLE ROW LEVEL SECURITY;
ALTER TABLE bank_accounts        ENABLE ROW LEVEL SECURITY;
ALTER TABLE bank_transactions    ENABLE ROW LEVEL SECURITY;
ALTER TABLE assets               ENABLE ROW LEVEL SECURITY;
ALTER TABLE preventive_tasks     ENABLE ROW LEVEL SECURITY;
ALTER TABLE capital_calls        ENABLE ROW LEVEL SECURITY;
ALTER TABLE deals                ENABLE ROW LEVEL SECURITY;
ALTER TABLE webhook_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE journal_entries      ENABLE ROW LEVEL SECURITY;
ALTER TABLE accounts             ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications        ENABLE ROW LEVEL SECURITY;
ALTER TABLE supply_items         ENABLE ROW LEVEL SECURITY;

ALTER TABLE properties           FORCE ROW LEVEL SECURITY;
ALTER TABLE leases               FORCE ROW LEVEL SECURITY;
ALTER TABLE transactions         FORCE ROW LEVEL SECURITY;
ALTER TABLE maintenance_jobs     FORCE ROW LEVEL SECURITY;
ALTER TABLE reservations         FORCE ROW LEVEL SECURITY;
ALTER TABLE bank_accounts        FORCE ROW LEVEL SECURITY;
ALTER TABLE bank_transactions    FORCE ROW LEVEL SECURITY;
ALTER TABLE assets               FORCE ROW LEVEL SECURITY;
ALTER TABLE preventive_tasks     FORCE ROW LEVEL SECURITY;
ALTER TABLE capital_calls        FORCE ROW LEVEL SECURITY;
ALTER TABLE deals                FORCE ROW LEVEL SECURITY;
ALTER TABLE webhook_subscriptions FORCE ROW LEVEL SECURITY;
ALTER TABLE journal_entries      FORCE ROW LEVEL SECURITY;
ALTER TABLE accounts             FORCE ROW LEVEL SECURITY;
ALTER TABLE notifications        FORCE ROW LEVEL SECURITY;
ALTER TABLE supply_items         FORCE ROW LEVEL SECURITY;

-- Bypass policy for super-admin / platform / migrations.
-- Requires: ALTER ROLE casa_meni_app SET app.bypass_rls = 'off';

-- Single helper: org isolation policy generator.
-- Note: we store organization_id with snake_case in DB.

CREATE POLICY org_isolation_select ON properties FOR SELECT USING (
  current_setting('app.bypass_rls', true) = 'on'
  OR organization_id = current_setting('app.current_org', true)
);
CREATE POLICY org_isolation_modify ON properties FOR ALL USING (
  current_setting('app.bypass_rls', true) = 'on'
  OR organization_id = current_setting('app.current_org', true)
) WITH CHECK (
  current_setting('app.bypass_rls', true) = 'on'
  OR organization_id = current_setting('app.current_org', true)
);

CREATE POLICY org_isolation_select ON leases FOR SELECT USING (
  current_setting('app.bypass_rls', true) = 'on'
  OR organization_id = current_setting('app.current_org', true)
);
CREATE POLICY org_isolation_modify ON leases FOR ALL USING (
  current_setting('app.bypass_rls', true) = 'on'
  OR organization_id = current_setting('app.current_org', true)
) WITH CHECK (
  current_setting('app.bypass_rls', true) = 'on'
  OR organization_id = current_setting('app.current_org', true)
);

CREATE POLICY org_isolation_select ON transactions FOR SELECT USING (
  current_setting('app.bypass_rls', true) = 'on'
  OR organization_id = current_setting('app.current_org', true)
);
CREATE POLICY org_isolation_modify ON transactions FOR ALL USING (
  current_setting('app.bypass_rls', true) = 'on'
  OR organization_id = current_setting('app.current_org', true)
) WITH CHECK (
  current_setting('app.bypass_rls', true) = 'on'
  OR organization_id = current_setting('app.current_org', true)
);

-- Same policy applied generically — repeat for each org-scoped table.
DO $$
DECLARE
  t TEXT;
BEGIN
  FOR t IN SELECT unnest(ARRAY[
    'maintenance_jobs','reservations','bank_accounts','bank_transactions',
    'assets','preventive_tasks','capital_calls','deals',
    'webhook_subscriptions','journal_entries','accounts','notifications',
    'supply_items'
  ])
  LOOP
    EXECUTE format(
      'CREATE POLICY org_isolation_select ON %I FOR SELECT USING (current_setting(''app.bypass_rls'', true) = ''on'' OR organization_id = current_setting(''app.current_org'', true))',
      t
    );
    EXECUTE format(
      'CREATE POLICY org_isolation_modify ON %I FOR ALL USING (current_setting(''app.bypass_rls'', true) = ''on'' OR organization_id = current_setting(''app.current_org'', true)) WITH CHECK (current_setting(''app.bypass_rls'', true) = ''on'' OR organization_id = current_setting(''app.current_org'', true))',
      t
    );
  END LOOP;
END;
$$;
