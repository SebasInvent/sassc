import { Module } from '@nestjs/common';
import { ModelsProxyController } from './models-proxy.controller';

@Module({
  controllers: [ModelsProxyController],
})
export class ModelsProxyModule {}
