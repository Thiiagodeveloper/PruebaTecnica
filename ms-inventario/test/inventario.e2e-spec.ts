// ms-inventario/test/inventario.e2e-spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe, HttpStatus } from '@nestjs/common';
import * as request from 'supertest';
import axios from 'axios';
import { AppModule } from '../src/app.module';
import { ConfigService } from '@nestjs/config';

jest.setTimeout(40000);

describe('InventarioController (E2E)', () => {
    let app: INestApplication;
    let httpServer: any;
    let configService: ConfigService;
    let productosMsUrlForSetup: string;
    let productosApiKey: string;

    let productoDeTestId: string | null = null;

    beforeAll(async () => {
        const moduleFixture: TestingModule = await Test.createTestingModule({
            imports: [AppModule],
        }).compile();

        app = moduleFixture.createNestApplication();
        app.useGlobalPipes(
            new ValidationPipe({
                whitelist: true, forbidNonWhitelisted: true, transform: true,
                transformOptions: { enableImplicitConversion: true },
            }),
        );
        app.setGlobalPrefix('api/v1');
        await app.init();
        httpServer = app.getHttpServer();

        configService = app.get(ConfigService);
        // Usamos '!' para indicar a TypeScript que estas variables DEBEN existir, o que falle.
        productosMsUrlForSetup = configService.get<string>('PRODUCTOS_MS_URL_FOR_E2E_SETUP')!;
        productosApiKey = configService.get<string>('PRODUCTOS_API_KEY')!;

        if (!productosMsUrlForSetup || !productosApiKey) {
            // Este throw es redundante si usamos '!' arriba, pero es una doble seguridad.
            throw new Error('PRODUCTOS_MS_URL_FOR_E2E_SETUP o PRODUCTOS_API_KEY no están configuradas en .env para los tests E2E de inventario.');
        }

        try {
            const productoPayload = { nombre: 'Producto E2E para Inventario', precio: 123.45, descripcion: 'Creado por test E2E de inventario' };
            const response = await axios.post(`${productosMsUrlForSetup}/productos`, productoPayload, {
                headers: { 'x-api-key': productosApiKey, 'Content-Type': 'application/json' },
            });
            if (response.status === 201 && response.data.data && response.data.data.id) {
                productoDeTestId = response.data.data.id;
                console.log(`>>> [E2E Inventario Setup] Producto de prueba creado en MS-Productos ID: ${productoDeTestId}`);
            } else {
                console.error('FALLO AL CREAR PRODUCTO DE PRUEBA EN MS-PRODUCTOS:', response.status, response.data);
                throw new Error('No se pudo crear el producto de prueba en MS-Productos.');
            }
        } catch (error) {
            const errorMessage = error.response?.data?.errors?.[0]?.detail || error.response?.data?.message || error.message;
            console.error('Error en beforeAll creando producto en MS-Productos:', errorMessage);
            throw new Error(`Setup fallido creando producto: ${errorMessage}`);
        }
    });

    afterAll(async () => {
        if (productoDeTestId) {
            try {
                await axios.delete(`${productosMsUrlForSetup}/productos/${productoDeTestId}`, {
                    headers: { 'x-api-key': productosApiKey },
                });
                console.log(`>>> [E2E Inventario Teardown] Producto de prueba eliminado ID: ${productoDeTestId}`);
            } catch (error) {
                const errorMessage = error.response?.data?.errors?.[0]?.detail || error.response?.data?.message || error.message;
                console.error('Error en afterAll eliminando producto de MS-Productos:', errorMessage);
            }
        }
        if (app) {
            await app.close();
        }
    });

    it('Debería tener un productoDeTestId definido después del beforeAll', () => {
        expect(productoDeTestId).toBeDefined();
        expect(typeof productoDeTestId).toBe('string');
        // Validar que sea un UUID si es posible (opcional)
        expect(productoDeTestId).toMatch(/^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/);
    });

    describe('/inventario/producto/:productoId', () => {
        const stockInicial = 50;

        it('PUT - Debe establecer el stock inicial para el producto de prueba', () => {
            if (!productoDeTestId) {
                console.warn('SKIP: productoDeTestId no definido para test "PUT /inventario/producto/:productoId"');
                return Promise.resolve(); // Devuelve una promesa resuelta para satisfacer a Jest/TS
            }
            return request(httpServer)
                .put(`/api/v1/inventario/producto/${productoDeTestId}`)
                .send({ cantidad: stockInicial })
                .expect(HttpStatus.OK)
                .then(response => {
                    expect(response.body.data.type).toBe('inventarios');
                    expect(response.body.data.id).toBe(productoDeTestId);
                    expect(response.body.data.attributes.cantidad_actual).toBe(stockInicial);
                });
        });

        it('GET - Debe consultar el inventario y obtener detalles del producto desde MS-Productos', () => {
            if (!productoDeTestId) {
                console.warn('SKIP: productoDeTestId no definido para test "GET /inventario/producto/:productoId"');
                return Promise.resolve();
            }
            return request(httpServer)
                .get(`/api/v1/inventario/producto/${productoDeTestId}`)
                .expect(HttpStatus.OK)
                .then(response => {
                    expect(response.body.data.type).toBe('inventarios');
                    expect(response.body.data.id).toBe(productoDeTestId);
                    expect(response.body.data.attributes.producto_id).toBe(productoDeTestId);
                    expect(response.body.data.attributes.nombre_producto).toBe('Producto E2E para Inventario');
                    expect(response.body.data.attributes.precio_producto).toBe(123.45);
                    // Esta aserción depende del test anterior o del beforeEach del describe anidado si lo hubiera
                    // Para ser más robusto, este test podría re-establecer el stock si fuera necesario
                    expect(response.body.data.attributes.cantidad_disponible).toBe(stockInicial);
                });
        });
    });

    describe('/inventario/compras (Flujo de Compra)', () => {
        const cantidadAComprar = 5;
        const stockParaCompra = 10;

        beforeEach(async () => {
            if (!productoDeTestId) {
                throw new Error('productoDeTestId no disponible para el beforeEach del flujo de compra. El setup en beforeAll falló.');
            }
            // Asegurar un stock conocido antes de cada test de compra
            const response = await request(httpServer)
                .put(`/api/v1/inventario/producto/${productoDeTestId}`)
                .send({ cantidad: stockParaCompra });
            expect(response.status).toBe(HttpStatus.OK); // Asegurar que el setup del stock fue bien
        });

        it('POST - Debe realizar una compra exitosa', () => {
            if (!productoDeTestId) { // Aunque el beforeEach debería fallar si no está
                console.warn('SKIP: productoDeTestId no definido para test "POST /inventario/compras exitosa"');
                return Promise.resolve();
            }
            return request(httpServer)
                .post('/api/v1/inventario/compras')
                .send({ producto_id: productoDeTestId, cantidad: cantidadAComprar })
                .expect(HttpStatus.CREATED)
                .then(response => {
                    expect(response.body.data.type).toBe('compras');
                    expect(response.body.data.attributes.producto_id).toBe(productoDeTestId);
                    expect(response.body.data.attributes.cantidad_comprada).toBe(cantidadAComprar);
                    expect(response.body.data.attributes.precio_unitario_en_compra).toBe(123.45);
                    expect(response.body.data.attributes.inventario_restante).toBe(stockParaCompra - cantidadAComprar);
                });
        });

        it('POST - Debe fallar la compra por inventario insuficiente', () => {
            if (!productoDeTestId) {
                console.warn('SKIP: productoDeTestId no definido para test "POST /inventario/compras insuficiente"');
                return Promise.resolve();
            }
            return request(httpServer)
                .post('/api/v1/inventario/compras')
                .send({ producto_id: productoDeTestId, cantidad: stockParaCompra + 5 })
                .expect(HttpStatus.CONFLICT)
                .then(response => {
                    expect(response.body.errors[0].title).toBe('Inventario insuficiente.');
                });
        });

        it('POST - Debe fallar la compra si el producto_id no existe en MS-Productos', () => {
            const idProductoInexistente = '11111111-1111-1111-1111-111111111111';
            return request(httpServer)
                .post('/api/v1/inventario/compras')
                .send({ producto_id: idProductoInexistente, cantidad: 1 })
                .expect(HttpStatus.NOT_FOUND)
                .then(response => {
                    expect(response.body.errors[0].detail).toContain(`Producto con ID "${idProductoInexistente}" no encontrado en el catálogo.`);
                });
        });
    });
});