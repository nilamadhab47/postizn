import { Injectable } from "@nestjs/common";
import { Platform } from "@prisma/client";
import { expiryFromSeconds } from "./pkce";
import {
  LinkedinProvider,
  type LinkedInTokens,
} from "./linkedin.provider";
import type { AuthResult } from "./base-provider";
import type { ChannelPlan } from "../channel-catalog";

const PAGE_SCOPES = [
  "openid",
  "profile",
  "email",
  "w_organization_social",
  "r_organization_social",
];

type OrgAcl = {
  role?: string;
  state?: string;
  organization?: string;
  organizationalTarget?: string;
};

type OrgProfile = {
  id?: number | string;
  localizedName?: string;
  vanityName?: string;
};

@Injectable()
export class LinkedinPageProvider extends LinkedinProvider {
  override readonly platform: Platform = Platform.LINKEDIN_PAGE;
  override readonly slug: string = "linkedin-page";
  override readonly label: string = "LinkedIn Page";
  override readonly plan: ChannelPlan = "PRO";
  override readonly blurb: string =
    "Company Page you admin. Needs Community Management on the LinkedIn app.";

  protected override authScopes() {
    return PAGE_SCOPES;
  }

  protected override authorUrn(platformId: string) {
    const id = platformId.replace(/^urn:li:organization:/, "");
    return `urn:li:organization:${id}`;
  }

  protected override async accountFromTokens(tokens: LinkedInTokens): Promise<AuthResult> {
    const org = await this.firstAdminPage(tokens.access_token);
    if (!org) {
      throw new Error("NO_PAGE");
    }
    return {
      platformId: org.id,
      username: org.vanity ?? org.id,
      displayName: org.name,
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      tokenExpiry: expiryFromSeconds(tokens.expires_in),
    };
  }

  private async firstAdminPage(accessToken: string) {
    const ids = await this.listAdminOrgIds(accessToken);
    for (const id of ids) {
      const profile = await this.orgProfile(accessToken, id);
      return {
        id,
        name: profile.localizedName ?? `Page ${id}`,
        vanity: profile.vanityName,
      };
    }
    return null;
  }

  private async listAdminOrgIds(accessToken: string) {
    const urls = [
      "https://api.linkedin.com/rest/organizationAcls?q=roleAssignee&role=ADMINISTRATOR&state=APPROVED&count=20",
      "https://api.linkedin.com/v2/organizationAcls?q=roleAssignee&role=ADMINISTRATOR&state=APPROVED&count=20",
    ];
    for (const url of urls) {
      const res = await fetch(url, { headers: this.restHeaders(accessToken) });
      const json = (await res.json().catch(() => ({}))) as {
        elements?: OrgAcl[];
        status?: number;
        message?: string;
        serviceErrorCode?: number;
      };
      if (res.status === 403 || json.serviceErrorCode === 100) {
        throw new Error("SCOPE_DENIED");
      }
      if (!res.ok) continue;
      const ids = (json.elements ?? [])
        .map((row) => orgIdFromUrn(row.organization ?? row.organizationalTarget))
        .filter((id): id is string => Boolean(id));
      if (ids.length) return ids;
    }
    return [];
  }

  private async orgProfile(accessToken: string, id: string): Promise<OrgProfile> {
    const res = await fetch(`https://api.linkedin.com/rest/organizations/${id}`, {
      headers: this.restHeaders(accessToken),
    });
    if (!res.ok) return { id };
    return (await res.json()) as OrgProfile;
  }
}

function orgIdFromUrn(value?: string) {
  if (!value) return null;
  const match = value.match(/organization:(\d+)/);
  return match?.[1] ?? null;
}
