# How to Start the Servers

## Quick Start

### 1. Start Backend (Rails)
```bash
cd backend
eval "$(rbenv init -)"
PORT=3002 bundle exec rails server
```

### 2. Start Frontend (Vite/React)
```bash
cd frontend
npm run dev
```

## Server Ports

- **Backend**: http://localhost:3002
- **Frontend**: http://localhost:3000

## Access the Application

Open your browser and go to: **http://localhost:3000**

## Troubleshooting

### If backend won't start:
1. Make sure Ruby 3.2.0 is active: `rbenv local 3.2.0`
2. Install bundler: `gem install bundler:2.7.2`
3. Install gems: `bundle install`
4. Check database: `bundle exec rails db:migrate`

### If frontend won't start:
1. Install dependencies: `npm install`
2. Check if port 3000 is available: `lsof -ti:3000`
3. Kill process if needed: `kill -9 $(lsof -ti:3000)`

### If you see "site can't be reached":
1. Check both servers are running:
   - Backend: `lsof -ti:3002`
   - Frontend: `lsof -ti:3000`
2. Make sure you're accessing http://localhost:3000 (not 3002)
3. Check browser console for errors

## Background Processes

To run both servers in the background:

```bash
# Terminal 1 - Backend
cd backend && eval "$(rbenv init -)" && PORT=3002 bundle exec rails server &

# Terminal 2 - Frontend  
cd frontend && npm run dev &
```

To stop background processes:
```bash
# Kill backend
kill -9 $(lsof -ti:3002)

# Kill frontend
kill -9 $(lsof -ti:3000)
```
