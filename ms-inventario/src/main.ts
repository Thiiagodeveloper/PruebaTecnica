import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe, VersioningType } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );
  app.setGlobalPrefix('api');

  // Habilitar versionado de API
  app.enableVersioning({
    type: VersioningType.URI,
    defaultVersion: '1',
  });

  // --- CONFIGURACIÓN DE SWAGGER para MS-INVENTARIO ---
  const swaggerConfigInventario = new DocumentBuilder()
    .setTitle('Microservicio de Inventario y Compras')
    .setDescription('API para la gestión de inventario y procesamiento de compras. Respuestas en formato JSON API.')
    .setVersion('1.0')
    .addTag('inventario', 'Operaciones de consulta y actualización de stock de productos')
    .addTag('compras', 'Operaciones relacionadas con el proceso de compra de productos')
    .build();
  const documentInventario = SwaggerModule.createDocument(app, swaggerConfigInventario);
  SwaggerModule.setup('api-docs', app, documentInventario, {
    swaggerOptions: {
      persistAuthorization: true,
    },
    customSiteTitle: "Documentación API Inventario",
  });

  const configService = app.get(ConfigService);
  const port = configService.get<number>('PORT') || 3002;
  await app.listen(port);
  console.log(`Microservicio de Inventario corriendo en el puerto ${port}`);
  console.log(`Documentación Swagger de Inventario disponible en http://localhost:${port}/api-docs`);
}
bootstrap();