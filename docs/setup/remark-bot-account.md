# Remark bot account setup

Create a dedicated normal GitHub user (for example `remark-bot`) and generate a minimal-scope token used only by the backend as `REMARK_BOT_TOKEN`.
Do not expose this token to browser code.
Grant repository access intentionally and rotate token on schedule.
