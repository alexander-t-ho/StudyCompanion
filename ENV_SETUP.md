# Environment Variables Setup ✅

## API Key Storage in .env File

Your API keys are now stored in `backend/.env` which is **protected from git** and will **not be committed** to your repository.

## Setup Instructions

### 1. Edit the .env File

Open `backend/.env` and add your API keys:

```bash
# Edit the file
nano backend/.env
# or
code backend/.env
```

Add your keys:
```env
OPENAI_API_KEY=sk-your-actual-openai-key-here
OPENROUTER_API_KEY=sk-or-your-actual-openrouter-key-here
USE_OPENROUTER=false
APP_URL=http://localhost:3000
```

### 2. Restart Rails Server

After editing `.env`, restart the Rails server to load the new environment variables:

```bash
# Stop the current server (Ctrl+C or kill the process)
# Then restart:
cd backend
eval "$(rbenv init - zsh)"
bundle exec rails server
```

### 3. How It Works

**Priority Order:**
1. **API key from form** (if provided in frontend) - highest priority
2. **API key from localStorage** (if saved in browser)
3. **API key from .env file** - fallback if nothing else provided

This means:
- You can still enter API keys manually in the form (they'll be saved to localStorage)
- If you don't enter a key, the backend will use the key from `.env`
- Best practice: Set keys in `.env` so you don't need to enter them at all!

## Security

✅ **`.env` is in `.gitignore`** - Your keys will NOT be committed to git
✅ **`.env.example` is in git** - Template file for other developers (no real keys)
✅ **Keys are never exposed** - Only used server-side

## File Structure

```
StudyCompanion/
├── .gitignore          # Excludes .env files
├── backend/
│   ├── .env            # YOUR ACTUAL KEYS (not in git) ⚠️
│   └── .env.example    # Template file (in git) ✅
```

## Verification

To verify your `.env` is working:

1. **Check if .env exists:**
   ```bash
   ls -la backend/.env
   ```

2. **Verify it's in .gitignore:**
   ```bash
   git status
   # .env should NOT appear in the list
   ```

3. **Test the API:**
   - Don't enter an API key in the form
   - Click "Generate Transcript"
   - It should use the key from `.env`

## Troubleshooting

**Keys not working?**
- Make sure you restarted the Rails server after editing `.env`
- Check for typos in the `.env` file
- Verify the keys start with `sk-` (OpenAI) or `sk-or-` (OpenRouter)

**Still asking for API key?**
- The frontend form will still show the API key field
- You can leave it empty if keys are in `.env`
- Or enter a key to override the `.env` value

**Want to use different keys?**
- Edit `backend/.env` and restart the server
- Or enter keys in the form (they'll be saved to localStorage)

## Next Steps

1. ✅ Edit `backend/.env` with your actual API keys
2. ✅ Restart the Rails server
3. ✅ Try generating a transcript without entering a key in the form
4. ✅ It should work using keys from `.env`!

