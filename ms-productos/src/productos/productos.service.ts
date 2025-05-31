import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Producto } from './entities/producto.entity';
import { CreateProductoDto } from './dto/create-producto.dto';
import { UpdateProductoDto } from './dto/update-producto.dto';
@Injectable()
export class ProductosService {
    constructor(
        @InjectRepository(Producto)
        private readonly productoRepository: Repository<Producto>,
    ) { }

    async create(createProductoDto: CreateProductoDto): Promise<Producto> {
        const nuevoProducto = this.productoRepository.create(createProductoDto);
        return this.productoRepository.save(nuevoProducto);
    }

    async findAll(): Promise<Producto[]> {
        return this.productoRepository.find();
    }

    async findOne(id: string): Promise<Producto> {
        const producto = await this.productoRepository.findOneBy({ id });
        if (!producto) {
            throw new NotFoundException(`Producto con ID "${id}" no encontrado`);
        }
        return producto;
    }


    async update(id: string, updateProductoDto: UpdateProductoDto): Promise<Producto> {
        const producto = await this.productoRepository.preload({
            id: id,
            ...updateProductoDto,
        });

        if (!producto) {
            throw new NotFoundException(`Producto con ID "${id}" no encontrado para actualizar.`);
        }

        return this.productoRepository.save(producto);
    }

    async remove(id: string): Promise<void> {
        const producto = await this.findOne(id);
        await this.productoRepository.remove(producto);
    }
}