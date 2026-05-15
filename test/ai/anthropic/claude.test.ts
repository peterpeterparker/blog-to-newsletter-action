import { describe, expect, it, beforeEach, afterEach, spyOn, mock } from "bun:test";
import { AnthropicApiError, Claude } from "../../../src/ai/anthropic/claude.ts";
import type { Blog } from "../../../src/common/blog.ts";

describe("Claude", () => {
  const mockBlog: Blog = {
    author: "David Dal Busco",
    audience: "developer",
    posts: [
      {
        relativePath: "src/blog/hello-world.md",
        content: "# Hello World\n\nThis is a test post.",
      },
    ],
  };

  const mockNewsletterPayload = {
    subject: "Test Subject",
    previewText: "Test Preview",
    html: "<h1>Test</h1>",
    text: "Test",
  };

  const mockAnthropicResponse = {
    content: [
      {
        type: "text",
        text: JSON.stringify(mockNewsletterPayload),
      },
    ],
  };

  beforeEach(() => {
    process.env.ANTHROPIC_API_KEY = "test-api-key";
  });

  afterEach(() => {
    delete process.env.ANTHROPIC_API_KEY;
    delete process.env.ANTHROPIC_MODEL;
    mock.restore();
  });

  describe("create", () => {
    it("should throw if ANTHROPIC_API_KEY is not set", () => {
      delete process.env.ANTHROPIC_API_KEY;
      expect(() => Claude.create()).toThrow();
    });

    it("should create instance with valid env vars", () => {
      expect(() => Claude.create()).not.toThrow();
    });
  });

  describe("generateNewsletter", () => {
    it("should return error if Anthropic API fails", async () => {
      spyOn(globalThis, "fetch").mockResolvedValueOnce(
        new Response("Unauthorized", { status: 401 }),
      );

      const result = await Claude.create().generateNewsletter(mockBlog);

      expect(result.status).toBe("error");
      if (result.status !== "error") {
        expect(true).toBeFalsy();
        return;
      }
      expect(result.err).toBeInstanceOf(AnthropicApiError);
    });

    it("should return error if response is invalid JSON", async () => {
      spyOn(globalThis, "fetch").mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            content: [{ type: "text", text: "not json at all" }],
          }),
          { status: 200 },
        ),
      );

      const result = await Claude.create().generateNewsletter(mockBlog);

      expect(result.status).toBe("error");
      if (result.status !== "error") {
        expect(true).toBeFalsy();
        return;
      }
      expect(result.err).toBeInstanceOf(AnthropicApiError);
    });

    it("should return error if JSON does not match NewsletterPayload schema", async () => {
      spyOn(globalThis, "fetch").mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            content: [{ type: "text", text: JSON.stringify({ wrong: "shape" }) }],
          }),
          { status: 200 },
        ),
      );

      const result = await Claude.create().generateNewsletter(mockBlog);

      expect(result.status).toBe("error");
    });

    it("should return newsletter payload on success", async () => {
      spyOn(globalThis, "fetch").mockResolvedValueOnce(
        new Response(JSON.stringify(mockAnthropicResponse), { status: 200 }),
      );

      const result = await Claude.create().generateNewsletter(mockBlog);

      expect(result.status).toBe("success");
      if (result.status !== "success") {
        expect(true).toBeFalsy();
        return;
      }
      expect(result.result.subject).toBe("Test Subject");
      expect(result.result.previewText).toBe("Test Preview");
      expect(result.result.html).toBe("<h1>Test</h1>");
      expect(result.result.text).toBe("Test");
    });

    it("should use default model if ANTHROPIC_MODEL is not set", async () => {
      const fetchSpy = spyOn(globalThis, "fetch").mockResolvedValueOnce(
        new Response(JSON.stringify(mockAnthropicResponse), { status: 200 }),
      );

      await Claude.create().generateNewsletter(mockBlog);

      const [, options] = fetchSpy.mock.calls[0] as [string, RequestInit];
      const body = JSON.parse(options.body as string);
      expect(body.model).toBe("claude-sonnet-4-6");
    });

    it("should use custom model if ANTHROPIC_MODEL is set", async () => {
      process.env.ANTHROPIC_MODEL = "claude-opus-4-6";

      const fetchSpy = spyOn(globalThis, "fetch").mockResolvedValueOnce(
        new Response(JSON.stringify(mockAnthropicResponse), { status: 200 }),
      );

      await Claude.create().generateNewsletter(mockBlog);

      const [, options] = fetchSpy.mock.calls[0] as [string, RequestInit];
      const body = JSON.parse(options.body as string);
      expect(body.model).toBe("claude-opus-4-6");
    });

    it("should include blog post content in request", async () => {
      const fetchSpy = spyOn(globalThis, "fetch").mockResolvedValueOnce(
        new Response(JSON.stringify(mockAnthropicResponse), { status: 200 }),
      );

      await Claude.create().generateNewsletter(mockBlog);

      const [, options] = fetchSpy.mock.calls[0] as [string, RequestInit];
      const body = JSON.parse(options.body as string);
      expect(body.messages[0].content).toContain("Hello World");
    });

    it("should include author in request", async () => {
      const fetchSpy = spyOn(globalThis, "fetch").mockResolvedValueOnce(
        new Response(JSON.stringify(mockAnthropicResponse), { status: 200 }),
      );

      await Claude.create().generateNewsletter(mockBlog);

      const [, options] = fetchSpy.mock.calls[0] as [string, RequestInit];
      const body = JSON.parse(options.body as string);
      expect(body.messages[0].content).toContain("David Dal Busco");
    });

    it("should strip markdown fences from response", async () => {
      spyOn(globalThis, "fetch").mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            content: [
              { type: "text", text: "```json\n" + JSON.stringify(mockNewsletterPayload) + "\n```" },
            ],
          }),
          { status: 200 },
        ),
      );

      const result = await Claude.create().generateNewsletter(mockBlog);

      expect(result.status).toBe("success");
      if (result.status !== "success") {
        expect(true).toBeFalsy();
        return;
      }
      expect(result.result.subject).toBe("Test Subject");
    });

    it("should use custom max tokens if ANTHROPIC_MAX_TOKENS is set", async () => {
      process.env.ANTHROPIC_MAX_TOKENS = "5000";

      const fetchSpy = spyOn(globalThis, "fetch").mockResolvedValueOnce(
        new Response(JSON.stringify(mockAnthropicResponse), { status: 200 }),
      );

      await Claude.create().generateNewsletter(mockBlog);

      const [, options] = fetchSpy.mock.calls[0] as [string, RequestInit];
      const body = JSON.parse(options.body as string);
      expect(body.max_tokens).toBe(5000);

      delete process.env.ANTHROPIC_MAX_TOKENS;
    });

    it("should use default max tokens if ANTHROPIC_MAX_TOKENS is not set", async () => {
      const fetchSpy = spyOn(globalThis, "fetch").mockResolvedValueOnce(
        new Response(JSON.stringify(mockAnthropicResponse), { status: 200 }),
      );

      await Claude.create().generateNewsletter(mockBlog);

      const [, options] = fetchSpy.mock.calls[0] as [string, RequestInit];
      const body = JSON.parse(options.body as string);
      expect(body.max_tokens).toBe(10000);
    });
  });
});
