// ms-productos/test/productos.e2e-spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe, HttpStatus } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { ConfigService } from '@nestjs/config';

jest.setTimeout(30000); // Aumentar el timeout global para todas las pruebas en este archivo

describe('ProductosController (E2E)', () => {
    let app: INestApplication;
    let apiKeyValue: string;
    let httpServer: any; // Para usar con supertest

    beforeAll(async () => {
        const moduleFixture: TestingModule = await Test.createTestingModule({
            imports: [AppModule],
        }).compile();

        app = moduleFixture.createNestApplication();
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
        app.setGlobalPrefix('api/v1');

        const configService = app.get(ConfigService);
        apiKeyValue = configService.get<string>('PRODUCTOS_API_KEY') ?? "SuperClaveSecreta123!";
        if (!apiKeyValue) {
            console.warn("PRODUCTOS_API_KEY no encontrada en ConfigService para E2E, usando fallback.");
        }

        await app.init();
        httpServer = app.getHttpServer(); // Obtener el servidor HTTP para supertest
    });

    afterAll(async () => {
        if (app) { // Solo intentar cerrar si la app fue inicializada
            await app.close();
        }
    });

    let nuevoProductoId: string;
    const productoPayload = {
        nombre: 'Producto E2E Test',
        precio: 99.99,
        descripcion: 'Descripción para prueba E2E',
    };

    it('POST /productos - Debe crear un nuevo producto', () => {
        return request(httpServer) // Usar httpServer aquí
            .post('/api/v1/productos')
            .set('x-api-key', apiKeyValue)
            .send(productoPayload)
            .expect(HttpStatus.CREATED)
            .then((response) => {
                expect(response.body.data).toBeDefined();
                expect(response.body.data.type).toEqual('productos');
                expect(response.body.data.attributes.nombre).toEqual(productoPayload.nombre);
                expect(response.body.data.attributes.precio).toEqual(productoPayload.precio);
                expect(response.body.data.id).toBeDefined();
                nuevoProductoId = response.body.data.id;
            });
    });

    it('POST /productos - Debe fallar sin API Key', () => {
        return request(httpServer)
            .post('/api/v1/productos')
            .send(productoPayload)
            .expect(HttpStatus.UNAUTHORIZED);
    });

    it('POST /productos - Debe fallar con API Key incorrecta', () => {
        return request(httpServer)
            .post('/api/v1/productos')
            .set('x-api-key', 'CLAVE-INCORRECTA')
            .send(productoPayload)
            .expect(HttpStatus.UNAUTHORIZED);
    });

    it('POST /productos - Debe fallar si faltan campos requeridos (nombre)', () => {
        const payloadInvalido = { ...productoPayload };
        // delete payloadInvalido.nombre; // TypeScript podría quejarse si nombre no es opcional
        const payloadSinNombre: any = { precio: productoPayload.precio, descripcion: productoPayload.descripcion };

        return request(httpServer)
            .post('/api/v1/productos')
            .set('x-api-key', apiKeyValue)
            .send(payloadSinNombre)
            .expect(HttpStatus.BAD_REQUEST)
            .then((response) => {
                expect(response.body.errors).toBeInstanceOf(Array);
                expect(response.body.errors.length).toBeGreaterThan(0);
                const nombreError = response.body.errors.find(e => e.detail.includes('nombre'));
                expect(nombreError).toBeDefined();
            });
    });

    describe('cuando un producto ya ha sido creado', () => {
        // Asegurarse que el primer test (crear producto) se haya ejecutado y nuevoProductoId tenga valor
        beforeAll(() => {
            if (!nuevoProductoId) {
                // Esto puede pasar si el test de creación falló.
                // Para robustez, podríamos crear un producto aquí también si es necesario.
                // Por ahora, asumimos que el test de POST lo crea.
                console.warn("ID de producto no disponible para tests GET/PATCH/DELETE. ¿Falló el test POST inicial?");
            }
        });

        it('GET /productos/:id - Debe obtener el producto creado', async () => {
            if (!nuevoProductoId) {
                return pending("ID de producto no disponible, saltando test GET.");
            }
            const response = await request(httpServer)
                .get(`/api/v1/productos/${nuevoProductoId}`)
                .set('x-api-key', apiKeyValue)
                .expect(HttpStatus.OK);
            expect(response.body.data).toBeDefined();
            expect(response.body.data.id).toEqual(nuevoProductoId);
            expect(response.body.data.attributes.nombre).toEqual(productoPayload.nombre);
        });

        it('GET /productos/:id - Debe devolver 404 para un ID de producto no existente', () => {
            const idInexistente = '00000000-0000-0000-0000-000000000000';
            return request(httpServer)
                .get(`/api/v1/productos/${idInexistente}`)
                .set('x-api-key', apiKeyValue)
                .expect(HttpStatus.NOT_FOUND);
        });
    });

    // (Opcional: tests para PATCH y DELETE si los implementaste y quieres probarlos en E2E)
});