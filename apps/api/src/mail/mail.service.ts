import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PAID_SKUS, rupeesFromPaise, type BillingInterval, type PaidPlanId } from "@postn/shared";
import { Resend } from "resend";
import { TRIAL_DAYS } from "../plan/entitlements";
import {
  paymentFailedMail,
  paymentSucceededMail,
  publishMail,
  subscriptionEndedMail,
  subscriptionRenewedMail,
  trialEndedMail,
  trialReminderMail,
  welcomeMail,
  type MailContent,
} from "./mail.templates";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const INVALID_HOST = /@(signin\.)?postn\.invalid$/i;

export type MailUser = {
  email: string;
  name?: string | null;
  billingExempt?: boolean;
};

export type PublishMailInput = MailUser & {
  postId: string;
  snippet: string;
  published: string[];
  failed: { label: string; reason: string }[];
};

export type PaidMailInput = MailUser & {
  plan: PaidPlanId;
  interval: BillingInterval;
  periodEnd?: Date | null;
};

@Injectable()
export class MailService {
  private readonly log = new Logger(MailService.name);
  private readonly resend: Resend | null;
  private readonly from: string;
  private readonly replyTo: string | undefined;

  constructor(private readonly config: ConfigService) {
    const key = this.config.get<string>("RESEND_API_KEY")?.trim();
    this.resend = key ? new Resend(key) : null;
    this.from =
      this.config.get<string>("RESEND_FROM")?.trim() || "postN <hello@postind.xyz>";
    this.replyTo = this.config.get<string>("WAITLIST_NOTIFY_EMAIL")?.trim() || undefined;
    if (!this.resend) {
      this.log.warn("RESEND_API_KEY is empty — transactional mail is off");
    }
  }

  origin() {
    return (this.config.get<string>("FRONTEND_URL") ?? "http://localhost:3000").replace(
      /\/$/,
      "",
    );
  }

  welcome(user: MailUser) {
    const mail = welcomeMail({
      name: user.name ?? null,
      origin: this.origin(),
      trialDays: TRIAL_DAYS,
    });
    this.queue(user.email, mail, "welcome");
  }

  trialReminder(user: MailUser, daysLeft: number) {
    const mail = trialReminderMail({
      name: user.name ?? null,
      origin: this.origin(),
      daysLeft,
    });
    this.queue(user.email, mail, "trial-reminder");
  }

  trialEnded(user: MailUser) {
    const mail = trialEndedMail({
      name: user.name ?? null,
      origin: this.origin(),
    });
    this.queue(user.email, mail, "trial-ended");
  }

  publishOutcome(input: PublishMailInput) {
    const mail = publishMail({
      name: input.name ?? null,
      origin: this.origin(),
      postId: input.postId,
      snippet: input.snippet,
      published: input.published,
      failed: input.failed,
    });
    this.queue(input.email, mail, "publish");
  }

  paymentSucceeded(input: PaidMailInput) {
    if (input.billingExempt) return;
    this.queue(input.email, paymentSucceededMail(this.paidVars(input)), "payment-ok");
  }

  subscriptionRenewed(input: PaidMailInput) {
    if (input.billingExempt) return;
    this.queue(input.email, subscriptionRenewedMail(this.paidVars(input)), "renewed");
  }

  paymentFailed(input: PaidMailInput) {
    if (input.billingExempt) return;
    this.queue(input.email, paymentFailedMail(this.paidVars(input)), "payment-fail");
  }

  subscriptionEnded(input: PaidMailInput & { reason: "canceled" | "expired" }) {
    if (input.billingExempt) return;
    this.queue(
      input.email,
      subscriptionEndedMail({ ...this.paidVars(input), reason: input.reason }),
      "ended",
    );
  }

  private paidVars(input: PaidMailInput) {
    const sku = PAID_SKUS[input.plan][input.interval];
    return {
      name: input.name ?? null,
      origin: this.origin(),
      plan: input.plan,
      interval: input.interval,
      amountLabel: `₹${rupeesFromPaise(sku.amountPaise).toLocaleString("en-IN")}`,
      periodEndLabel: input.periodEnd ? formatIst(input.periodEnd) : null,
    };
  }

  private queue(to: string, mail: MailContent, kind: string) {
    void this.deliver(to, mail, kind);
  }

  private async deliver(to: string, mail: MailContent, kind: string) {
    const email = to.trim().toLowerCase();
    if (!EMAIL_RE.test(email) || INVALID_HOST.test(email)) {
      this.log.debug(`skip ${kind}: no deliverable address`);
      return;
    }
    if (!this.resend) return;

    try {
      const result = await this.resend.emails.send({
        from: this.from,
        to: email,
        replyTo: this.replyTo,
        subject: mail.subject,
        text: mail.text,
        html: mail.html,
      });
      if (result.error) {
        this.log.warn(`Resend ${kind} to ${email}: ${result.error.message}`);
        return;
      }
      this.log.log(`sent ${kind} to ${email}`);
    } catch (err) {
      const message = err instanceof Error ? err.message : "send failed";
      this.log.warn(`Resend ${kind} to ${email}: ${message}`);
    }
  }
}

function formatIst(date: Date) {
  return new Intl.DateTimeFormat("en-IN", {
    timeZone: "Asia/Kolkata",
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);
}
