/**
 * WhatsApp Business API Service
 * Handles sending messages via Meta's WhatsApp API
 * 
 * Required environment variables:
 * - WHATSAPP_PHONE_NUMBER_ID: Your WhatsApp Business phone number ID
 * - WHATSAPP_ACCESS_TOKEN: Meta Business API access token
 * - WHATSAPP_BUSINESS_ACCOUNT_ID: Your WhatsApp Business Account ID
 */

class WhatsAppService {
  private phoneNumberId: string;
  private accessToken: string;
  private apiVersion: string = "v20.0";
  private baseUrl: string = "https://graph.facebook.com";

  constructor() {
    this.phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID || "";
    this.accessToken = process.env.WHATSAPP_ACCESS_TOKEN || "";

    if (!this.phoneNumberId || !this.accessToken) {
      console.warn(
        "WhatsApp credentials not configured. Set WHATSAPP_PHONE_NUMBER_ID and WHATSAPP_ACCESS_TOKEN"
      );
    }
  }

  /**
   * Send a simple text message
   */
  async sendTextMessage(to: string, body: string): Promise<boolean> {
    if (!this.phoneNumberId || !this.accessToken) {
      console.error("WhatsApp credentials not configured");
      return false;
    }

    try {
      const response = await fetch(
        `${this.baseUrl}/${this.apiVersion}/${this.phoneNumberId}/messages`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${this.accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            messaging_product: "whatsapp",
            to,
            type: "text",
            text: { body },
          }),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        console.error("WhatsApp API error:", error);
        return false;
      }

      return true;
    } catch (error) {
      console.error("Error sending WhatsApp message:", error);
      return false;
    }
  }

  /**
   * Send a template message (for approved templates like invitations)
   */
  async sendTemplateMessage(
    to: string,
    templateName: string,
    parameters?: Record<string, string>
  ): Promise<boolean> {
    if (!this.phoneNumberId || !this.accessToken) {
      console.error("WhatsApp credentials not configured");
      return false;
    }

    try {
      const body: Record<string, unknown> = {
        messaging_product: "whatsapp",
        to,
        type: "template",
        template: {
          name: templateName,
          language: { code: "en_US" },
        },
      };

      if (parameters) {
        const template = body.template as Record<string, unknown>;
        body.template = {
          ...template,
          parameters: {
            body: {
              parameters: Object.values(parameters).map((text) => ({
                type: "text",
                text,
              })),
            },
          },
        };
      }

      const response = await fetch(
        `${this.baseUrl}/${this.apiVersion}/${this.phoneNumberId}/messages`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${this.accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(body),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        console.error("WhatsApp API error:", error);
        return false;
      }

      return true;
    } catch (error) {
      console.error("Error sending WhatsApp template message:", error);
      return false;
    }
  }

  /**
   * Send bulk text messages to multiple recipients
   */
  async sendBulkMessages(
    recipients: Array<{ phone: string; name: string }>,
    message: string
  ): Promise<{ successful: number; failed: number; errors: string[] }> {
    const results = { successful: 0, failed: 0, errors: [] as string[] };

    for (const recipient of recipients) {
      try {
        // Ensure phone number is in international format (without +)
        const phone = recipient.phone.replace(/\D/g, "");

        // Personalize message with name if needed
        let personalizedMessage = message;
        if (recipient.name) {
          personalizedMessage = message.replace("{name}", recipient.name);
        }

        const success = await this.sendTextMessage(phone, personalizedMessage);

        if (success) {
          results.successful++;
        } else {
          results.failed++;
          results.errors.push(`Failed to send to ${recipient.phone}`);
        }

        // Add small delay between requests to avoid rate limiting
        await new Promise((resolve) => setTimeout(resolve, 100));
      } catch (error) {
        results.failed++;
        results.errors.push(
          `Error sending to ${recipient.phone}: ${error instanceof Error ? error.message : String(error)}`
        );
      }
    }

    return results;
  }
}

export const whatsappService = new WhatsAppService();
