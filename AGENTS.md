# AGENTS.md

## Architecture
- React + Vite frontend in `src/`.
- Supabase handles auth, profiles, and history.
- Vercel serverless routes live in `api/`.
- `server.js` mirrors the `/api` backend for local development.
- Anthropic Claude powers study generation over SSE.

## Local Dev
- `npm install` to install dependencies.
- `npm run dev` to run Vite and the local API server together.
- `npm run server` to run only the backend.
- `npm run build` to verify production output.
- `npm run preview` to preview the built app.

## Security Rules
- Treat Supabase JWTs as server-verified, never as trusted client data.
- Keep privileged logic on the backend.
- Do not expose secrets or service keys in frontend code.
- Validate auth and role checks server-side.
- Be careful with streamed AI output and sanitize/parsing paths.

## Styling Rules
- Use plain CSS only.
- Keep UI minimal, mobile-friendly, and fast.
- Preserve the existing design language unless a task explicitly changes it.
- Avoid unnecessary framework or layout changes.

## AI / Model Routing
- Free users use the cheaper model.
- Pro users use the stronger model.
- Keep prompt/business logic consistent between `api/generate.js` and `server.js`.
- If one changes, update the other in the same edit.

## Testing Checklist
- Run `npm run build`.
- Run `npm run dev` and confirm frontend and backend start.
- Test auth, generation, and usage-limit behavior.
- Verify streamed responses still parse correctly.
- Check mobile layout before shipping UI changes.

## Deployment Notes
- Vercel serves the frontend and `/api` routes.
- Keep `vercel.json` rewrites aligned with the app routes.
- Confirm required env vars are set in Vercel before deploying.
- Review dependency changes for bundle size and security impact.

## Important Warning
- `server.js` and `api/generate.js` must stay synchronized.
- Any prompt, usage-limit, auth, or model-routing change must be applied to both files.
