import { NewsletterProvider } from "../_newsletter.ts";
import type { Result } from "../../common/types.ts";
import { assertNotEmptyString, sanitizeEmptyString } from "../../common/asserts.ts";
import type { CampaignId, NewsletterPayload } from "../../common/newsletter.ts";
import {
  type CampaignResponse,
  CampaignResponseSchema,
  CreateCampaignCodec,
  type CreateCampaignRecipients,
  type CreateCampaignSettings,
  SetCampaignContentCodec,
} from "./_types.ts";
import type { Blog } from "../../common/blog.ts";

export class MailchimpApiError extends Error {}

@NewsletterProvider
export class Mailchimp {
  readonly #apiKey: string;
  readonly #apiUrl: string;

  readonly #campaignSettings: Pick<CreateCampaignSettings, "replyTo"> &
    Partial<Pick<CreateCampaignSettings, "fromName">>;
  readonly #campaignRecipients: CreateCampaignRecipients;

  private constructor({
    apiKey,
    listId,
    fromName,
    replyTo,
  }: {
    apiKey: string;
    listId: string;
    fromName?: string;
    replyTo: string;
  }) {
    this.#apiKey = apiKey;

    // https://mailchimp.com/developer/marketing/docs/fundamentals/#api-structure
    const dataCenter = apiKey.split("-").at(-1);
    this.#apiUrl = `https://${dataCenter}.api.mailchimp.com/3.0`;

    this.#campaignSettings = { fromName, replyTo };
    this.#campaignRecipients = { listId };
  }

  static create(): Mailchimp {
    const { MAILCHIMP_API_KEY, MAILCHIMP_LIST_ID, MAILCHIMP_FROM_NAME, MAILCHIMP_REPLY_TO } =
      process.env;

    assertNotEmptyString(MAILCHIMP_API_KEY, "MAILCHIMP_API_KEY");

    assertNotEmptyString(MAILCHIMP_LIST_ID, "MAILCHIMP_LIST_ID");
    assertNotEmptyString(MAILCHIMP_REPLY_TO, "MAILCHIMP_REPLY_TO");

    return new this({
      apiKey: MAILCHIMP_API_KEY,
      listId: MAILCHIMP_LIST_ID,
      replyTo: MAILCHIMP_REPLY_TO,
      fromName: sanitizeEmptyString(MAILCHIMP_FROM_NAME),
    });
  }

  async createDraft({
    payload,
    blog,
  }: {
    payload: NewsletterPayload;
    blog: Pick<Blog, "author">;
  }): Promise<Result<{ campaignId: CampaignId }>> {
    const campaignResult = await this.#createCampaign({ ...payload, ...blog });

    if (campaignResult.status === "error") {
      return campaignResult;
    }

    const {
      result: { id: campaignId },
    } = campaignResult;

    const contentResult = await this.#uploadContent({
      ...payload,
      campaignId,
    });

    if (contentResult.status === "error") {
      return contentResult;
    }

    return { status: "success", result: { campaignId } };
  }

  /**
   * @see https://mailchimp.com/developer/marketing/api/campaigns/add-campaign/
   */
  async #createCampaign({
    author,
    subject,
    previewText,
  }: Pick<NewsletterPayload, "subject" | "previewText"> & Pick<Blog, "author">): Promise<
    Result<CampaignResponse>
  > {
    const response = await fetch(`${this.#apiUrl}/campaigns`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.#apiKey}`,
        "Content-Type": "application/json",
      },
      body: CreateCampaignCodec.decode({
        settings: {
          replyTo: this.#campaignSettings.replyTo,
          fromName: this.#campaignSettings.fromName ?? author,
          subjectLine: subject,
          previewText,
        },
        recipients: this.#campaignRecipients,
      }),
    });

    if (!response.ok) {
      return {
        status: "error",
        err: new MailchimpApiError(`createCampaign failed: ${await response.text()}`),
      };
    }

    const parsed = CampaignResponseSchema.safeParse(await response.json());

    if (!parsed.success) {
      return { status: "error", err: parsed.error };
    }

    const { data: result } = parsed;
    return { status: "success", result };
  }

  /**
   * @see https://mailchimp.com/developer/marketing/api/campaign-content/set-campaign-content/
   */
  async #uploadContent({
    campaignId,
    text: plainText,
    html,
  }: Pick<NewsletterPayload, "text" | "html"> & { campaignId: CampaignId }): Promise<Result<void>> {
    const response = await fetch(`${this.#apiUrl}/campaigns/${campaignId}/content`, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${this.#apiKey}`,
        "Content-Type": "application/json",
      },
      body: SetCampaignContentCodec.decode({
        plainText,
        html,
      }),
    });

    if (!response.ok) {
      return {
        status: "error",
        err: new MailchimpApiError(`setCampaignContent failed: ${await response.text()}`),
      };
    }

    return { status: "success", result: undefined };
  }
}
