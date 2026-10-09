<p align="center">
  <img
    src="https://raw.githubusercontent.com/remarkhq/.github/main/profile/remark.svg"
    width="320"
    alt="Remark logo"
  />
</p>

# Remark

> Lightweight comments for the open web.

[![CI](https://github.com/remarkhq/remark/actions/workflows/ci.yml/badge.svg)](https://github.com/remarkhq/remark/actions/workflows/ci.yml)
[![Security](https://github.com/remarkhq/remark/actions/workflows/security.yml/badge.svg)](https://github.com/remarkhq/remark/actions/workflows/security.yml)

Remark is an open-source comments widget powered by GitHub Issues. Add discussions to websites, blogs, and documentation without maintaining a separate comments database.

## Features

- Embeddable comments widget for static and dynamic websites
- Deterministic page-to-issue mapping
- OAuth sign-in with GitHub
- Dedicated bot account for missing issue creation
- Authenticated user comment publishing
- Reactions support
- GitHub Pages docs and setup wizard
- Security-focused defaults (CSRF, state validation, secure cookies, rate limits)

## Architecture

- `apps/api`: OAuth, session, issue lookup/create, comment/reaction APIs
- `apps/widget`: embeddable browser widget
- `apps/docs`: GitHub Pages docs and setup flow
- `packages/*`: shared types, configuration, client, UI, and security helpers

## Installation

```bash
npm install
cp .env.example .env
npm run build
npm run test
```

## Environment variables

See `.env.example` for all required values.

## GitHub OAuth setup

1. Create GitHub OAuth App.
2. Set callback URL to `http://localhost:3000/auth/github/callback` for local development.
3. Set `GITHUB_OAUTH_CLIENT_ID` and `GITHUB_OAUTH_CLIENT_SECRET` in backend env only.
4. Rotate/revoke credentials if compromised.

## Remark bot account setup

1. Create dedicated user (for example `remark-bot`).
2. Generate restricted token and store as `REMARK_BOT_TOKEN`.
3. Grant explicit repository access.
4. Never expose token to browser code.

## Local development

```bash
npm --workspace @remark/api run dev
npm --workspace @remark/widget run build
npm --workspace @remark/docs run build
```

## Embed example

```html
<div id="remark-comments"></div>

<script
  src="https://your-remark-domain.example/widget.js"
  data-repository="owner/comments"
  data-issue-term="pathname"
  data-theme="auto"
  data-reactions="true"
  data-api-base-url="https://api.remark.example"
  async
></script>
```

## Security notes

- Keep OAuth and bot credentials in server-only environment variables.
- Do not commit `.env`.
- Run secret scanning in CI.
- Use HTTPS in production for secure cookies.

## Contributing

Read `CONTRIBUTING.md` and run `npm run lint && npm run test && npm run build` before opening a PR.

## Documentation

- Setup docs: `docs/setup/`
- Security docs: `docs/security/`
- Reference docs: `docs/reference/`
- Guides: `docs/guides/`
- Troubleshooting: `docs/troubleshooting/`

GitHub Pages source: `apps/docs`.

## License

MIT
