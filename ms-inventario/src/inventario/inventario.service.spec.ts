import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { Repository, DataSource, QueryRunner } from 'typeorm';
import { NotFoundException, InternalServerErrorException, HttpException, HttpStatus } from '@nestjs/common';
import { of, throwError } from 'rxjs';

import { InventarioService } from './inventario.service';
import { Inventario } from './entities/inventario.entity';
import { Compra } from './entities/compra.entity';
import { ActualizarInventarioDto } from './dto/actualizar-inventario.dto';
import { ComprarProductoDto } from './dto/comprar-producto.dto';

// Mocks 
const mockInventarioRepository = { findOneBy: jest.fn(), save: jest.fn(), create: jest.fn() };
const mockCompraRepository = { create: jest.fn() };
const mockHttpService = { get: jest.fn() };
const mockConfigServiceGetFn = jest.fn<string | undefined, [string]>();
const mockConfigService = { get: mockConfigServiceGetFn };
const mockQueryRunnerManager = { findOne: jest.fn(), update: jest.fn(), save: jest.fn() };
const mockQueryRunner = {
  connect: jest.fn().mockResolvedValue(undefined),
  startTransaction: jest.fn().mockResolvedValue(undefined),
  commitTransaction: jest.fn().mockResolvedValue(undefined),
  rollbackTransaction: jest.fn().mockResolvedValue(undefined),
  release: jest.fn().mockResolvedValue(undefined),
  manager: mockQueryRunnerManager,
  isTransactionActive: true,
  isReleased: false,
};
const mockDataSource = { createQueryRunner: jest.fn(() => mockQueryRunner) };

const mockProductoId = 'producto-uuid-123';
const mockGeneralProductoInfoFromMS = {
  data: {
    id: mockProductoId, type: 'productos',
    attributes: { nombre: 'Producto Test General', precio: 10.99, descripcion: 'Descripción Test General' }
  }
};
const INITIAL_MS_URL = 'http://service-init-url/api/v1';
const INITIAL_API_KEY = 'service-init-key';

