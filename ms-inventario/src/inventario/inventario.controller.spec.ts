import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { HttpStatus, ParseUUIDPipe, NotFoundException, HttpException, InternalServerErrorException } from '@nestjs/common';
import { InventarioController } from './inventario.controller';
import { InventarioService } from './inventario.service';
import { ActualizarInventarioDto } from './dto/actualizar-inventario.dto';
import { ConsultarInventarioResponseDto } from './dto/consultar-inventario-response.dto';
import { Inventario } from './entities/inventario.entity';
import { ComprarProductoDto } from './dto/comprar-producto.dto';
import { CompraRealizadaDto } from './dto/compra-realizada.dto';
import { toJsonApi, JsonApiDocument } from '../common/dto/json-api-response.dto';

// Mock del InventarioService
const mockInventarioService = {
  consultarInventarioProducto: jest.fn(),
  actualizarInventario: jest.fn(),
  procesarCompra: jest.fn(),
};

const INVENTARIO_RESOURCE_TYPE = 'inventarios';
const COMPRA_RESOURCE_TYPE = 'compras';

describe('InventarioController', () => {
  let controller: InventarioController;
  let service: typeof mockInventarioService;

  const mockProductoId = 'test-producto-uuid-456';

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [InventarioController],
      providers: [
        {
          provide: InventarioService,
          useValue: mockInventarioService,
        },
      ],
    })
      .compile();

    controller = module.get<InventarioController>(InventarioController);
    service = module.get(InventarioService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('consultarInventario', () => {
    it('should return inventory data for a product in JSON API format', async () => {
      const mockInventarioData: ConsultarInventarioResponseDto = {
        producto_id: mockProductoId,
        nombre_producto: 'Producto Ejemplo',
        precio_producto: 19.99,
        cantidad_disponible: 75,
        descripcion_producto: 'Una descripción de ejemplo.',
      };
      service.consultarInventarioProducto.mockResolvedValue(mockInventarioData);

      const result: JsonApiDocument<ConsultarInventarioResponseDto> = await controller.consultarInventario(mockProductoId);

      expect(service.consultarInventarioProducto).toHaveBeenCalledWith(mockProductoId);
      expect(result).toEqual({ data: toJsonApi(INVENTARIO_RESOURCE_TYPE, mockProductoId, mockInventarioData) });
    });

    it('should propagate NotFoundException from service if product info not found', async () => {
      const errorMessage = `Producto con ID "${mockProductoId}" no encontrado.`;
      service.consultarInventarioProducto.mockRejectedValue(new NotFoundException(errorMessage));

      await expect(controller.consultarInventario(mockProductoId))
        .rejects.toThrow(NotFoundException);
      try {
        await controller.consultarInventario(mockProductoId);
      } catch (error) {
        expect(error.message).toContain(errorMessage);
      }

      expect(service.consultarInventarioProducto).toHaveBeenCalledWith(mockProductoId);
    });
  });

  describe('actualizarInventario', () => {
    it('should update inventory and return new state in JSON API format', async () => {
      const dto: ActualizarInventarioDto = { cantidad: 120 };
      const mockInventarioActualizado: Inventario = {
        producto_id: mockProductoId,
        cantidad: 120,
      };
      const expectedAttributesResponse = {
        cantidad_actual: mockInventarioActualizado.cantidad,
      };

      service.actualizarInventario.mockResolvedValue(mockInventarioActualizado);

      const result: JsonApiDocument<{ cantidad_actual: number }> = await controller.actualizarInventario(mockProductoId, dto);

      expect(service.actualizarInventario).toHaveBeenCalledWith(mockProductoId, dto);
      expect(result).toEqual({
        data: toJsonApi(INVENTARIO_RESOURCE_TYPE, mockInventarioActualizado.producto_id, expectedAttributesResponse),
      });
    });

    it('should propagate errors from service during update', async () => {
      const dto: ActualizarInventarioDto = { cantidad: 120 };
      const errorMessage = "Fallo al actualizar";
      service.actualizarInventario.mockRejectedValue(new InternalServerErrorException(errorMessage));

      await expect(controller.actualizarInventario(mockProductoId, dto))
        .rejects.toThrow(InternalServerErrorException);
      try {
        await controller.actualizarInventario(mockProductoId, dto);
      } catch (error) {
        expect(error.message).toContain(errorMessage);
      }
      expect(service.actualizarInventario).toHaveBeenCalledWith(mockProductoId, dto);
    });
  });

  describe('realizarCompra', () => {
    const comprarDto: ComprarProductoDto = { producto_id: mockProductoId, cantidad: 1 };
    const mockRespuestaCompra: CompraRealizadaDto = {
      id_compra: 'compra-test-uuid',
      producto_id: mockProductoId,
      nombre_producto: 'Producto Comprado',
      cantidad_comprada: 1,
      precio_unitario: 50.00,
      precio_total: 50.00,
      fecha_compra: new Date(),
      inventario_restante: 9,
    };

    it('should process purchase and return purchase details in JSON API format', async () => {
      service.procesarCompra.mockResolvedValue(mockRespuestaCompra);
      const result: JsonApiDocument<CompraRealizadaDto> = await controller.realizarCompra(comprarDto);
      expect(service.procesarCompra).toHaveBeenCalledWith(comprarDto);
      const expectedItemParaJsonApi = { ...mockRespuestaCompra, id: mockRespuestaCompra.id_compra };

      expect(result).toEqual({
        data: toJsonApi(COMPRA_RESOURCE_TYPE, mockRespuestaCompra.id_compra, expectedItemParaJsonApi)
      });
    });


    it('should propagate HttpException if purchase processing fails (e.g. insufficient stock)', async () => {
      const errorMessage = 'Inventario insuficiente.';
      service.procesarCompra.mockRejectedValue(new HttpException(errorMessage, HttpStatus.CONFLICT));

      await expect(controller.realizarCompra(comprarDto))
        .rejects.toThrow(HttpException);
      try {
        await controller.realizarCompra(comprarDto);
      } catch (error) {
        expect(error.message).toContain(errorMessage);
        expect(error.status).toBe(HttpStatus.CONFLICT);
      }
      expect(service.procesarCompra).toHaveBeenCalledWith(comprarDto);
    });
  });
});