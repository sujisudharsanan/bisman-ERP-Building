-- Fix audit trigger to handle UUID ids (avoid casting UUID to INTEGER)
CREATE OR REPLACE FUNCTION enhanced_audit_trigger_func()
RETURNS TRIGGER AS $$
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

        SELECT ARRAY_AGG(key) INTO v_changed_fields
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Fix users insert trigger to use password_hash column
CREATE OR REPLACE FUNCTION users_insert_fn()
RETURNS TRIGGER AS $$
DECLARE
    new_legacy_id INTEGER;
BEGIN
    IF NEW.id IS NULL THEN
        new_legacy_id := nextval('public.users_legacy_id_seq');
    ELSE
        new_legacy_id := NEW.id;
    END IF;

    INSERT INTO public.users_enhanced (
        id, legacy_id, username, email, password_hash, role, is_active,
        product_type, tenant_id, super_admin_id, created_at, updated_at,
        profile_pic_url, assigned_modules, page_permissions, theme_preference,
        email_verified, phone_verified, login_attempts, preferences
    ) VALUES (
        gen_random_uuid(),
        new_legacy_id,
        NEW.username,
        NEW.email,
        NEW.password_hash,
        NEW.role,
        COALESCE(NEW.is_active, true),
        COALESCE(NEW."productType", 'BUSINESS_ERP'),
        NEW.tenant_id,
        NEW.super_admin_id,
        COALESCE(NEW.created_at, NOW()),
        COALESCE(NEW.updated_at, NOW()),
        NEW.profile_pic_url,
        COALESCE(NEW."assignedModules", '[]'::jsonb),
        COALESCE(NEW."pagePermissions", '{}'::jsonb),
        COALESCE(NEW.theme_preference, 'bisman-default'),
        false, false, 0, '{}'::jsonb
    );

    NEW.id := new_legacy_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
