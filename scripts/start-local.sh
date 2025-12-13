#!/bin/bash
# Local development startup script with PostgreSQL
# Usage: ./scripts/start-local.sh

set -e

echo "========================================"
echo "Starting Local Development Environment"
echo "========================================"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo -e "${YELLOW}Docker is not running. Please start Docker first.${NC}"
    exit 1
fi

# Start PostgreSQL container
echo -e "\n${GREEN}1. Starting PostgreSQL container...${NC}"
docker compose up -d postgres

# Wait for PostgreSQL to be ready
echo -e "\n${GREEN}2. Waiting for PostgreSQL to be ready...${NC}"
until docker compose exec -T postgres pg_isready -U furniture -d furniture_db > /dev/null 2>&1; do
    echo "   Waiting..."
    sleep 2
done
echo "   PostgreSQL is ready!"

# Check if .env exists, if not create from example
if [ ! -f backend/.env ]; then
    echo -e "\n${GREEN}3. Creating .env from .env.example...${NC}"
    cp backend/.env.example backend/.env
    echo "   Created backend/.env"
    echo "   Please update SECRET_KEY and AWS credentials!"
else
    echo -e "\n${GREEN}3. .env file already exists${NC}"
fi

# Install Python dependencies
echo -e "\n${GREEN}4. Installing Python dependencies...${NC}"
cd backend
if [ ! -d "venv" ]; then
    python3 -m venv venv
fi
source venv/bin/activate
pip install -q -r requirements.txt

# Check if migration is needed
echo -e "\n${GREEN}5. Checking database...${NC}"
POSTGRES_USERS=$(docker compose exec -T postgres psql -U furniture -d furniture_db -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';" 2>/dev/null | tr -d ' ' || echo "0")

if [ "$POSTGRES_USERS" = "0" ] || [ -z "$POSTGRES_USERS" ]; then
    echo "   Database is empty. Running Alembic migrations..."
    alembic upgrade head

    # Check if SQLite has data to migrate
    if [ -f "dev.db" ]; then
        echo -e "\n${GREEN}6. Found SQLite database. Migrating data...${NC}"
        python scripts/migrate_sqlite_to_postgres.py
    fi
else
    echo "   Database already has tables. Skipping migration."
fi

echo -e "\n${GREEN}========================================"
echo "Environment Ready!"
echo "========================================${NC}"
echo ""
echo "PostgreSQL: localhost:5433"
echo "  Database: furniture_db"
echo "  User:     furniture"
echo "  Password: furniture123"
echo ""
echo "To start the backend server:"
echo "  cd backend && source venv/bin/activate"
echo "  uvicorn app.main:socket_app --host 0.0.0.0 --port 8008 --reload"
echo ""
echo "To start the frontend:"
echo "  cd frontend && npm run dev"
echo ""
echo "To view database (pgAdmin):"
echo "  docker compose --profile tools up -d pgadmin"
echo "  Open http://localhost:5050"
echo ""
