import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Req,
  UnauthorizedException,
} from '@nestjs/common';
import type { Request } from 'express';
import { fromNodeHeaders } from 'better-auth/node';

import { auth } from '../lib/auth';
import { prisma } from '../lib/prisma';
import { AgentsService } from './agents.service';
import { CreateAgentDto } from './dto/create-agent.dto';
import { UpdateAgentDto } from './dto/update-agent.dto';
import { UpdateAgentStatusDto } from './dto/update-agent-status.dto';

@Controller('agents')
export class AgentsController {
  constructor(private readonly agentsService: AgentsService) {}

  private async requireAdmin(req: Request) {
    const session = await auth.api.getSession({
      headers: fromNodeHeaders(req.headers),
    });

    if (!session?.user) {
      throw new UnauthorizedException('Vous devez être connecté.');
    }

    const admin = await prisma.agent.findUnique({
      where: { user_id: session.user.id },
      include: { application_role: true },
    });

    if (admin?.application_role.name !== 'ADMIN') {
      throw new ForbiddenException('Accès réservé aux administrateurs.');
    }

    if (!admin.is_active) {
      throw new ForbiddenException(
        'Votre compte administrateur est désactivé.',
      );
    }

    return admin;
  }

  @Post()
  async create(@Req() req: Request, @Body() dto: CreateAgentDto) {
    await this.requireAdmin(req);
    return this.agentsService.create(dto);
  }

  @Get()
  async findAll(
    @Req() req: Request,
    @Query('page') page = '1',
    @Query('limit') limit = '10',
    @Query('search') search?: string,
  ) {
    await this.requireAdmin(req);

    return this.agentsService.findAll(Number(page), Number(limit), search);
  }

  @Get(':id')
  async findOne(@Req() req: Request, @Param('id', ParseUUIDPipe) id: string) {
    await this.requireAdmin(req);
    return this.agentsService.findOne(id);
  }

  @Patch(':id')
  async update(
    @Req() req: Request,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateAgentDto,
  ) {
    await this.requireAdmin(req);
    return this.agentsService.update(id, dto);
  }

  @Patch(':id/status')
  async updateStatus(
    @Req() req: Request,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateAgentStatusDto,
  ) {
    const admin = await this.requireAdmin(req);

    if (admin.id === id && !dto.is_active) {
      throw new ForbiddenException(
        'Vous ne pouvez pas désactiver votre propre compte.',
      );
    }

    return this.agentsService.updateStatus(id, dto.is_active);
  }
}
