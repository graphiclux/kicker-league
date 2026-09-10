import { Controller, Get, Param } from '@nestjs/common';
import { db } from './db';

const keys = new Set(['privacy', 'terms']);

@Controller('legal')
export class LegalController {
  @Get(':key')
  async get(@Param('key') key: string) {
    if (!keys.has(key)) throw new Error('Legal document not found');
    return db.legalDocument.findUniqueOrThrow({
      where: { key },
      select: { key: true, title: true, content: true, updatedAt: true },
    });
  }
}
