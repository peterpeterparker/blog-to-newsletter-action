import { describe, expect, it, beforeEach, afterEach, spyOn, mock } from "bun:test";
import type { NewsletterPayload } from "../../../src/common/newsletter.ts";
import { Telegram, TelegramApiError } from "../../../src/bot/telegram/telegram.ts";

describe("Telegram", () => {
  const mockPayload: NewsletterPayload = {
    subject: "Test Subject",
    previewText: "Test Preview",
    html: "<h1>Test</h1>",
    text: "Test plain text",
  };

  const mockArgs = {
    campaignId: "campaign123",
    payload: mockPayload,
  };

  beforeEach(() => {
    process.env.TELEGRAM_BOT_TOKEN = "test-bot-token";
    process.env.TELEGRAM_CHAT_ID = "test-chat-id";
  });

  afterEach(() => {
    delete process.env.TELEGRAM_BOT_TOKEN;
    delete process.env.TELEGRAM_CHAT_ID;
    delete process.env.MAILCHIMP_TEST_EMAILS;
    mock.restore();
  });

  describe("create", () => {
    it("should throw if TELEGRAM_BOT_TOKEN is not set", () => {
      delete process.env.TELEGRAM_BOT_TOKEN;
      expect(() => Telegram.create()).toThrow();
    });

    it("should throw if TELEGRAM_CHAT_ID is not set", () => {
      delete process.env.TELEGRAM_CHAT_ID;
      expect(() => Telegram.create()).toThrow();
    });

    it("should create instance with valid env vars", () => {
      expect(() => Telegram.create()).not.toThrow();
    });

    it("should create instance without test emails", () => {
      expect(() => Telegram.create()).not.toThrow();
    });

    it("should create instance with test emails", () => {
      process.env.MAILCHIMP_TEST_EMAILS = "a@test.com,b@test.com";
      expect(() => Telegram.create()).not.toThrow();
    });
  });

  describe("sendApproval", () => {
    it("should return error if Telegram API fails", async () => {
      spyOn(globalThis, "fetch").mockResolvedValueOnce(
        new Response("Unauthorized", { status: 401 }),
      );

      const result = await Telegram.create().sendApproval(mockArgs);

      expect(result.status).toBe("error");
      if (result.status !== "error") {
        expect(true).toBeFalsy();
        return;
      }
      expect(result.err).toBeInstanceOf(TelegramApiError);
    });

    it("should return success on valid response", async () => {
      spyOn(globalThis, "fetch").mockResolvedValueOnce(
        new Response(JSON.stringify({ ok: true }), { status: 200 }),
      );

      const result = await Telegram.create().sendApproval(mockArgs);

      expect(result.status).toBe("success");
    });

    it("should include subject and previewText in message", async () => {
      const fetchSpy = spyOn(globalThis, "fetch").mockResolvedValueOnce(
        new Response(JSON.stringify({ ok: true }), { status: 200 }),
      );

      await Telegram.create().sendApproval(mockArgs);

      const [, options] = fetchSpy.mock.calls[0] as [string, RequestInit];
      const body = JSON.parse(options.body as string);
      expect(body.text).toContain("Test Subject");
      expect(body.text).toContain("Test Preview");
    });

    it("should include Approve and Discard buttons with campaignId", async () => {
      const fetchSpy = spyOn(globalThis, "fetch").mockResolvedValueOnce(
        new Response(JSON.stringify({ ok: true }), { status: 200 }),
      );

      await Telegram.create().sendApproval(mockArgs);

      const [, options] = fetchSpy.mock.calls[0] as [string, RequestInit];
      const body = JSON.parse(options.body as string);
      const lastRow = body.reply_markup.inline_keyboard.at(-1);
      expect(lastRow[0].callback_data).toBe("discard:campaign123");
      expect(lastRow[1].callback_data).toBe("send:campaign123");
    });

    it("should not include test email button if MAILCHIMP_TEST_EMAILS is not set", async () => {
      const fetchSpy = spyOn(globalThis, "fetch").mockResolvedValueOnce(
        new Response(JSON.stringify({ ok: true }), { status: 200 }),
      );

      await Telegram.create().sendApproval(mockArgs);

      const [, options] = fetchSpy.mock.calls[0] as [string, RequestInit];
      const body = JSON.parse(options.body as string);
      expect(body.reply_markup.inline_keyboard).toHaveLength(1);
    });

    it("should include test email button with emails in callback data", async () => {
      process.env.MAILCHIMP_TEST_EMAILS = "test@test.com";

      const fetchSpy = spyOn(globalThis, "fetch").mockResolvedValueOnce(
        new Response(JSON.stringify({ ok: true }), { status: 200 }),
      );

      await Telegram.create().sendApproval(mockArgs);

      const [, options] = fetchSpy.mock.calls[0] as [string, RequestInit];
      const body = JSON.parse(options.body as string);
      expect(body.reply_markup.inline_keyboard).toHaveLength(2);
      expect(body.reply_markup.inline_keyboard[0][0].callback_data).toBe(
        "test:campaign123:test@test.com",
      );
    });

    it("should throw if MAILCHIMP_TEST_EMAILS contains invalid emails", () => {
      process.env.MAILCHIMP_TEST_EMAILS = "not-an-email";
      expect(() => Telegram.create()).toThrow();
    });

    it("should throw if MAILCHIMP_TEST_EMAILS contains more than 5 emails", () => {
      process.env.MAILCHIMP_TEST_EMAILS =
        "a@test.com,b@test.com,c@test.com,d@test.com,e@test.com,f@test.com";
      expect(() => Telegram.create()).toThrow();
    });

    it("should call correct Telegram API URL", async () => {
      const fetchSpy = spyOn(globalThis, "fetch").mockResolvedValueOnce(
        new Response(JSON.stringify({ ok: true }), { status: 200 }),
      );

      await Telegram.create().sendApproval(mockArgs);

      const [url] = fetchSpy.mock.calls[0] as [string, RequestInit];
      expect(url).toContain("test-bot-token");
      expect(url).toContain("sendMessage");
    });
  });
});
