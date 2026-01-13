-- Fix: Resolve ambiguous 'key' column reference in enhanced_audit_trigger_func
-- The ARRAY_AGG(key) was ambiguous because both new_kv and old_kv have a 'key' column
-- Changed to ARRAY_AGG(new_kv.key) to explicitly reference the new data's key

CREATE OR REPLACE FUNCTION public.enhanced_audit_trigger_func()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
    v_old_data JSONB;
    v_new_data JSONB;
    v_changed_fields TEXT[];
    v_user_id INTEGER;
    v_tenant_id UUID;
    v_super_admin_id INTEGER;
    v_service_name TEXT;
    v_request_id UUID;
BEGIN
    -- Get context from session variables
    v_user_id := NULLIF(current_setting('app.user_id', true), '')::INTEGER;
    v_tenant_id := NULLIF(current_setting('app.tenant_id', true), '')::UUID;
    v_super_admin_id := NULLIF(current_setting('app.super_admin_id', true), '')::INTEGER;
    v_service_name := COALESCE(NULLIF(current_setting('app.service_name', true), ''), 'unknown');
    v_request_id := NULLIF(current_setting('app.request_id', true), '')::UUID;

    IF TG_OP = 'DELETE' THEN
        v_old_data := to_jsonb(OLD);

        INSERT INTO audit_logs (
            user_id, action, table_name, record_id,
            old_values, service_name, service_user,
            tenant_id, super_admin_id, request_id, created_at
        )
        VALUES (
            v_user_id, 'DELETE', TG_TABLE_NAME, NULL,
            v_old_data, v_service_name, current_user,
            v_tenant_id, v_super_admin_id, v_request_id, NOW()
        );

        RETURN OLD;

    ELSIF TG_OP = 'UPDATE' THEN
        v_old_data := to_jsonb(OLD);
        v_new_data := to_jsonb(NEW);

        -- FIX: Use new_kv.key instead of ambiguous 'key'
        SELECT ARRAY_AGG(new_kv.key) INTO v_changed_fields
        FROM jsonb_each(v_new_data) AS new_kv(key, value)
        LEFT JOIN jsonb_each(v_old_data) AS old_kv(key, value)
            ON new_kv.key = old_kv.key
        WHERE new_kv.value IS DISTINCT FROM old_kv.value;

        INSERT INTO audit_logs (
            user_id, action, table_name, record_id,
            old_values, new_values, changed_fields,
            service_name, service_user,
            tenant_id, super_admin_id, request_id, created_at
        )
        VALUES (
            v_user_id, 'UPDATE', TG_TABLE_NAME, NULL,
            v_old_data, v_new_data, v_changed_fields,
            v_service_name, current_user,
            v_tenant_id, v_super_admin_id, v_request_id, NOW()
        );

        RETURN NEW;

    ELSIF TG_OP = 'INSERT' THEN
        v_new_data := to_jsonb(NEW);

        INSERT INTO audit_logs (
            user_id, action, table_name, record_id,
            new_values, service_name, service_user,
            tenant_id, super_admin_id, request_id, created_at
        )
        VALUES (
            v_user_id, 'INSERT', TG_TABLE_NAME, NULL,
            v_new_data, v_service_name, current_user,
            v_tenant_id, v_super_admin_id, v_request_id, NOW()
        );

        RETURN NEW;
    END IF;

    RETURN NULL;
END;
$function$;
