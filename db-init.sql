DO $$ BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'vscode_readonly') THEN
    CREATE ROLE vscode_readonly WITH LOGIN PASSWORD 'vscode_readonly';
  END IF;
END $$;
GRANT CONNECT ON DATABASE uniclaw TO vscode_readonly;
GRANT USAGE ON SCHEMA public TO vscode_readonly;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO vscode_readonly;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON TABLES TO vscode_readonly;
