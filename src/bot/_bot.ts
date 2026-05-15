import type { Factory, Result } from "../common/types.ts";
import type { CampaignId, NewsletterPayload } from "../common/newsletter.ts";

interface Bot {
  sendApproval(params: {
    campaignId: CampaignId;
    payload: NewsletterPayload;
  }): Promise<Result<void>>;
}

export function BotProvider(_constructor: Factory<Bot>) {}
