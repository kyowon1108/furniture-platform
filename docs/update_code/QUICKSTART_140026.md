# Quick Start Guide

Get the 3D Furniture Platform running in 5 minutes!

## Prerequisites Check

```bash
# Check Python version (should be 3.9.18)
python --version

# Check Node.js version (should be 18+)
node --version

# Check if conda environment exists
conda env list | grep furniture-backend
```

## Step 1: Backend Setup (2 minutes)

```bash
# Navigate to backend
cd furniture-platform/backend

# Activate conda environment
conda activate furniture-backend

# Install dependencies
pip install -r requirements.txt

# Setup database
alembic revision --autogenerate -m "Initial migration"
alembic upgrade head

# Start server
uvicorn app.main:socket_app --reload --host 0.0.0.0 --port 8000
```

**Verify:** Open http://localhost:8000/docs - you should see Swagger UI

## Step 2: Frontend Setup (2 minutes)

Open a new terminal:

```bash
# Navigate to frontend
cd furniture-platform/frontend

# Install dependencies
npm install

# Start development server
npm run dev
```

**Verify:** Open http://localhost:3000 - you should see the landing page

## Step 3: Test the Platform (1 minute)

1. **Register an account:**
   - Click "Sign Up"
   - Enter email: `test@example.com`
   - Enter password: `password123`
   - Click "Sign Up"

2. **Create a project:**
   - You'll be redirected to Projects page
   - Click "New Project"
   - Choose "Manual Input" mode (or "PLY File Upload" if you have a .ply file)
   - Name: "My First Room"
   - Room dimensions: 10m × 3m × 8m
   - Click "Create"

3. **Open the editor:**
   - Click on your project
   - You should see the 3D editor with a grid

4. **Test controls:**
   - Drag with left mouse: Rotate camera
   - Scroll wheel: Zoom
   - Press `T`: Translate mode
   - Press `R`: Rotate mode
   - Press `S`: Scale mode

## Step 4: Test Real-time Collaboration

1. **Open a second browser window** (or incognito mode)
2. **Register a second account:** `test2@example.com`
3. **Create a project with the same name**
4. **Open both projects in the editor**
5. **Watch for real-time updates** (check connection status in top-left)

## Troubleshooting

### Backend won't start
```bash
# Kill any process on port 8000
lsof -ti:8000 | xargs kill -9

# Try again
uvicorn app.main:socket_app --reload --host 0.0.0.0 --port 8000
```

### Frontend won't start
```bash
# Clean install
rm -rf node_modules package-lock.json
npm install
npm run dev
```

### Database issues
```bash
# Reset database
rm dev.db
alembic upgrade head
```

## Running Tests

```bash
cd furniture-platform/backend
pytest tests/ -v
```

Expected output: All tests should pass ✅

## What's Next?

- Read the full [README.md](README.md) for detailed documentation
- Check [CHECKLIST.md](CHECKLIST.md) for implementation status
- Explore the API at http://localhost:8000/docs
- Start building your furniture layouts!

## Common Issues

**"Module not found" errors:**
- Make sure you're in the correct conda environment
- Run `pip install -r requirements.txt` again

**"Cannot connect to WebSocket":**
- Ensure backend is running on port 8000
- Check browser console for errors

**"401 Unauthorized":**
- Your JWT token may have expired
- Logout and login again

## Support

For issues or questions:
1. Check the troubleshooting section in README.md
2. Review the error logs in terminal
3. Check browser console for frontend errors

Happy building! 🏠✨
