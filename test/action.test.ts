import { describe, expect, it, spyOn, mock, afterEach, beforeEach } from "bun:test";
import { run } from "../src/action.ts";
import { GitHub } from "../src/git/github.ts";
import { Blog } from "../src/blog/blog.ts";
import { Claude } from "../src/ai/anthropic/claude.ts";
import { Mailchimp } from "../src/newsletter/mailchimp/mailchimp.ts";
import { Telegram } from "../src/bot/telegram/telegram.ts";
import type { Blog as BlogType } from "../src/common/blog.ts";

describe("Action", () => {
  const mockBlog: BlogType = {
    author: "David Dal Busco",
    audience: "developer",
    posts: [{ relativePath: "__fixtures__/blog/hello-world.md", content: "# Hello World" }],
  };

  const mockPayload = {
    subject: "Test Subject",
    previewText: "Test Preview",
    html: "<h1>Test</h1>",
    text: "Test",
  };

  describe("run", () => {
    beforeEach(() => {
      process.env.BLOG_POSTS_PATH = "__fixtures__/blog";
      process.env.BLOG_AUTHOR = "David Dal Busco";
      process.env.ANTHROPIC_API_KEY = "test-anthropic-key";
      process.env.MAILCHIMP_API_KEY = "test-mailchimp-key-us21";
      process.env.MAILCHIMP_LIST_ID = "list123";
      process.env.MAILCHIMP_FROM_NAME = "Test Sender";
      process.env.MAILCHIMP_REPLY_TO = "test@test.com";
      process.env.TELEGRAM_BOT_TOKEN = "test-bot-token";
      process.env.TELEGRAM_CHAT_ID = "test-chat-id";
    });

    afterEach(() => {
      delete process.env.BLOG_POSTS_PATH;
      delete process.env.BLOG_AUTHOR;
      delete process.env.ANTHROPIC_API_KEY;
      delete process.env.MAILCHIMP_API_KEY;
      delete process.env.MAILCHIMP_LIST_ID;
      delete process.env.MAILCHIMP_FROM_NAME;
      delete process.env.MAILCHIMP_REPLY_TO;
      delete process.env.TELEGRAM_BOT_TOKEN;
      delete process.env.TELEGRAM_CHAT_ID;
      mock.restore();
    });

    it("should return error if findAddedFiles fails", async () => {
      spyOn(GitHub.prototype, "findAddedFiles").mockResolvedValueOnce({
        status: "error",
        err: new Error("git failed"),
      });

      const result = await run();

      expect(result.status).toBe("error");
      if (result.status !== "error") {
        expect(true).toBeFalsy();
        return;
      }
      expect(result.err).toBeInstanceOf(Error);
    });

    it("should return success if no blog posts found", async () => {
      spyOn(GitHub.prototype, "findAddedFiles").mockResolvedValueOnce({
        status: "success",
        result: { files: [] },
      });

      const result = await run();

      expect(result.status).toBe("success");
    });

    it("should return error if blog build fails", async () => {
      spyOn(GitHub.prototype, "findAddedFiles").mockResolvedValueOnce({
        status: "success",
        result: { files: ["__fixtures__/blog/hello-world.md"] },
      });

      spyOn(Blog.prototype, "build").mockResolvedValueOnce({
        status: "error",
        err: new Error("blog failed"),
      });

      const result = await run();

      expect(result.status).toBe("error");
      if (result.status !== "error") {
        expect(true).toBeFalsy();
        return;
      }
      expect(result.err).toBeInstanceOf(Error);
    });

    it("should return error if newsletter generation fails", async () => {
      spyOn(GitHub.prototype, "findAddedFiles").mockResolvedValueOnce({
        status: "success",
        result: { files: ["__fixtures__/blog/hello-world.md"] },
      });

      spyOn(Blog.prototype, "build").mockResolvedValueOnce({
        status: "success",
        result: mockBlog,
      });

      spyOn(Claude.prototype, "generateNewsletter").mockResolvedValueOnce({
        status: "error",
        err: new Error("claude failed"),
      });

      const result = await run();

      expect(result.status).toBe("error");
      if (result.status !== "error") {
        expect(true).toBeFalsy();
        return;
      }
      expect(result.err).toBeInstanceOf(Error);
    });

    it("should return error if mailchimp draft creation fails", async () => {
      spyOn(GitHub.prototype, "findAddedFiles").mockResolvedValueOnce({
        status: "success",
        result: { files: ["__fixtures__/blog/hello-world.md"] },
      });

      spyOn(Blog.prototype, "build").mockResolvedValueOnce({
        status: "success",
        result: mockBlog,
      });

      spyOn(Claude.prototype, "generateNewsletter").mockResolvedValueOnce({
        status: "success",
        result: mockPayload,
      });

      spyOn(Mailchimp.prototype, "createDraft").mockResolvedValueOnce({
        status: "error",
        err: new Error("mailchimp failed"),
      });

      const result = await run();

      expect(result.status).toBe("error");
      if (result.status !== "error") {
        expect(true).toBeFalsy();
        return;
      }
      expect(result.err).toBeInstanceOf(Error);
    });

    it("should return error if telegram approval fails", async () => {
      spyOn(GitHub.prototype, "findAddedFiles").mockResolvedValueOnce({
        status: "success",
        result: { files: ["__fixtures__/blog/hello-world.md"] },
      });

      spyOn(Blog.prototype, "build").mockResolvedValueOnce({
        status: "success",
        result: mockBlog,
      });

      spyOn(Claude.prototype, "generateNewsletter").mockResolvedValueOnce({
        status: "success",
        result: mockPayload,
      });

      spyOn(Mailchimp.prototype, "createDraft").mockResolvedValueOnce({
        status: "success",
        result: { campaignId: "campaign123" },
      });

      spyOn(Telegram.prototype, "sendApproval").mockResolvedValueOnce({
        status: "error",
        err: new Error("telegram failed"),
      });

      const result = await run();

      expect(result.status).toBe("error");
      if (result.status !== "error") {
        expect(true).toBeFalsy();
        return;
      }
      expect(result.err).toBeInstanceOf(Error);
    });

    it("should return success when all steps succeed", async () => {
      spyOn(GitHub.prototype, "findAddedFiles").mockResolvedValueOnce({
        status: "success",
        result: { files: ["__fixtures__/blog/hello-world.md"] },
      });

      spyOn(Blog.prototype, "build").mockResolvedValueOnce({
        status: "success",
        result: mockBlog,
      });

      spyOn(Claude.prototype, "generateNewsletter").mockResolvedValueOnce({
        status: "success",
        result: mockPayload,
      });

      spyOn(Mailchimp.prototype, "createDraft").mockResolvedValueOnce({
        status: "success",
        result: { campaignId: "campaign123" },
      });

      spyOn(Telegram.prototype, "sendApproval").mockResolvedValueOnce({
        status: "success",
        result: undefined,
      });

      const result = await run();

      expect(result.status).toBe("success");
    });
  });
});
