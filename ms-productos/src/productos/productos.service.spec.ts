import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ObjectLiteral, Repository } from 'typeorm';
import { ProductosService } from './productos.service';
import { Producto } from './entities/producto.entity';
import { CreateProductoDto } from './dto/create-producto.dto';
import { UpdateProductoDto } from './dto/update-producto.dto';
import { NotFoundException } from '@nestjs/common';

// Mock del Repository de TypeORM
const mockProductoRepository = () => ({
  create: jest.fn(),
  save: jest.fn(),
  find: jest.fn(),
  findOneBy: jest.fn(),
  preload: jest.fn(), // Añadir mock para preload
  remove: jest.fn(),   // Añadir mock para remove (o delete si usas result.affected)
});

type MockRepository<T extends ObjectLiteral = any> = Partial<Record<keyof Repository<T>, jest.Mock>>;

describe('ProductosService', () => {
  let service: ProductosService;
  let repository: MockRepository<Producto>;

  const mockId = 'some-uuid-123';
  const mockProducto: Producto = {
    id: mockId,
    nombre: 'Test Producto',
    precio: 10.99,
    descripcion: 'Test Descripcion',
  };

  const mockProductoActualizado: Producto = {
    id: mockId,
    nombre: 'Producto Actualizado',
    precio: 12.50,
    descripcion: 'Descripción actualizada',
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProductosService,
        {
          provide: getRepositoryToken(Producto),
          useValue: mockProductoRepository(),
        },
      ],
    }).compile();

    service = module.get<ProductosService>(ProductosService);
    repository = module.get<MockRepository<Producto>>(
      getRepositoryToken(Producto),
    );
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should successfully create a product', async () => {
      const createProductoDto: CreateProductoDto = {
        nombre: 'Nuevo Producto',
        precio: 20.50,
      };
      // El método `create` del repo solo instancia, `save` persiste.
      repository.create?.mockReturnValue(createProductoDto as any); // Simula la creación de la entidad
      repository.save?.mockResolvedValue(mockProducto); // Simula el guardado

      const result = await service.create(createProductoDto);
      expect(repository.create).toHaveBeenCalledWith(createProductoDto);
      expect(repository.save).toHaveBeenCalledWith(createProductoDto as any);
      expect(result).toEqual(mockProducto);
    });
  });

  describe('findAll', () => {
    it('should return an array of products', async () => {
      repository.find?.mockResolvedValue([mockProducto]);
      const result = await service.findAll();
      expect(repository.find).toHaveBeenCalled();
      expect(result).toEqual([mockProducto]);
    });
    it('should return an empty array if no products found', async () => {
      repository.find?.mockResolvedValue([]);
      const result = await service.findAll();
      expect(result).toEqual([]);
    });
  });

  describe('findOne', () => {
    it('should return a single product if found', async () => {
      repository.findOneBy?.mockResolvedValue(mockProducto);
      const result = await service.findOne(mockId);
      expect(repository.findOneBy).toHaveBeenCalledWith({ id: mockId });
      expect(result).toEqual(mockProducto);
    });

    it('should throw NotFoundException if product not found', async () => {
      repository.findOneBy?.mockResolvedValue(null);
      await expect(service.findOne('non-existent-uuid')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('update', () => {
    const updateDto: UpdateProductoDto = { nombre: 'Producto Actualizado', precio: 12.50 };

    it('should successfully update a product', async () => {
      repository.preload?.mockResolvedValue(mockProductoActualizado); // Simula que el producto existe y se carga con los nuevos datos
      repository.save?.mockResolvedValue(mockProductoActualizado); // Simula el guardado del producto actualizado

      const result = await service.update(mockId, updateDto);

      expect(repository.preload).toHaveBeenCalledWith({ id: mockId, ...updateDto });
      expect(repository.save).toHaveBeenCalledWith(mockProductoActualizado);
      expect(result).toEqual(mockProductoActualizado);
    });

    it('should throw NotFoundException if product to update is not found', async () => {
      repository.preload?.mockResolvedValue(null); // Simula que preload no encontró el producto
      await expect(service.update('non-existent-uuid', updateDto)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('remove', () => {
    let findOneSpy: jest.SpyInstance; // Declara el spy aquí para poder restaurarlo

    afterEach(() => {
      if (findOneSpy) {
        findOneSpy.mockRestore(); // Restaura el spy después de cada test en este describe
      }
    });

    it('should successfully remove a product by calling findOne and then repository.remove', async () => {
      // Espiamos service.findOne y mockeamos su comportamiento para esta prueba
      findOneSpy = jest.spyOn(service, 'findOne').mockResolvedValue(mockProducto);
      repository.remove?.mockResolvedValue(undefined as any); // remove no devuelve nada significativo

      await service.remove(mockId);

      expect(findOneSpy).toHaveBeenCalledWith(mockId);
      expect(repository.remove).toHaveBeenCalledWith(mockProducto);
    });

    it('should throw NotFoundException if product to remove is not found (via findOne)', async () => {
      // Espiamos service.findOne y hacemos que falle (lance una excepción)
      const notFoundError = new NotFoundException(`Producto con ID "non-existent-uuid" no encontrado`);
      findOneSpy = jest.spyOn(service, 'findOne').mockRejectedValue(notFoundError);

      await expect(service.remove('non-existent-uuid')).rejects.toThrow(NotFoundException);

      expect(findOneSpy).toHaveBeenCalledWith('non-existent-uuid');
      expect(repository.remove).not.toHaveBeenCalled();
    });
  });
});