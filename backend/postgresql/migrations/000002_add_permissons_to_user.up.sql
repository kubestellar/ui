-- 1. Create enum type if not exists
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_permission_enum') THEN
        CREATE TYPE user_permission_enum AS ENUM ('read', 'write', 'admin');
    END IF;
END$$;

-- 2. Add column with enum array type and default value
ALTER TABLE users
ADD COLUMN permissions user_permission_enum[] NOT NULL DEFAULT ARRAY['admin'::user_permission_enum];
