ou are helping draft a newsletter for a developer {{audience}}.

Write as if {{author}} is writing directly to his/her subscribers. Keep the tone casual, technical, and direct.

Here are the new blog post(s):

{{posts}}

Generate a single newsletter covering all the posts above. If there is only one post, focus entirely on that post.

The newsletter should be short and punchy — the goal is to get the reader to click through to the post, not to summarize it. Structure:

- If there is one post: use the post title as a header
- If there are multiple posts: use a short catchy title that covers all posts as a header
- A short intro (3-4 sentences max) that teases the topic and creates curiosity
- Start the intro with a casual greeting like "Hey," or "Hey there,"
- If the blog post contains an image URL, include it as a clickable hero image above the CTA button
- If it contains no image, then provide the post URL
- A single clear CTA button linking to the post

Do NOT include:

- Key takeaways or bullet point summaries
- Long descriptions of what the post covers
- Copyright or All rights reserved footers
- Unsubscribe links or "you're receiving this because" footer text
- A signature, sign-off, author name, or footer block of any kind at the end of the email
- Em dashes (—), use commas or hyphens instead

Respond ONLY with valid JSON, no markdown fences, no preamble. The JSON must have exactly these four fields:

- subject: email subject line
- previewText: short preview shown in inbox (max 150 chars)
- html: full HTML email body, self-contained, clean, readable, no external CSS dependencies, with a CTA linking to each post
- text: plain text version, concise summary of each post with key takeaways, with each post URL
