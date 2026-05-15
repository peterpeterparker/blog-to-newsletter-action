import { AIProvider } from "../_ai.ts";
import { assertNotEmptyString } from "../../common/asserts.ts";
import type { Result } from "../../common/types.ts";
import { type NewsletterPayload, NewsletterPayloadSchema } from "../../common/newsletter.ts";
import {
  AnthropicMessageCodec,
  type AnthropicResponse,
  AnthropicResponseSchema,
} from "./_types.ts";
import type { Blog } from "../../common/blog.ts";
import prompt from "../_prompt.md" with { type: "text" };

export class AnthropicApiError extends Error {}

@AIProvider
export class Claude {
  readonly #apiKey: string;
  readonly #model: string;
  readonly #maxTokens: number;

  readonly #apiUrl = "https://api.anthropic.com/v1";
  readonly #anthropicVersion = "2023-06-01";

  private constructor({
    apiKey,
    model = "claude-sonnet-4-6",
    maxTokens = "10000",
  }: {
    apiKey: string;
    model?: string;
    maxTokens?: string;
  }) {
    this.#apiKey = apiKey;
    this.#model = model;
    this.#maxTokens = parseInt(maxTokens);
  }

  static create(): Claude {
    const { ANTHROPIC_API_KEY, ANTHROPIC_MODEL, ANTHROPIC_MAX_TOKENS } = process.env;

    assertNotEmptyString(ANTHROPIC_API_KEY, "ANTHROPIC_API_KEY");

    return new this({
      apiKey: ANTHROPIC_API_KEY,
      model: ANTHROPIC_MODEL,
      maxTokens: ANTHROPIC_MAX_TOKENS,
    });
  }

  async generateNewsletter(blog: Blog): Promise<Result<NewsletterPayload>> {
    const messageResult = await this.#createMessage(blog);

    if (messageResult.status === "error") {
      return messageResult;
    }

    const { result: messageResponse } = messageResult;

    return this.#buildNewsletter(messageResponse);
  }

  /**
   * @see https://platform.claude.com/docs/en/api/messages/create
   */
  async #createMessage({ posts, audience, author }: Blog): Promise<Result<AnthropicResponse>> {
    const postsBlock = posts
      .map(
        ({ content, relativePath }, i) => `<blog_post_${i + 1}>
URL: ${relativePath}
${content}
</blog_post_${i + 1}>`,
      )
      .join("\n\n");

    const content = prompt
      .replace("{{author}}", author)
      .replace("{{audience}}", audience)
      .replace("{{posts}}", postsBlock);

    const response = await fetch(`${this.#apiUrl}/messages`, {
      method: "POST",
      headers: {
        "x-api-key": this.#apiKey,
        "anthropic-version": this.#anthropicVersion,
        "Content-Type": "application/json",
      },
      body: AnthropicMessageCodec.decode({
        model: this.#model,
        maxTokens: this.#maxTokens,
        content,
      }),
    });

    if (!response.ok) {
      return {
        status: "error",
        err: new AnthropicApiError(`Anthropic API failed: ${await response.text()}`),
      };
    }

    const parsed = AnthropicResponseSchema.safeParse(await response.json());

    if (!parsed.success) {
      return { status: "error", err: parsed.error };
    }

    const { data: result } = parsed;

    return { status: "success", result };
  }

  #buildNewsletter({ content }: AnthropicResponse): Result<NewsletterPayload> {
    const raw = content
      .filter(({ type }) => type === "text")
      .map(({ text }) => text)
      .join("")
      .replace(/^```json\s*/i, "")
      .replace(/^```\s*/i, "")
      .replace(/```\s*$/i, "")
      .trim();

    let parsedNewsletter: unknown;
    try {
      parsedNewsletter = JSON.parse(raw);
    } catch {
      return { status: "error", err: new AnthropicApiError(`Invalid JSON response:\n${raw}`) };
    }

    const parsedNewsletterJson = NewsletterPayloadSchema.safeParse(parsedNewsletter);

    if (!parsedNewsletterJson.success) {
      return { status: "error", err: parsedNewsletterJson.error };
    }

    const { data: result } = parsedNewsletterJson;

    return { status: "success", result };
  }
}
