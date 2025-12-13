-- PostgreSQL initialization script
-- This runs when the container is first created

-- Enable useful extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Grant privileges (already done by POSTGRES_USER but explicit is good)
GRANT ALL PRIVILEGES ON DATABASE furniture_db TO furniture;

-- Log successful initialization
DO $$
BEGIN
    RAISE NOTICE 'Database initialized successfully!';
END $$;
