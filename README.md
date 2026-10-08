<p align="center">
  <img src="https://raw.githubusercontent.com/remarkhq/.github/main/profile/remark.svg" width="320" alt="Remark logo" />
</p>

# Remark

> Lightweight comments for the open web.

Remark is a lightweight comments widget for websites, docs, and blogs, powered by GitHub Issues. It lets communities discuss content without running a separate backend, moderation system, or database.

## Why Remark?

- GitHub-native discussions
- Threaded comments for articles and docs
- Lightweight and easy to embed
- Works well for static sites and documentation hubs
- Open, transparent moderation through GitHub
- Built for communities that already use GitHub

## Features

- Embeddable comments widget
- Threaded conversations
- Reactions and lightweight engagement
- Repo-based configuration
- Simple setup for sites and docs
- Designed for open-source communities

## How it works

1. Connect Remark to a GitHub repository.
2. Add the widget to your page or documentation site.
3. Let readers comment, discuss, and engage directly on your content.

## Example usage

```html
<script src="/remark.js"></script>
<script>
  Remark.init({
    repo: "owner/repo",
    title: "Discussion",
    page: window.location.pathname
  });
</script>
```

## Getting started

- Clone the repository
- Install dependencies
- Configure your GitHub repo
- Add the widget to your site
- Start the discussion

## Contributing

Contributions are welcome. If you want to improve the product, report a bug, or propose a feature, open an issue or start a discussion.

## License

This project is licensed under the MIT License.

## Community

Built for developers, writers, and open-source communities who want discussions without the friction of a full backend.
