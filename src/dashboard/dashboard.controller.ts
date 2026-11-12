import { Controller, Get, Query, BadRequestException } from '@nestjs/common';

import { DashboardService } from './dashboard.service';

@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get()
  async getDashboard(@Query('agentId') agentId: string) {
    if (!agentId) {
      throw new BadRequestException('Identifiant de l’agent obligatoire.');
    }

    return this.dashboardService.getDashboard(agentId);
  }
}
