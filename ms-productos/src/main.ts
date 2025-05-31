import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe, VersioningType } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger'; // <<< IMPORTAR

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
  app.useGlobalFilters(new HttpExceptionFilter());
  app.setGlobalPrefix('api');

  // Habilitar versionado de API (opcional, pero buena práctica)
  app.enableVersioning({
    type: VersioningType.URI,
    defaultVersion: '1',
  });


  // --- CONFIGURACIÓN DE SWAGGER ---
  const swaggerConfig = new DocumentBuilder()
    .setTitle('Microservicio de Productos')
    .setDescription('API para la gestión de productos. Todos los endpoints devuelven respuestas en formato JSON API (https://jsonapi.org/).')
    .setVersion('1.0')
    .addTag('productos', 'Operaciones relacionadas con los productos') // Etiqueta para agrupar endpoints
    .addApiKey( // Para documentar que se necesita una API Key
      {
        type: 'apiKey', // 'apiKey' o 'http' (para bearer)
        name: 'x-api-key', // El nombre del header
        in: 'header',
        description: 'API Key para autenticación entre servicios o acceso directo.',
      },
      'ApiKeyAuth', // Un nombre para esta definición de seguridad, ej. 'access-key' o 'ApiKeyAuth'
    )
    .build();
  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api-docs', app, document, { // La ruta donde estará la UI de Swagger
    swaggerOptions: {
      persistAuthorization: true,
    },
    customSiteTitle: "Documentación API Productos", // Título de la pestaña del navegador
  });
  // --- FIN DE CONFIGURACIÓN DE SWAGGER ---

  const configService = app.get(ConfigService);
  const port = configService.get<number>('PORT') || 3001;
  await app.listen(port);
  console.log(`Microservicio de Productos corriendo en el puerto ${port}`);
  console.log(`Documentación Swagger disponible en http://localhost:${port}/api-docs`);
}
bootstrap();