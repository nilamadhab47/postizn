import { BadRequestException, Body, ConflictException, Controller, Post } from "@nestjs/common";
import { Throttle } from "@nestjs/throttler";
import { PrismaService } from "../prisma/prisma.service";
import { JoinWaitlistDto } from "./dto/join-waitlist.dto";
import { parseWaitlistJoin } from "./waitlist.rules";

@Controller("waitlist")
export class WaitlistController {
  constructor(private readonly prisma: PrismaService) {}

  @Post()
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  async join(@Body() body: JoinWaitlistDto) {
    const parsed = parseWaitlistJoin(body);
    if (parsed.kind === "honeypot") {
      return { ok: true };
    }
    if (parsed.kind === "invalid") {
      throw new BadRequestException("That email does not look right.");
    }
    const email = parsed.email;
    try {
      await this.prisma.waitlist.create({ data: { email } });
    } catch {
      throw new ConflictException("Already on the list");
    }
    return { ok: true };
  }
}
