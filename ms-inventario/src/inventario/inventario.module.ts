// src/inventario/inventario.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HttpModule } from '@nestjs/axios'; // Importante para llamadas HTTP
import { ConfigModule } from '@nestjs/config'; // Si necesitas ConfigService aquí
import { Inventario } from './entities/inventario.entity';
import { InventarioController } from './inventario.controller';
import { InventarioService } from './inventario.service';
import { Compra } from './entities/compra.entity';

@Module({
    imports: [
        TypeOrmModule.forFeature([Inventario, Compra]),
        HttpModule,
        ConfigModule,

    ],
    controllers: [InventarioController],
    providers: [InventarioService],
})
export class InventarioModule { }