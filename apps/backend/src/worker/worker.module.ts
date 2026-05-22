import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Message } from '../entities/message.entity';
import { RedisModule } from '../redis/redis.module';
import { PiiRedactorService } from './pii-redactor/pii-redactor.service';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        host: config.get<string>('DB_HOST', 'localhost'),
        port: config.get<number>('DB_PORT', 5432),
        username: config.get<string>('DB_USERNAME', 'postgres'),
        password: config.get<string>('DB_PASSWORD', 'postgres'),
        database: config.get<string>('DB_NAME', 'chatbot'),
        entities: [Message],
        synchronize: false,
      }),
    }),
    TypeOrmModule.forFeature([Message]),
    RedisModule,
  ],
  providers: [PiiRedactorService],
})
export class WorkerModule {}
