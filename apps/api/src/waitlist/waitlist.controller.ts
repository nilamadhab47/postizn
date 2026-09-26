import { BadRequestException, Body, ConflictException, Controller, Post } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

@Controller("waitlist")
export class WaitlistController {
  constructor(private readonly prisma: PrismaService) {}

  @Post()
  async join(@Body() body: { email?: string }) {
    const email = (body.email ?? "").trim().toLowerCase();
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
