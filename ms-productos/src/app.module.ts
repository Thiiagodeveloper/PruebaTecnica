import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProductosModule } from './productos/productos.module';
import { Producto } from './productos/entities/producto.entity';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { APP_FILTER } from '@nestjs/core';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
      ignoreEnvFile: process.env.NODE_ENV === 'production',
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => {
        const host = configService.get<string>('DB_HOST');
        const port = parseInt(configService.get<string>('DB_PORT', '5432'), 10);
        const username = configService.get<string>('DB_USERNAME');
        const password = configService.get<string>('DB_PASSWORD');
        const database = configService.get<string>('DB_DATABASE_PRODUCTOS');


        console.log('--- E2E DB CONNECTION PARAMS ---');
        console.log(`DB_HOST: ${host}`);
        console.log(`DB_PORT: ${port}`);
        console.log(`DB_USERNAME: ${username}`);
        console.log(`DB_PASSWORD: ${password ? '********' : 'NOT SET!'}`);
        console.log('--------------------------------');

        if (!host || !port || !username || !password || !database) {
          throw new Error('Faltan variables de entorno para la conexión a la base de datos en el entorno de prueba E2E.');
        }

        return {
          type: 'postgres',
          host,
          port,
          username,
          password,
          database,
          entities: [Producto],
          synchronize: true,
          autoLoadEntities: true,
          logging: false,
          retryAttempts: 10,
          retryDelay: 3000,
        };
      },
      inject: [ConfigService],
    }),
    ProductosModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_FILTER,
      useClass: HttpExceptionFilter,
    },
  ],
})
export class AppModule { }