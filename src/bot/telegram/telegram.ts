import {
  assertNotEmptyString,
  NotEmptyStringSchema,
  sanitizeEmptyString,
} from "../../common/asserts.ts";
import type { Result } from "../../common/types.ts";
import type { CampaignId, NewsletterPayload } from "../../common/newsletter.ts";
import { BotProvider } from "../_bot.ts";
import { type InlineKeyboard, SendMessageCodec, TestEmailsSchema } from "./_types.ts";

export class TelegramApiError extends Error {}

@BotProvider
export class Telegram {
  readonly #botToken: string;
  readonly #chatId: string;
  readonly #testEmails: string[] | null;

  readonly #apiUrl = "https://api.telegram.org";

  private constructor({
    botToken,
    chatId,
    testEmails,
  }: {
    botToken: string;
    chatId: string;
    testEmails?: string;
  }) {
    this.#botToken = botToken;
    this.#chatId = chatId;

    const testEMailsParsed = NotEmptyStringSchema.safeParse(testEmails);
    const testEmailsMapped = testEMailsParsed.success
      ? testEMailsParsed.data.split(",").map((email) => email.trim())
      : null;

    this.#testEmails = TestEmailsSchema.parse(testEmailsMapped);
  }

  static create(): Telegram {
    const { TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID, MAILCHIMP_TEST_EMAILS } = process.env;

    assertNotEmptyString(TELEGRAM_BOT_TOKEN, "TELEGRAM_BOT_TOKEN");
    assertNotEmptyString(TELEGRAM_CHAT_ID, "TELEGRAM_CHAT_ID");

    return new this({
      botToken: TELEGRAM_BOT_TOKEN,
      chatId: TELEGRAM_CHAT_ID,
      testEmails: sanitizeEmptyString(MAILCHIMP_TEST_EMAILS),
    });
  }

  async sendApproval({
    campaignId,
    payload,
  }: {
    campaignId: CampaignId;
    payload: NewsletterPayload;
  }): Promise<Result<void>> {
    const inlineKeyboard: InlineKeyboard = [
      ...(this.#testEmails !== null && this.#testEmails.length > 0
        ? [
            [
              {
                text: "📧 Send Test Email",
                callbackData: `test:${campaignId}:${this.#testEmails.join(",")}`,
              },
            ],
          ]
        : []),
      [
        { text: "🗑 Discard", callbackData: `discard:${campaignId}` },
        { text: "✅ Approve & Send", callbackData: `send:${campaignId}` },
      ],
    ];

    const response = await fetch(`${this.#apiUrl}/bot${this.#botToken}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: SendMessageCodec.decode({
        chatId: this.#chatId,
        text: `<b>New newsletter draft ready</b>

<b>Subject:</b> ${payload.subject}
<b>Preview:</b> ${payload.previewText}

Tap to approve or discard.`,
        inlineKeyboard,
      }),
    });

    if (!response.ok) {
      return {
        status: "error",
        err: new TelegramApiError(`Telegram sendMessage failed: ${await response.text()}`),
      };
    }

    return { status: "success", result: undefined };
  }
}
