import { BadRequestException, Body, ConflictException, Controller, Post } from "@nestjs/common";
import { Throttle } from "@nestjs/throttler";
import { PrismaService } from "../prisma/prisma.service";
import { JoinWaitlistDto } from "./dto/join-waitlist.dto";

@Controller("waitlist")
export class WaitlistController {
  constructor(private readonly prisma: PrismaService) {}

  @Post()
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  async join(@Body() body: JoinWaitlistDto) {
    if (body.company?.trim()) {
      return { ok: true };
    }
    const email = body.email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 160) {
      throw new BadRequestException("That email does not look right.");
    }
    try {
      await this.prisma.waitlist.create({ data: { email } });
    } catch {
      throw new ConflictException("Already on the list");
    }
    return { ok: true };
  }
}
