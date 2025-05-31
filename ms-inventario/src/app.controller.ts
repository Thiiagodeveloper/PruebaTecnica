import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';
import { ApiOperation } from '@nestjs/swagger';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) { }

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }
  @Get('health')
  @ApiOperation({ summary: "Verifica el estado de salud del servicio de Inventario" })
  healthCheck() { return { status: 'ok', service: 'Inventario MS', timestamp: new Date().toISOString() }; }
}