describe('InventarioService', () => {
  let service: InventarioService;
  let repository: typeof mockInventarioRepository;
  let compraRepositoryMock: typeof mockCompraRepository;
  let httpServiceMockInstance: typeof mockHttpService;
  let dataSourceMockFromDI: typeof mockDataSource;
  let consoleErrorSpy: jest.SpyInstance;

  beforeEach(async () => {
    mockConfigService.get.mockImplementation((key: string): string | undefined => {
      if (key === 'PRODUCTOS_MS_URL') return INITIAL_MS_URL;
      if (key === 'PRODUCTOS_API_KEY') return INITIAL_API_KEY;
      return undefined;
    });

    const module: TestingModule = await Test.createTestingModule({
      providers: [InventarioService,
        { provide: getRepositoryToken(Inventario), useValue: mockInventarioRepository },
        { provide: getRepositoryToken(Compra), useValue: mockCompraRepository },
        { provide: HttpService, useValue: mockHttpService },
        { provide: ConfigService, useValue: mockConfigService },
        { provide: DataSource, useValue: mockDataSource },
      ],
    }).compile();

    service = module.get<InventarioService>(InventarioService);
    repository = module.get(getRepositoryToken(Inventario));
    compraRepositoryMock = module.get(getRepositoryToken(Compra));
    httpServiceMockInstance = module.get(HttpService);
    dataSourceMockFromDI = module.get(DataSource);

    jest.clearAllMocks();
    mockConfigService.get.mockImplementation((key: string): string | undefined => {
      if (key === 'PRODUCTOS_MS_URL') return INITIAL_MS_URL;
      if (key === 'PRODUCTOS_API_KEY') return INITIAL_API_KEY;
      return undefined;
    });
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => { });
    // Resetear mocks de QueryRunner para cada test (importante para isTransactionActive, isReleased)
    (mockQueryRunner.isTransactionActive as unknown) = true; // Resetea a valor por defecto
    (mockQueryRunner.isReleased as unknown) = false;       // Resetea a valor por defecto
  });

  afterEach(() => {
    if (consoleErrorSpy) consoleErrorSpy.mockRestore();
  });

  // ... (Pruebas de Constructor, should be defined, actualizarInventario, descontar, incrementar sin cambios)
  describe('Constructor Logic', () => {
    it('should throw error if PRODUCTOS_MS_URL is not defined', () => {
      mockConfigService.get.mockImplementation((key: string): string | undefined => {
        if (key === 'PRODUCTOS_MS_URL') return undefined;
        if (key === 'PRODUCTOS_API_KEY') return 'fake-api-key-for-this-test';
        return undefined;
      });
      expect(() => new InventarioService(repository as any, compraRepositoryMock as any, httpServiceMockInstance as any, mockConfigService as any, mockDataSource as any))
        .toThrow('La variable de entorno PRODUCTOS_MS_URL no está definida.');
    });
    it('should throw error if PRODUCTOS_API_KEY is not defined', () => {
      mockConfigService.get.mockImplementation((key: string): string | undefined => {
        if (key === 'PRODUCTOS_MS_URL') return 'http://fake-url-for-this-test';
        if (key === 'PRODUCTOS_API_KEY') return undefined;
        return undefined;
      });
      expect(() => new InventarioService(repository as any, compraRepositoryMock as any, httpServiceMockInstance as any, mockConfigService as any, mockDataSource as any))
        .toThrow('La variable de entorno PRODUCTOS_API_KEY no está definida.');
    });
    it('should initialize properties if config is valid', () => {
      mockConfigService.get.mockImplementation((key: string): string | undefined => {
        if (key === 'PRODUCTOS_MS_URL') return 'http://valid-url-constructor';
        if (key === 'PRODUCTOS_API_KEY') return 'valid-key-constructor';
        return undefined;
      });
      const newService = new InventarioService(repository as any, compraRepositoryMock as any, httpServiceMockInstance as any, mockConfigService as any, mockDataSource as any);
      expect(newService).toBeDefined();
    });
  });
  it('should be defined (main service instance)', () => { expect(service).toBeDefined(); });


  describe('consultarInventarioProducto', () => {
    it('should return product info and inventory quantity', async () => {
      const mockProductResponse = {
        data: {
          id: mockProductoId, type: 'productos',
          attributes: { nombre: 'Producto Test Específico', precio: 20.50, descripcion: 'Desc Específica' }
        }
      };
      httpServiceMockInstance.get.mockReturnValue(of({ data: mockProductResponse }));
      const mockInventarioItem = { producto_id: mockProductoId, cantidad: 50 };
      repository.findOneBy.mockResolvedValue(mockInventarioItem);
      const result = await service.consultarInventarioProducto(mockProductoId);
      expect(httpServiceMockInstance.get).toHaveBeenCalledWith(
        `${INITIAL_MS_URL}/productos/${mockProductoId}`,
        { headers: { 'x-api-key': INITIAL_API_KEY }, timeout: 5000 },
      );
      expect(repository.findOneBy).toHaveBeenCalledWith({ producto_id: mockProductoId });
      expect(result.producto_id).toBe(mockProductoId);
    });

    it('should throw InternalServerErrorException (and log) for truly unexpected non-HttpException errors during product fetch', async () => {
      const genericError = new Error("Truly unexpected error");

      const badProductoResponse = {
        data: { id: mockProductoId, type: 'productos', attributes: null as any } // attributes es null
      };
      httpServiceMockInstance.get.mockReturnValue(of({ data: badProductoResponse }));

      await expect(service.consultarInventarioProducto(mockProductoId))
        .rejects.toThrow(InternalServerErrorException); // La excepción será "Respuesta inesperada..." o "Cannot read properties of null"


      expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining('Error no manejado'), expect.any(Error));
    });
    // ... (resto de los tests de consultarInventarioProducto como estaban: not found, malformed, etc.)
    it('should return quantity 0 if product not in local inventory', async () => {
      httpServiceMockInstance.get.mockReturnValue(of({ data: mockGeneralProductoInfoFromMS }));
      repository.findOneBy.mockResolvedValue(null);
      const result = await service.consultarInventarioProducto(mockProductoId);
      expect(result.cantidad_disponible).toBe(0);
    });
    it('should throw NotFoundException if product not found in Productos MS', async () => {
      const axiosErrorNotFound = { isAxiosError: true, response: { status: HttpStatus.NOT_FOUND, statusText: 'Not Found', data: {} } };
      httpServiceMockInstance.get.mockReturnValue(throwError(() => axiosErrorNotFound));
      await expect(service.consultarInventarioProducto(mockProductoId))
        .rejects.toThrow(new NotFoundException(`Producto con ID "${mockProductoId}" no encontrado en el servicio de productos.`));
    });
    it('should throw HttpException for other errors from Productos MS with response', async () => {
      const axiosErrorServer = { isAxiosError: true, response: { status: HttpStatus.SERVICE_UNAVAILABLE, statusText: 'Service Unavailable', data: {} } };
      httpServiceMockInstance.get.mockReturnValue(throwError(() => axiosErrorServer));
      await expect(service.consultarInventarioProducto(mockProductoId))
        .rejects.toThrow(new HttpException('Error al contactar servicio de productos: Service Unavailable', HttpStatus.SERVICE_UNAVAILABLE));
    });
    it('should throw InternalServerErrorException for network/timeout errors from Productos MS (no error.response)', async () => {
      const networkError = new Error("ECONNREFUSED");
      httpServiceMockInstance.get.mockReturnValue(throwError(() => networkError));
      await expect(service.consultarInventarioProducto(mockProductoId))
        .rejects.toThrow(new InternalServerErrorException('Error de red o timeout al consultar servicio de productos.'));
    });
    it('should throw InternalServerErrorException if productoResponse is malformed (no data.attributes)', async () => {
      httpServiceMockInstance.get.mockReturnValue(of({ data: { data: { id: mockProductoId, type: 'productos' } } }));
      await expect(service.consultarInventarioProducto(mockProductoId))
        .rejects.toThrow('Respuesta inesperada del servicio de productos.');
    });
    it('should throw InternalServerErrorException if productoResponse is malformed (no data object)', async () => {
      httpServiceMockInstance.get.mockReturnValue(of({ data: {} }));
      await expect(service.consultarInventarioProducto(mockProductoId))
        .rejects.toThrow('Respuesta inesperada del servicio de productos.');
    });
  });

  describe('actualizarInventario', () => {
    const dto: ActualizarInventarioDto = { cantidad: 100 };
    it('should update existing inventory item', async () => {
      const existingItem = { producto_id: mockProductoId, cantidad: 50 };
      repository.findOneBy.mockResolvedValue(existingItem);
      const updatedItem = { ...existingItem, cantidad: dto.cantidad };
      repository.save.mockResolvedValue(updatedItem);
      const result = await service.actualizarInventario(mockProductoId, dto);
      expect(repository.findOneBy).toHaveBeenCalledWith({ producto_id: mockProductoId });
      expect(repository.save).toHaveBeenCalledWith(expect.objectContaining({ producto_id: mockProductoId, cantidad: dto.cantidad }));
      expect(result).toEqual(updatedItem);
    });
    it('should create new inventory item if not exists', async () => {
      repository.findOneBy.mockResolvedValue(null);
      const newItemToCreate = { producto_id: mockProductoId, cantidad: dto.cantidad };
      repository.create.mockReturnValue(newItemToCreate);
      repository.save.mockResolvedValue(newItemToCreate);
      const result = await service.actualizarInventario(mockProductoId, dto);
      expect(repository.create).toHaveBeenCalledWith({ producto_id: mockProductoId, cantidad: dto.cantidad });
      expect(repository.save).toHaveBeenCalledWith(newItemToCreate);
      expect(result).toEqual(newItemToCreate);
    });
  });
  describe('descontarInventario', () => {
    it('should decrease quantity if stock is sufficient', async () => {
      const currentItem = { producto_id: mockProductoId, cantidad: 10 };
      repository.findOneBy.mockResolvedValue(currentItem);
      const expectedItemAfter = { ...currentItem, cantidad: 5 };
      repository.save.mockResolvedValue(expectedItemAfter);
      const result = await service.descontarInventario(mockProductoId, 5);
      expect(result).toEqual(expectedItemAfter);
      expect(repository.save).toHaveBeenCalledWith(expect.objectContaining({ cantidad: 5 }));
    });
    it('should throw error if stock is insufficient', async () => {
      const currentItem = { producto_id: mockProductoId, cantidad: 3 };
      repository.findOneBy.mockResolvedValue(currentItem);
      await expect(service.descontarInventario(mockProductoId, 5))
        .rejects.toThrow(new HttpException('Inventario insuficiente.', HttpStatus.CONFLICT));
      expect(repository.save).not.toHaveBeenCalled();
    });
    it('should throw error if item not in inventory when trying to discount', async () => {
      repository.findOneBy.mockResolvedValue(null);
      await expect(service.descontarInventario(mockProductoId, 5))
        .rejects.toThrow(new HttpException('Inventario insuficiente.', HttpStatus.CONFLICT));
      expect(repository.save).not.toHaveBeenCalled();
    });
  });
  describe('incrementarInventario', () => {
    it('should increase quantity for existing item', async () => {
      const currentItem = { producto_id: mockProductoId, cantidad: 10 };
      repository.findOneBy.mockResolvedValue(currentItem);
      const expectedItemAfter = { ...currentItem, cantidad: 15 };
      repository.save.mockResolvedValue(expectedItemAfter);
      const result = await service.incrementarInventario(mockProductoId, 5);
      expect(result).toEqual(expectedItemAfter);
      expect(repository.save).toHaveBeenCalledWith(expect.objectContaining({ cantidad: 15 }));
    });
    it('should create and set quantity for new item if not in inventory', async () => {
      repository.findOneBy.mockResolvedValue(null);
      const newItem = { producto_id: mockProductoId, cantidad: 5 };
      repository.create.mockReturnValue(newItem);
      repository.save.mockResolvedValue(newItem);
      const result = await service.incrementarInventario(mockProductoId, 5);
      expect(result).toEqual(newItem);
      expect(repository.create).toHaveBeenCalledWith({ producto_id: mockProductoId, cantidad: 5 });
      expect(repository.save).toHaveBeenCalledWith(newItem);
    });
  });

  describe('procesarCompra', () => {
    const comprarDto: ComprarProductoDto = { producto_id: mockProductoId, cantidad: 2 };
    const mockProductoDetallesResponse = {
      data: {
        id: mockProductoId, type: 'productos',
        attributes: { nombre: 'Producto de Compra', precio: 25.00, descripcion: 'Desc Compra' }
      }
    };
    const mockInventarioPrevio = { producto_id: mockProductoId, cantidad: 10 };
    const mockCompraGuardada = {
      id_compra: 'compra-uuid-789', producto_id: mockProductoId,
      nombre_producto: mockProductoDetallesResponse.data.attributes.nombre,
      cantidad_comprada: comprarDto.cantidad,
      precio_unitario_en_compra: mockProductoDetallesResponse.data.attributes.precio,
      precio_total: mockProductoDetallesResponse.data.attributes.precio * comprarDto.cantidad,
      fecha_compra: new Date(),
      inventario_restante_tras_compra: mockInventarioPrevio.cantidad - comprarDto.cantidad,
    } as Compra;

    beforeEach(() => {
      Object.values(mockQueryRunnerManager).forEach(mockFn => mockFn.mockReset());
      (Object.values(mockQueryRunner) as jest.Mock[]).filter(fn => typeof fn === 'function').forEach(mockFn => mockFn.mockReset());
      (mockQueryRunner.isTransactionActive as unknown) = true; // Resetear estado mockeado
      (mockQueryRunner.isReleased as unknown) = false;      // Resetear estado mockeado
      dataSourceMockFromDI.createQueryRunner.mockReturnValue(mockQueryRunner);

      httpServiceMockInstance.get.mockReturnValue(of({ data: mockProductoDetallesResponse }));
      mockQueryRunner.manager.findOne.mockResolvedValue(mockInventarioPrevio);
      compraRepositoryMock.create.mockReturnValue(mockCompraGuardada);
      mockQueryRunner.manager.save.mockResolvedValue(mockCompraGuardada);
      mockQueryRunner.manager.update.mockResolvedValue({ affected: 1 });
    });

    it('should successfully process a purchase', async () => {
      // ... (test de éxito como estaba, usando INITIAL_MS_URL e INITIAL_API_KEY)
      const result = await service.procesarCompra(comprarDto);
      expect(dataSourceMockFromDI.createQueryRunner).toHaveBeenCalled();
      expect(mockQueryRunner.connect).toHaveBeenCalled();
      expect(mockQueryRunner.startTransaction).toHaveBeenCalled();
      expect(httpServiceMockInstance.get).toHaveBeenCalledWith(
        `${INITIAL_MS_URL}/productos/${comprarDto.producto_id}`,
        { headers: { 'x-api-key': INITIAL_API_KEY }, timeout: 5000 }
      );
      expect(mockQueryRunner.manager.findOne).toHaveBeenCalledWith(Inventario, { where: { producto_id: comprarDto.producto_id } });
      expect(mockQueryRunner.manager.update).toHaveBeenCalledWith(
        Inventario, { producto_id: comprarDto.producto_id },
        { cantidad: mockInventarioPrevio.cantidad - comprarDto.cantidad }
      );
      expect(compraRepositoryMock.create).toHaveBeenCalled();
      expect(mockQueryRunner.manager.save).toHaveBeenCalledWith(Compra, mockCompraGuardada);
      expect(mockQueryRunner.commitTransaction).toHaveBeenCalled();
      expect(mockQueryRunner.release).toHaveBeenCalled();
      expect(mockQueryRunner.rollbackTransaction).not.toHaveBeenCalled();
      expect(result.id_compra).toBe(mockCompraGuardada.id_compra);
    });

    // ... (tests de rollback y error para procesarCompra)
    it('should throw NotFoundException if product not found in catalog and rollback', async () => {
      const axiosErrorNotFound = { isAxiosError: true, response: { status: HttpStatus.NOT_FOUND, statusText: 'Not Found', data: {} } };
      httpServiceMockInstance.get.mockReturnValue(throwError(() => axiosErrorNotFound));
      await expect(service.procesarCompra(comprarDto)).rejects.toThrow(NotFoundException);
      expect(mockQueryRunner.rollbackTransaction).toHaveBeenCalled();
      expect(mockQueryRunner.release).toHaveBeenCalled();
    });

    it('should throw HttpException if inventory is insufficient and rollback', async () => {
      mockQueryRunner.manager.findOne.mockResolvedValue({ producto_id: mockProductoId, cantidad: 1 });
      await expect(service.procesarCompra(comprarDto)).rejects.toThrow(new HttpException('Inventario insuficiente.', HttpStatus.CONFLICT));
      expect(mockQueryRunner.rollbackTransaction).toHaveBeenCalled();
      expect(mockQueryRunner.release).toHaveBeenCalled();
    });

    it('should rollback transaction if saving Compra fails', async () => {
      mockQueryRunner.manager.save.mockRejectedValue(new Error("DB save Compra error"));
      await expect(service.procesarCompra(comprarDto)).rejects.toThrow(InternalServerErrorException); // Se convierte a ISE por el catch externo
      expect(mockQueryRunner.rollbackTransaction).toHaveBeenCalled();
      expect(mockQueryRunner.release).toHaveBeenCalled();
      expect(consoleErrorSpy).toHaveBeenCalledWith("Error procesando compra (inesperado):", expect.any(Error));
    });

    it('should rollback transaction if updating Inventario fails', async () => {
      mockQueryRunner.manager.update.mockRejectedValue(new Error("DB update Inventario error"));
      await expect(service.procesarCompra(comprarDto)).rejects.toThrow(InternalServerErrorException);
      expect(mockQueryRunner.rollbackTransaction).toHaveBeenCalled();
      expect(mockQueryRunner.release).toHaveBeenCalled();
      expect(consoleErrorSpy).toHaveBeenCalledWith("Error procesando compra (inesperado):", expect.any(Error));
    });

    it('should rollback and throw if productResourceId mismatch in procesarCompra', async () => {
      const mismatchedIdResponse = { data: { id: 'another-uuid', type: 'productos', attributes: { nombre: 'Mismatch', precio: 10 } } };
      httpServiceMockInstance.get.mockReturnValue(of({ data: mismatchedIdResponse }));
      await expect(service.procesarCompra(comprarDto)).rejects.toThrow('Inconsistencia en el ID del producto recibido.');
      expect(mockQueryRunner.rollbackTransaction).toHaveBeenCalled();
      expect(mockQueryRunner.release).toHaveBeenCalled();
    });

    it('should rollback, log, and throw for generic errors in procesarCompra (e.g. compraRepository.create fails)', async () => {
      const genericError = new Error("Generic create error");
      compraRepositoryMock.create.mockImplementation(() => { throw genericError; });
      await expect(service.procesarCompra(comprarDto))
        .rejects.toThrow(new InternalServerErrorException(`Ocurrió un error al procesar la compra: ${genericError.message}`));
      expect(mockQueryRunner.rollbackTransaction).toHaveBeenCalled();
      expect(mockQueryRunner.release).toHaveBeenCalled();
      expect(consoleErrorSpy).toHaveBeenCalledWith("Error procesando compra (inesperado):", genericError);
    });

    it('should release queryRunner even if queryRunner.startTransaction fails', async () => {
      const startTransactionError = new Error("Failed to start transaction");
      mockQueryRunner.startTransaction.mockRejectedValue(startTransactionError);
      (mockQueryRunner.isTransactionActive as unknown) = false; // Simula que la transacción no se activó

      await expect(service.procesarCompra(comprarDto)).rejects.toThrow(InternalServerErrorException); // El catch externo lo convierte
      expect(mockQueryRunner.rollbackTransaction).not.toHaveBeenCalled(); // No debería llamarse si startTransaction falló
      expect(mockQueryRunner.release).toHaveBeenCalled();
      expect(consoleErrorSpy).toHaveBeenCalledWith("Error procesando compra (inesperado):", startTransactionError);
    });

    it('should release queryRunner even if queryRunner.connect fails', async () => {
      const connectError = new Error("Failed to connect");
      mockQueryRunner.connect.mockRejectedValue(connectError);
      (mockQueryRunner.isTransactionActive as unknown) = false;

      await expect(service.procesarCompra(comprarDto)).rejects.toThrow(InternalServerErrorException);
      expect(mockQueryRunner.startTransaction).not.toHaveBeenCalled();
      expect(mockQueryRunner.rollbackTransaction).not.toHaveBeenCalled();
      expect(mockQueryRunner.release).toHaveBeenCalled();
      expect(consoleErrorSpy).toHaveBeenCalledWith("Error procesando compra (inesperado):", connectError);
    });

    it('should correctly handle rollback error if transaction was active', async () => {
      const mainError = new Error("Main business logic error");
      const rollbackError = new Error("Rollback failed");
      mockQueryRunner.manager.update.mockRejectedValue(mainError); // Falla la lógica de negocio
      mockQueryRunner.rollbackTransaction.mockRejectedValue(rollbackError); // Falla el rollback

      await expect(service.procesarCompra(comprarDto)).rejects.toThrow(InternalServerErrorException);
      expect(mockQueryRunner.rollbackTransaction).toHaveBeenCalled();
      expect(consoleErrorSpy).toHaveBeenCalledWith('Error durante rollbackTransaction:', rollbackError);
      expect(consoleErrorSpy).toHaveBeenCalledWith("Error procesando compra (inesperado):", mainError);
      expect(mockQueryRunner.release).toHaveBeenCalled();
    });
  });
});