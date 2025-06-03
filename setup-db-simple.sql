-- Simple database setup script
-- Run this with: psql -f setup-db-simple.sql

-- Create user postgres with password
CREATE USER postgres WITH PASSWORD 'password' SUPERUSER CREATEDB CREATEROLE;

-- Create winfit database
CREATE DATABASE winfit OWNER postgres;

-- Grant all privileges on winfit database to postgres user
GRANT ALL PRIVILEGES ON DATABASE winfit TO postgres; 