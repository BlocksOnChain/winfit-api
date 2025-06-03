-- Create the postgres user if it doesn't exist
DO
$do$
BEGIN
   IF NOT EXISTS (
      SELECT FROM pg_catalog.pg_roles
      WHERE rolname = 'postgres') THEN
      CREATE ROLE postgres LOGIN PASSWORD 'password';
   END IF;
END
$do$;

-- Grant superuser privileges to postgres user
ALTER USER postgres WITH SUPERUSER CREATEDB CREATEROLE;

-- Create the winfit database if it doesn't exist
DO
$do$
BEGIN
   IF NOT EXISTS (SELECT FROM pg_database WHERE datname = 'winfit') THEN
      PERFORM dblink_exec('dbname=' || current_database(), 'CREATE DATABASE winfit');
   END IF;
EXCEPTION
   WHEN undefined_function THEN
      -- dblink not available, skip database creation here
      RAISE NOTICE 'Database winfit needs to be created manually';
END
$do$;

-- Grant all privileges on winfit database to postgres user
GRANT ALL PRIVILEGES ON DATABASE winfit TO postgres; 