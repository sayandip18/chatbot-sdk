import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { InferenceMetricsRollup } from '../entities/inference-metrics-rollup.entity';
import { InferenceError } from '../entities/inference-error.entity';
import { DashboardService } from './dashboard.service';
import { DashboardController } from './dashboard.controller';

@Module({
  imports: [TypeOrmModule.forFeature([InferenceMetricsRollup, InferenceError])],
  controllers: [DashboardController],
  providers: [DashboardService],
})
export class DashboardModule {}
