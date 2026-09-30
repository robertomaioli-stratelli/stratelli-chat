#!/bin/sh
set -eu
psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" --set=app_password="$CHAT_DB_APP_PASSWORD" <<'SQL'
CREATE ROLE chat_app LOGIN PASSWORD :'app_password';
GRANT CONNECT ON DATABASE chat_local TO chat_app;
GRANT USAGE ON SCHEMA public TO chat_app;
ALTER DEFAULT PRIVILEGES FOR ROLE chat_owner IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO chat_app;
SQL
