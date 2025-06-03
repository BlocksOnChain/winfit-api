#!/bin/bash

echo "Setting up PostgreSQL database for winfit-api..."

# Try to connect with different authentication methods
echo "Attempting to connect to PostgreSQL..."

# Method 1: Try connecting as current user
if psql -d postgres -c "SELECT 1;" > /dev/null 2>&1; then
    echo "Connected successfully as current user"
    
    # Create postgres user if it doesn't exist
    echo "Creating postgres user..."
    psql -d postgres -c "
    DO \$\$
    BEGIN
        IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'postgres') THEN
            CREATE USER postgres WITH PASSWORD 'password' SUPERUSER CREATEDB CREATEROLE;
            RAISE NOTICE 'User postgres created successfully';
        ELSE
            ALTER USER postgres WITH PASSWORD 'password';
            RAISE NOTICE 'User postgres already exists, password updated';
        END IF;
    END
    \$\$;
    "
    
    # Create winfit database if it doesn't exist
    echo "Creating winfit database..."
    psql -d postgres -c "
    SELECT 'CREATE DATABASE winfit'
    WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'winfit');
    " | grep -q "CREATE DATABASE" && createdb winfit -O postgres
    
    echo "Database setup completed successfully!"
    echo ""
    echo "Database credentials:"
    echo "  Host: localhost"
    echo "  Port: 5432"
    echo "  Database: winfit"
    echo "  Username: postgres"
    echo "  Password: password"
    
else
    echo "Could not connect to PostgreSQL."
    echo "Please make sure PostgreSQL is running and you have access."
    echo ""
    echo "You may need to:"
    echo "1. Start PostgreSQL: brew services start postgresql"
    echo "2. Create a superuser: createuser -s \$(whoami)"
    echo "3. Or connect with proper credentials"
    exit 1
fi 