import { Controller, Get, Query } from '@nestjs/common';
import { DashboardService } from './dashboard.service';

function parseRangeHours(range: string): number {
  if (range === '6h') return 6;
  if (range === '24h') return 24;
  return 1;
}

@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('metrics')
  getMetrics(@Query('range') range = '1h') {
    return this.dashboardService.getMetrics(parseRangeHours(range));
  }

  @Get('errors')
  getErrors(@Query('range') range = '1h') {
    return this.dashboardService.getErrorBreakdown(parseRangeHours(range));
  }
}
