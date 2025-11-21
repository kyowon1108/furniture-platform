#!/bin/bash

echo "🚀 Setting up Furniture Platform Backend..."

# Check if conda environment is active
if [[ "$CONDA_DEFAULT_ENV" != "furniture-backend" ]]; then
    echo "⚠️  Please activate the furniture-backend conda environment first:"
    echo "   conda activate furniture-backend"
    exit 1
fi

echo "📦 Installing Python dependencies..."
pip install -r requirements.txt

echo "🗄️  Setting up database..."
alembic revision --autogenerate -m "Initial migration"
alembic upgrade head

echo "✅ Backend setup complete!"
echo ""
echo "To start the server, run:"
echo "   uvicorn app.main:socket_app --reload --host 0.0.0.0 --port 8000"
