import { Controller, Get, Param, Query, ForbiddenException, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { timingSafeEqual, createHash } from 'crypto';
import { MailService } from './mail.service';

@Controller('mail')
export class MailController {
  constructor(
    private readonly mail: MailService,
    private readonly config: ConfigService,
  ) {}

  private guard(token: string) {
    const expected = this.config.get<string>('ACCESS_TOKEN');
    if (!expected) throw new InternalServerErrorException('server_misconfigured');
    if (!token) throw new ForbiddenException('Invalid access token');
    // Hash both to fixed length before timing-safe comparison
    const a = createHash('sha256').update(token).digest();
    const b = createHash('sha256').update(expected).digest();
    if (!timingSafeEqual(a, b)) throw new ForbiddenException('Invalid access token');
  }

  @Get()
  list(@Query('token') token: string) {
    this.guard(token);
    return this.mail.listEmails();
  }

  @Get(':id')
  get(@Param('id') id: string, @Query('token') token: string) {
    this.guard(token);
    return this.mail.getEmail(id);
  }
}
