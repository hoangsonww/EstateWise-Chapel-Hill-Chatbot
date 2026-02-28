## Frontend Guidance

- Owns the Next.js Pages Router app, direct REST clients, and local tRPC routes.
- Search for duplicated backend URL assumptions before treating one REST client edit as complete.
- Keep changes in `pages/chat.tsx` and `pages/insights.tsx` localized; they are large and easy to destabilize.
- Remember `/api/trpc` is served by the frontend app itself, not the Express backend.

## Validation

- `npm run build`
- `npm run test`
- `npm run lint` when touching UI or TypeScript-heavy paths

## Docs

- Update `frontend/README.md` when route behavior, data flow, commands, or local/prod URL guidance changes.
