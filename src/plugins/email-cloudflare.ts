/**
 * Cloudflare Email Service provider for Emdash CMS.
 *
 * Registers the exclusive `email:deliver` hook so Emdash auth (magic links,
 * invites, recovery) sends through the `SEND_EMAIL` Workers binding.
 *
 * Requires `send_email` binding in wrangler.jsonc and the sending domain
 * onboarded via the Cloudflare dashboard (Email Sending → Onboard Domain).
 *
 * @see https://developers.cloudflare.com/email-service/api/send-emails/workers-api/
 */

import type { PluginContext, PluginDescriptor, ResolvedPlugin } from "emdash";
import { definePlugin } from "emdash";

interface SendEmailBinding {
  send(message: {
    to: string | string[];
    from: string | { email: string; name: string };
    subject: string;
    html?: string;
    text?: string;
  }): Promise<{ messageId: string }>;
}

interface EmailDeliverEvent {
  message: { to: string; subject: string; text: string; html?: string };
  source: string;
}

export interface EmailCloudflareConfig {
  /** Sender address. Must match an `allowed_sender_addresses` entry on the binding (if set). */
  from: string;
  /** Optional display name shown alongside the sender address. */
  fromName?: string;
  /** Binding name from wrangler.jsonc. Defaults to `SEND_EMAIL`. */
  binding?: string;
}

export function emailCloudflare(config: EmailCloudflareConfig): PluginDescriptor {
  return {
    id: "email-cloudflare",
    version: "1.0.0",
    format: "native",
    entrypoint: "@/plugins/email-cloudflare",
    options: { ...config },
    capabilities: ["email:provide"],
  };
}

export function createPlugin(config: EmailCloudflareConfig): ResolvedPlugin {
  const bindingName = config.binding ?? "SEND_EMAIL";
  const from = config.fromName ? { email: config.from, name: config.fromName } : config.from;

  return definePlugin({
    id: "email-cloudflare",
    version: "1.0.0",
    capabilities: ["email:provide"],
    hooks: {
      "email:deliver": {
        exclusive: true,
        handler: async (event: EmailDeliverEvent, ctx: PluginContext): Promise<void> => {
          const { env } = await import("cloudflare:workers");
          const binding = (env as Record<string, unknown>)[bindingName] as
            | SendEmailBinding
            | undefined;

          if (!binding) {
            throw new Error(
              `[email-cloudflare] Worker binding "${bindingName}" not found. ` +
                "Add it to wrangler.jsonc under `send_email` and redeploy.",
            );
          }

          const { message, source } = event;
          const result = await binding.send({
            to: message.to,
            from,
            subject: message.subject,
            text: message.text,
            html: message.html,
          });

          ctx.log.info("Email delivered via Cloudflare Email Service", {
            to: message.to,
            source,
            messageId: result.messageId,
          });
        },
      },
    },
  });
}
