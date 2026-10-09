# GitHub OAuth App setup

1. Go to GitHub Settings > Developer settings > OAuth Apps.
2. Create an app with your docs URL as Homepage URL.
3. Set Authorization callback URL to `http://localhost:3000/auth/github/callback` for local development.
4. Set `GITHUB_OAUTH_CLIENT_ID` and `GITHUB_OAUTH_CLIENT_SECRET` in backend environment only.
5. Rotate secrets if leaked and revoke app access from GitHub if needed.
