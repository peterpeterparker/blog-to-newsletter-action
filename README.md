# blog-to-newsletter-action

When you merge a pull request that adds a post to your blog, this GitHub Action kicks in: it reads the post, generates a polished newsletter draft using an AI third party (Claude), creates it in your email automation (Mailchimp), and sends you a message (Telegram) to review and approve before anything goes out.

> [!NOTE]
> This action currently supports Mailchimp for newsletters, Claude for content generation, and Telegram for approval. All three are designed to be swappable — the architecture is provider-based and can be extended to support other services.

<p align="center">
  <a href="https://github.com/peterpeterparker/blog-to-newsletter-action"><img alt="Checks" src="https://img.shields.io/github/actions/workflow/status/peterpeterparker/blog-to-newsletter-action/checks.yml?label=checks&style=flat-square"></a>
  <a href="https://github.com/peterpeterparker/blog-to-newsletter-action"><img alt="Tests" src="https://img.shields.io/github/actions/workflow/status/peterpeterparker/blog-to-newsletter-action/tests.yml?label=tests&style=flat-square"></a>
  <a href="https://github.com/peterpeterparker/blog-to-newsletter-action/releases"><img alt="GitHub Release" src="https://img.shields.io/github/v/release/peterpeterparker/blog-to-newsletter-action?style=flat-square"></a>
</p>

## How it works

```
PR merged on GitHub
  → GitHub Action detects new blog post
  → Claude generates HTML + plain text newsletter
  → Mailchimp draft campaign created
  → Telegram message sent with preview and buttons:
     - [📧 Send Test Email] (optional)
     - [🗑 Discard]
     - [✅ Approve & Send]
  → You tap Approve → newsletter sent to your subscribers ✓
```

The approval step is handled by a separate worker: [blog-to-newsletter-worker](https://github.com/peterpeterparker/blog-to-newsletter-worker). You'll need to deploy it too.

## Requirements

Before setting up this action you'll need:

- A [Mailchimp](https://mailchimp.com) account with an audience
- An [Anthropic](https://console.anthropic.com) API key
- A Telegram bot (see setup below)
- The [blog-to-newsletter-worker](https://github.com/peterpeterparker/blog-to-newsletter-worker) deployed

## Setup

The action relies on external services, here's a summary of how to get each one ready.

### Mailchimp

1. Log in to [Mailchimp](https://mailchimp.com)
2. Go to **Account → Extras → API keys** and create an API key
3. Go to **Audience → Settings → Audience name and defaults** and copy the **Audience ID**

### Telegram

1. Open Telegram and message [@BotFather](https://t.me/BotFather)
2. Send `/newbot` and follow the prompts → you get a **bot token**
3. Start a conversation with your new bot
4. Message [@userinfobot](https://t.me/userinfobot) to get your **chat ID**

### Worker

Fork and deploy [blog-to-newsletter-worker](https://github.com/peterpeterparker/blog-to-newsletter-worker). Follow its README to set secrets and register the Telegram webhook.

## Usage

The action works best when triggered on push to `main` with a path filter targeting your blog posts directory — so it only runs when a new post is actually merged, not on every push.

Add the following workflow to your repository at `.github/workflows/newsletter.yml`:

```yaml
name: Newsletter

on:
  push:
    branches: [main]

jobs:
  newsletter:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@de0fac2e4500dabe0009e67214ff5f5447ce83dd # v6.0.2
        with:
          persist-credentials: false

      - uses: peterpeterparker/blog-to-newsletter-action@b8c1f8a5187c8f4d9e38999b9fd792ab7d15594b # v0.0.3
        with:
          blog_posts_path: "src/blog"
          blog_base_url: "https://website.com"
          blog_author: "John"
          github_token: ${{ secrets.GITHUB_TOKEN }}
          mailchimp_api_key: ${{ secrets.MAILCHIMP_API_KEY }}
          mailchimp_list_id: "your-list-id"
          mailchimp_reply_to: "you@example.com"
          anthropic_api_key: ${{ secrets.ANTHROPIC_API_KEY }}
          telegram_bot_token: ${{ secrets.TELEGRAM_BOT_TOKEN }}
          telegram_chat_id: ${{ secrets.TELEGRAM_CHAT_ID }}
```

> [!NOTE]
> If multiple blog posts are merged in a single pull request, the action will generate a single newsletter covering all of them.

## Inputs

### Blog

| Input             | Required | Default     | Description                                                    |
| ----------------- | -------- | ----------- | -------------------------------------------------------------- |
| `blog_posts_path` | ✅       | —           | Path to your blog posts directory (e.g. `src/blog`)            |
| `blog_base_url`   | ✅       | —           | Base URL of your blog (e.g. `https://website.com`)             |
| `blog_author`     | ✅       | —           | Author name — used to write the newsletter in first person     |
| `blog_audience`   |          | `developer` | Target audience (e.g. `developer`, `designer`, `entrepreneur`) |

> [!NOTE]
> Both `author` and `audience` are used in the prompt generation.

### Mailchimp

| Input                   | Required | Default       | Description                                                                                               |
| ----------------------- | -------- | ------------- | --------------------------------------------------------------------------------------------------------- |
| `mailchimp_api_key`     | ✅       | —             | Mailchimp API key                                                                                         |
| `mailchimp_list_id`     | ✅       | —             | Mailchimp audience/list ID                                                                                |
| `mailchimp_reply_to`    | ✅       | —             | Reply-to email address                                                                                    |
| `mailchimp_from_name`   |          | `blog_author` | Sender display name. Defaults to `blog_author` if not set                                                 |
| `mailchimp_test_emails` |          | —             | Comma-separated emails for test sends. If set, adds a [📧 Send Test Email] button to the Telegram message |

### Anthropic

| Input                  | Required | Default             | Description                             |
| ---------------------- | -------- | ------------------- | --------------------------------------- |
| `anthropic_api_key`    | ✅       | —                   | Anthropic API key                       |
| `anthropic_model`      |          | `claude-sonnet-4-6` | Claude model to use                     |
| `anthropic_max_tokens` |          | `10000`             | Max tokens for the generated newsletter |

### Telegram

| Input                | Required | Default | Description                        |
| -------------------- | -------- | ------- | ---------------------------------- |
| `telegram_bot_token` | ✅       | —       | Telegram bot token from @BotFather |
| `telegram_chat_id`   | ✅       | —       | Your Telegram chat ID              |

### Other

| Input          | Required | Default | Description                                                                                                          |
| -------------- | -------- | ------- | -------------------------------------------------------------------------------------------------------------------- |
| `github_token` |          | —       | Optional GitHub token for fetching commit info from the GitHub API. Useful for private repos or to avoid rate limits |

## Secrets

Add these to your repository under **Settings → Secrets → Actions**:

| Secret               | Description             |
| -------------------- | ----------------------- |
| `ANTHROPIC_API_KEY`  | Your Anthropic API key  |
| `MAILCHIMP_API_KEY`  | Your Mailchimp API key  |
| `TELEGRAM_BOT_TOKEN` | Your Telegram bot token |
| `TELEGRAM_CHAT_ID`   | Your Telegram chat ID   |

> [!TIP]
> `mailchimp_list_id`, `mailchimp_reply_to`, `blog_base_url`, and `blog_author` are not sensitive — you can provide them directly in your workflow file.

## License

MIT
