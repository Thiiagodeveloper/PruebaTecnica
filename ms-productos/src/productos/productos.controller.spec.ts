import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { HttpStatus, ParseUUIDPipe } from '@nestjs/common';
import { ProductosController } from './productos.controller';
import { ProductosService } from './productos.service';
import { CreateProductoDto } from './dto/create-producto.dto';
import { UpdateProductoDto } from './dto/update-producto.dto';
import { Producto } from './entities/producto.entity';
import { ApiKeyGuard } from '../../src/common/guards/api-key.guard';
import { toJsonApi, toJsonApiCollection } from '../../src/common/dto/json-api-response.dto';

// Mock del servicio
const mockProductosService = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
};

// Mock del ApiKeyGuard para que siempre permita el acceso en tests
const mockApiKeyGuard = {
    canActivate: jest.fn(() => true),
};

const PRODUCTO_RESOURCE_TYPE = 'productos';

describe('ProductosController', () => {
    let controller: ProductosController;
    let service: typeof mockProductosService;

    const mockId = 'a-valid-uuid';
    const mockProducto: Producto = { id: mockId, nombre: 'Test', precio: 10, descripcion: 'Desc' };
    const mockProductoAttributes = { nombre: 'Test', precio: 10, descripcion: 'Desc' };


    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            controllers: [ProductosController],
            providers: [
                {
                    provide: ProductosService,
                    useValue: mockProductosService,
                },
                ConfigService, // ApiKeyGuard depende de ConfigService, aunque lo mockeemos
            ],
        })
            .overrideGuard(ApiKeyGuard) // Sobrescribe el guard globalmente para este módulo de test
            .useValue(mockApiKeyGuard)
            .compile();

        controller = module.get<ProductosController>(ProductosController);
        service = module.get(ProductosService);

        // Resetear mocks antes de cada test
        jest.clearAllMocks();
    });

    it('should be defined', () => {
        expect(controller).toBeDefined();
    });

    describe('create', () => {
        it('should create a product and return it in JSON API format', async () => {
            const createDto: CreateProductoDto = { nombre: 'Nuevo', precio: 20 };
            service.create.mockResolvedValue(mockProducto);

            const result = await controller.create(createDto);

            expect(service.create).toHaveBeenCalledWith(createDto);
            expect(result).toEqual({ data: toJsonApi(PRODUCTO_RESOURCE_TYPE, mockProducto) });
        });
    });

    describe('findAll', () => {
        it('should return an array of products in JSON API format', async () => {
            const productosArray = [mockProducto, { ...mockProducto, id: 'uuid-2' }];
            service.findAll.mockResolvedValue(productosArray);

            const result = await controller.findAll();
            expect(service.findAll).toHaveBeenCalled();
            expect(result).toEqual({ data: toJsonApiCollection(PRODUCTO_RESOURCE_TYPE, productosArray) });
        });
    });

    describe('findOne', () => {
        it('should return a single product in JSON API format', async () => {
            service.findOne.mockResolvedValue(mockProducto);

            const result = await controller.findOne(mockId);

            expect(service.findOne).toHaveBeenCalledWith(mockId);
            expect(result).toEqual({ data: toJsonApi(PRODUCTO_RESOURCE_TYPE, mockProducto) });
        });
        // NotFoundException es manejada por el servicio y luego por el HttpExceptionFilter global.
        // Probar que el servicio lance la excepción es suficiente para el service spec.
        // Aquí, solo probamos el camino feliz.
    });

    describe('update', () => {
        it('should update a product and return it in JSON API format', async () => {
            const updateDto: UpdateProductoDto = { nombre: 'Actualizado' };
            const productoActualizado = { ...mockProducto, nombre: 'Actualizado' };
            service.update.mockResolvedValue(productoActualizado);

            const result = await controller.update(mockId, updateDto);

            expect(service.update).toHaveBeenCalledWith(mockId, updateDto);
            expect(result).toEqual({ data: toJsonApi(PRODUCTO_RESOURCE_TYPE, productoActualizado) });
        });
    });

    describe('remove', () => {
        it('should remove a product and return no content', async () => {
            service.remove.mockResolvedValue(undefined); // remove devuelve void

            // HttpCode(HttpStatus.NO_CONTENT) se maneja a nivel de decorador.
            // No podemos verificar directamente el status code aquí sin supertest,
            // pero sí que el método del servicio fue llamado.
            await controller.remove(mockId);
            expect(service.remove).toHaveBeenCalledWith(mockId);
        });
    });
});