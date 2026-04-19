# Push to GitHub

## Step 1 — Create the repo
Go to https://github.com/new and create a repo called `passai-web` (make it Private if you want).

## Step 2 — Push from Terminal
Run these commands inside the PassAI-Web folder:

```bash
git init
git add .
git commit -m "Initial commit: PassAI web app"
git branch -M main
git remote add origin https://github.com/omarnouraldin/passai-web.git
git push -u origin main
```

## Step 3 — Use it on your phone
After pushing, go to https://github.com/omarnouraldin/passai-web on your phone browser.
Or deploy it publicly (so you can open it like a real website) using Vercel:
- Go to https://vercel.com, sign in with GitHub
- Click "Add New Project" → import passai-web
- Set environment variable: ANTHROPIC_API_KEY = your key
- Deploy — you'll get a public URL you can open on any device
