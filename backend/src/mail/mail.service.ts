import { Injectable, InternalServerErrorException, GatewayTimeoutException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { google } from 'googleapis';

@Injectable()
export class MailService {
  private gmail: ReturnType<typeof google.gmail>;

  constructor(private config: ConfigService) {
    const auth = new google.auth.OAuth2(
      config.get<string>('GMAIL_CLIENT_ID'),
      config.get<string>('GMAIL_CLIENT_SECRET'),
    );
    auth.setCredentials({ refresh_token: config.get<string>('GMAIL_REFRESH_TOKEN') });
    this.gmail = google.gmail({ version: 'v1', auth });
  }

  async listEmails() {
    try {
      const filterFrom = this.config.get<string>('GMAIL_FILTER_FROM');
      const listRes = await this.gmail.users.messages.list({
        userId: 'me',
        maxResults: 20,
        labelIds: ['INBOX'],
        ...(filterFrom ? { q: `from:${filterFrom}` } : {}),
      });

      const messages = listRes.data.messages || [];
      const results = await Promise.allSettled(messages.map((m) => this.getSummary(m.id)));
      return results
        .filter((r): r is PromiseFulfilledResult<any> => r.status === 'fulfilled')
        .map((r) => r.value);
    } catch (err) {
      this.handleGmailError(err);
    }
  }

  async getEmail(id: string) {
    try {
      const res = await this.gmail.users.messages.get({ userId: 'me', id, format: 'full' });
      return this.parseFull(res.data);
    } catch (err) {
      this.handleGmailError(err);
    }
  }

  private async getSummary(id: string) {
    const res = await this.gmail.users.messages.get({
      userId: 'me',
      id,
      format: 'metadata',
      metadataHeaders: ['From', 'Subject', 'Date'],
    });
    const msg = res.data;
    if (!msg.payload) return { id: msg.id, from: '', subject: '', snippet: msg.snippet ?? '', receivedAt: null, isUnread: false };
    return {
      id: msg.id,
      from: this.header(msg.payload.headers, 'From'),
      subject: this.header(msg.payload.headers, 'Subject'),
      snippet: msg.snippet ?? '',
      receivedAt: this.parseDate(msg.internalDate),
      isUnread: (msg.labelIds ?? []).includes('UNREAD'),
    };
  }

  private parseFull(msg: any) {
    if (!msg.payload) throw new InternalServerErrorException('no_payload');
    const { text, html } = this.extractBody(msg.payload);
    return {
      id: msg.id,
      from: this.header(msg.payload.headers, 'From'),
      to: this.header(msg.payload.headers, 'To'),
      subject: this.header(msg.payload.headers, 'Subject'),
      receivedAt: this.parseDate(msg.internalDate),
      text,
      html,
    };
  }

  private extractBody(payload: any): { text: string; html: string } {
    let text = '';
    let html = '';
    const traverse = (part: any) => {
      if (part.mimeType === 'text/plain' && part.body?.data && !text) {
        text = Buffer.from(part.body.data, 'base64url').toString('utf-8');
      } else if (part.mimeType === 'text/html' && part.body?.data && !html) {
        html = Buffer.from(part.body.data, 'base64url').toString('utf-8');
      }
      if (part.parts) part.parts.forEach(traverse);
    };
    traverse(payload);
    return { text, html };
  }

  private parseDate(internalDate: string | undefined): string | null {
    if (!internalDate) return null;
    const ms = Number(internalDate);
    if (Number.isNaN(ms)) return null;
    return new Date(ms).toISOString();
  }

  private header(headers: any[], name: string): string {
    return headers?.find((h) => h?.name?.toLowerCase() === name.toLowerCase())?.value ?? '';
  }

  private handleGmailError(err: any): never {
    const msg = err?.response?.data?.error ?? err?.message ?? '';
    if (msg.includes('invalid_grant') || err?.response?.status === 401) {
      throw new InternalServerErrorException('credentials_invalid');
    }
    throw new GatewayTimeoutException('gmail_unavailable');
  }
}
