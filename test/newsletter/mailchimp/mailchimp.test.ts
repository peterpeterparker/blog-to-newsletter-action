import { describe, expect, it, beforeEach, afterEach, spyOn, mock } from "bun:test";
import type { NewsletterPayload } from "../../../src/common/newsletter.ts";
import { Mailchimp, MailchimpApiError } from "../../../src/newsletter/mailchimp/mailchimp.ts";

describe("Mailchimp", () => {
  const mockPayload: NewsletterPayload = {
    subject: "Test Subject",
    previewText: "Test Preview",
    html: "<h1>Test</h1>",
    text: "Test",
  };

  const mockBlog = { author: "David Dal Busco" };

  const mockArgs = { payload: mockPayload, blog: mockBlog };

  const mockCampaignResponse = {
    id: "campaign123",
    web_id: 456,
  };

  beforeEach(() => {
    process.env.MAILCHIMP_API_KEY = "test-api-key";
    process.env.MAILCHIMP_LIST_ID = "list123";
    process.env.MAILCHIMP_REPLY_TO = "test@test.com";
  });

  afterEach(() => {
    delete process.env.MAILCHIMP_API_KEY;
    delete process.env.MAILCHIMP_LIST_ID;
    delete process.env.MAILCHIMP_FROM_NAME;
    delete process.env.MAILCHIMP_REPLY_TO;
    mock.restore();
  });

  describe("create", () => {
    it("should throw if MAILCHIMP_API_KEY is not set", () => {
      delete process.env.MAILCHIMP_API_KEY;
      expect(() => Mailchimp.create()).toThrow();
    });

    it("should throw if MAILCHIMP_LIST_ID is not set", () => {
      delete process.env.MAILCHIMP_LIST_ID;
      expect(() => Mailchimp.create()).toThrow();
    });

    it("should not throw if MAILCHIMP_FROM_NAME is not set", () => {
      delete process.env.MAILCHIMP_FROM_NAME;
      expect(() => Mailchimp.create()).not.toThrow();
    });

    it("should throw if MAILCHIMP_REPLY_TO is not set", () => {
      delete process.env.MAILCHIMP_REPLY_TO;
      expect(() => Mailchimp.create()).toThrow();
    });

    it("should create instance with valid env vars", () => {
      expect(() => Mailchimp.create()).not.toThrow();
    });

    it("should use data center from API key in URL", async () => {
      process.env.MAILCHIMP_API_KEY = "test-api-key-us21";

      const fetchSpy = spyOn(globalThis, "fetch")
        .mockResolvedValueOnce(new Response(JSON.stringify(mockCampaignResponse), { status: 200 }))
        .mockResolvedValueOnce(new Response("{}", { status: 200 }));

      await Mailchimp.create().createDraft(mockArgs);

      const [url] = fetchSpy.mock.calls[0] as [string, RequestInit];
      expect(url).toContain("us21.api.mailchimp.com");
    });
  });

  describe("createDraft", () => {
    it("should return error if createCampaign fails", async () => {
      spyOn(globalThis, "fetch").mockResolvedValueOnce(
        new Response("Unauthorized", { status: 401 }),
      );

      const result = await Mailchimp.create().createDraft(mockArgs);

      expect(result.status).toBe("error");
      if (result.status !== "error") {
        expect(true).toBeFalsy();
        return;
      }
      expect(result.err).toBeInstanceOf(MailchimpApiError);
    });

    it("should return error if uploadContent fails", async () => {
      spyOn(globalThis, "fetch")
        .mockResolvedValueOnce(new Response(JSON.stringify(mockCampaignResponse), { status: 200 }))
        .mockResolvedValueOnce(new Response("Error", { status: 500 }));

      const result = await Mailchimp.create().createDraft(mockArgs);

      expect(result.status).toBe("error");
      if (result.status !== "error") {
        expect(true).toBeFalsy();
        return;
      }
      expect(result.err).toBeInstanceOf(MailchimpApiError);
    });

    it("should return campaignId on success", async () => {
      spyOn(globalThis, "fetch")
        .mockResolvedValueOnce(new Response(JSON.stringify(mockCampaignResponse), { status: 200 }))
        .mockResolvedValueOnce(new Response("{}", { status: 200 }));

      const result = await Mailchimp.create().createDraft(mockArgs);

      expect(result.status).toBe("success");
      if (result.status !== "success") {
        expect(true).toBeFalsy();
        return;
      }
      expect(result.result.campaignId).toBe("campaign123");
    });

    it("should use blog author as from name if MAILCHIMP_FROM_NAME is not set", async () => {
      delete process.env.MAILCHIMP_FROM_NAME;

      const fetchSpy = spyOn(globalThis, "fetch")
        .mockResolvedValueOnce(new Response(JSON.stringify(mockCampaignResponse), { status: 200 }))
        .mockResolvedValueOnce(new Response("{}", { status: 200 }));

      await Mailchimp.create().createDraft(mockArgs);

      const [, options] = fetchSpy.mock.calls[0] as [string, RequestInit];
      const body = JSON.parse(options.body as string);
      expect(body.settings.from_name).toBe("David Dal Busco");
    });

    it("should use MAILCHIMP_FROM_NAME if set", async () => {
      process.env.MAILCHIMP_FROM_NAME = "Custom Sender";

      const fetchSpy = spyOn(globalThis, "fetch")
        .mockResolvedValueOnce(new Response(JSON.stringify(mockCampaignResponse), { status: 200 }))
        .mockResolvedValueOnce(new Response("{}", { status: 200 }));

      await Mailchimp.create().createDraft(mockArgs);

      const [, options] = fetchSpy.mock.calls[0] as [string, RequestInit];
      const body = JSON.parse(options.body as string);
      expect(body.settings.from_name).toBe("Custom Sender");
    });

    it("should call createCampaign with correct payload", async () => {
      const fetchSpy = spyOn(globalThis, "fetch")
        .mockResolvedValueOnce(new Response(JSON.stringify(mockCampaignResponse), { status: 200 }))
        .mockResolvedValueOnce(new Response("{}", { status: 200 }));

      await Mailchimp.create().createDraft(mockArgs);

      const [url, options] = fetchSpy.mock.calls[0] as [string, RequestInit];
      expect(url).toContain("/campaigns");
      expect(options.method).toBe("POST");

      const body = JSON.parse(options.body as string);
      expect(body.settings.subject_line).toBe("Test Subject");
      expect(body.settings.preview_text).toBe("Test Preview");
      expect(body.recipients.list_id).toBe("list123");
    });

    it("should call uploadContent with correct payload", async () => {
      const fetchSpy = spyOn(globalThis, "fetch")
        .mockResolvedValueOnce(new Response(JSON.stringify(mockCampaignResponse), { status: 200 }))
        .mockResolvedValueOnce(new Response("{}", { status: 200 }));

      await Mailchimp.create().createDraft(mockArgs);

      const [url, options] = fetchSpy.mock.calls[1] as [string, RequestInit];
      expect(url).toContain("/campaigns/campaign123/content");
      expect(options.method).toBe("PUT");

      const body = JSON.parse(options.body as string);
      expect(body.html).toBe("<h1>Test</h1>");
      expect(body.plain_text).toBe("Test");
    });
  });
});
