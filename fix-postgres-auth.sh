#!/bin/bash

echo "=== PostgreSQL Authentication Fix for macOS ==="
echo ""

echo "Option 1: Try connecting with your system username"
echo "Running: psql -d postgres -c \"SELECT current_user;\""
if psql -d postgres -c "SELECT current_user;" 2>/dev/null; then
    echo "✅ Connected successfully with system user!"
    echo "Setting up postgres user and winfit database..."
    
    # Create postgres user
    psql -d postgres -c "
    DO \$\$
    BEGIN
        IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'postgres') THEN
            CREATE USER postgres WITH PASSWORD 'password' SUPERUSER CREATEDB CREATEROLE;
            RAISE NOTICE 'User postgres created with password: password';
        ELSE
            ALTER USER postgres WITH PASSWORD 'password';
            RAISE NOTICE 'User postgres password updated to: password';
        END IF;
    END
    \$\$;"
    
    # Create winfit database
    createdb winfit -O postgres 2>/dev/null || echo "Database winfit may already exist"
    
    echo "✅ Setup complete!"
    echo "Your database credentials:"
    echo "  Host: localhost"
    echo "  Port: 5432"
    echo "  Database: winfit"
    echo "  Username: postgres"
    echo "  Password: password"
    exit 0
fi

echo "❌ Could not connect with system user."
echo ""
echo "=== Manual Solutions ==="
echo ""
echo "Solution 1: Reset PostgreSQL password using single-user mode"
echo "1. Stop PostgreSQL server:"
echo "   sudo launchctl unload /Library/LaunchDaemons/com.edb.launchd.postgresql-16.plist"
echo ""
echo "2. Start PostgreSQL in single-user mode and create/reset user:"
echo "   sudo -u postgres /Library/PostgreSQL/16/bin/postgres --single -D /Library/PostgreSQL/16/data postgres"
echo "   Then type these commands (press Enter after each):"
echo "   CREATE USER postgres WITH PASSWORD 'password' SUPERUSER;"
echo "   CREATE DATABASE winfit OWNER postgres;"
echo "   Press Ctrl+D to exit"
echo ""
echo "3. Restart PostgreSQL:"
echo "   sudo launchctl load /Library/LaunchDaemons/com.edb.launchd.postgresql-16.plist"
echo ""
echo "Solution 2: Modify PostgreSQL authentication (temporarily)"
echo "1. Find and edit pg_hba.conf:"
echo "   sudo find /Library/PostgreSQL -name pg_hba.conf 2>/dev/null"
echo "2. Change 'md5' or 'password' to 'trust' for local connections"
echo "3. Reload PostgreSQL config: sudo -u postgres /Library/PostgreSQL/16/bin/pg_ctl reload"
echo "4. Connect and reset password, then change auth back to 'md5'"
echo ""
echo "Solution 3: Use environment variables (recommended for development)"
echo "Add these to your .env file:"
echo "DATABASE_HOST=localhost"
echo "DATABASE_PORT=5432"
echo "DATABASE_USER=postgres"
echo "DATABASE_PASSWORD=your_actual_password"
echo "DATABASE_NAME=winfit" 