import { Injectable, NotFoundException, InternalServerErrorException, HttpException, HttpStatus } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, QueryRunner } from 'typeorm';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom, catchError } from 'rxjs';
import { Inventario } from './entities/inventario.entity';
import { ActualizarInventarioDto } from './dto/actualizar-inventario.dto';
import { ConsultarInventarioResponseDto } from './dto/consultar-inventario-response.dto';
import { Compra } from './entities/compra.entity';
import { ComprarProductoDto } from './dto/comprar-producto.dto';
import { CompraRealizadaDto } from './dto/compra-realizada.dto';

interface ProductoDataAttributes {
    id?: string;
    nombre: string;
    precio: number;
    descripcion?: string;
}
interface ProductoJsonResponse {
    data: {
        id: string;
        type: string;
        attributes: ProductoDataAttributes;
    }
}

@Injectable()
export class InventarioService {
    private readonly productosMsUrl: string;
    private readonly productosApiKey: string;

    constructor(
        @InjectRepository(Inventario)
        private readonly inventarioRepository: Repository<Inventario>,
        @InjectRepository(Compra)
        private readonly compraRepository: Repository<Compra>,
        private readonly httpService: HttpService,
        private readonly configService: ConfigService,
        private readonly dataSource: DataSource,
    ) {
        const productosMsUrlVal = this.configService.get<string>('PRODUCTOS_MS_URL');
        const productosApiKeyVal = this.configService.get<string>('PRODUCTOS_API_KEY');

        if (!productosMsUrlVal) {
            throw new Error('La variable de entorno PRODUCTOS_MS_URL no está definida.');
        }
        if (!productosApiKeyVal) {
            throw new Error('La variable de entorno PRODUCTOS_API_KEY no está definida.');
        }
        this.productosMsUrl = productosMsUrlVal;
        this.productosApiKey = productosApiKeyVal;
    }

    async consultarInventarioProducto(productoId: string): Promise<ConsultarInventarioResponseDto> {
        let productoInfo: ProductoDataAttributes;
        let productoResourceId: string;

        try {
            const url = `${this.productosMsUrl}/productos/${productoId}`;
            const { data: productoResponse } = await firstValueFrom(
                this.httpService.get<ProductoJsonResponse>(url, {
                    headers: { 'x-api-key': this.productosApiKey },
                    timeout: 5000,
                }).pipe(
                    catchError(error => {
                        if (error.response) {
                            if (error.response.status === HttpStatus.NOT_FOUND) {
                                throw new NotFoundException(`Producto con ID "${productoId}" no encontrado en el servicio de productos.`);
                            }
                            throw new HttpException(
                                `Error al contactar servicio de productos: ${error.response.statusText || error.message}`,
                                error.response.status || HttpStatus.INTERNAL_SERVER_ERROR
                            );
                        }
                        throw new InternalServerErrorException('Error de red o timeout al consultar servicio de productos.');
                    })
                )
            );

            if (!productoResponse || !productoResponse.data || !productoResponse.data.attributes) {
                throw new InternalServerErrorException('Respuesta inesperada del servicio de productos.');
            }
            productoInfo = productoResponse.data.attributes;
            productoResourceId = productoResponse.data.id;

        } catch (error) {
            if (error instanceof HttpException) throw error;
            console.error('Error no manejado al obtener información del producto (fuera del pipe):', error);
            throw new InternalServerErrorException(`Error al obtener información del producto: ${error.message}`);
        }

        const itemInventario = await this.inventarioRepository.findOneBy({ producto_id: productoId });
        const cantidad_disponible = itemInventario ? itemInventario.cantidad : 0;

        return {
            producto_id: productoResourceId,
            nombre_producto: productoInfo.nombre,
            precio_producto: productoInfo.precio,
            cantidad_disponible: cantidad_disponible,
            descripcion_producto: productoInfo.descripcion,
        };
    }

    async actualizarInventario(
        productoId: string,
        actualizarInventarioDto: ActualizarInventarioDto,
    ): Promise<Inventario> {
        let itemInventario = await this.inventarioRepository.findOneBy({ producto_id: productoId });

        if (!itemInventario) {
            itemInventario = this.inventarioRepository.create({
                producto_id: productoId,
                cantidad: actualizarInventarioDto.cantidad,
            });
        } else {
            itemInventario.cantidad = actualizarInventarioDto.cantidad;
        }
        return this.inventarioRepository.save(itemInventario);
    }

    async descontarInventario(productoId: string, cantidadADescontar: number): Promise<Inventario> {
        const itemInventario = await this.inventarioRepository.findOneBy({ producto_id: productoId });

        if (!itemInventario || itemInventario.cantidad < cantidadADescontar) {
            throw new HttpException('Inventario insuficiente.', HttpStatus.CONFLICT);
        }

        itemInventario.cantidad -= cantidadADescontar;
        return this.inventarioRepository.save(itemInventario);
    }

    async incrementarInventario(productoId: string, cantidadAIncrementar: number): Promise<Inventario> {
        const itemInventario = await this.inventarioRepository.findOneBy({ producto_id: productoId });

        if (!itemInventario) {
            const nuevoItem = this.inventarioRepository.create({
                producto_id: productoId,
                cantidad: cantidadAIncrementar
            });
            return this.inventarioRepository.save(nuevoItem);
        }
        itemInventario.cantidad += cantidadAIncrementar;
        return this.inventarioRepository.save(itemInventario);
    }


    async procesarCompra(comprarProductoDto: ComprarProductoDto): Promise<CompraRealizadaDto> {
        const { producto_id, cantidad } = comprarProductoDto;
        const queryRunner: QueryRunner = this.dataSource.createQueryRunner();

        try {
            await queryRunner.connect();
            await queryRunner.startTransaction();

            // --- 1. Obtener información del producto desde MS-Productos ---
            let productoInfo: ProductoDataAttributes;
            let productoResourceId: string;
            try { // Try interno para la llamada HTTP y procesamiento inicial de su respuesta
                const url = `${this.productosMsUrl}/productos/${producto_id}`;
                const { data: productoResponse } = await firstValueFrom(
                    this.httpService.get<ProductoJsonResponse>(url, {
                        headers: { 'x-api-key': this.productosApiKey },
                        timeout: 5000,
                    }).pipe(
                        catchError(error => { // Este catchError es para la llamada HTTP
                            if (error.response) {
                                if (error.response.status === HttpStatus.NOT_FOUND) {
                                    throw new NotFoundException(`Producto con ID "${producto_id}" no encontrado en el catálogo.`);
                                }
                                throw new HttpException(
                                    `Error al obtener detalles del producto: ${error.response.statusText || error.message}`,
                                    error.response.status || HttpStatus.INTERNAL_SERVER_ERROR
                                );
                            }
                            throw new InternalServerErrorException('Error de comunicación al consultar el producto.');
                        })
                    )
                );
                if (!productoResponse || !productoResponse.data || !productoResponse.data.attributes) {
                    throw new InternalServerErrorException('Respuesta inválida del servicio de productos.');
                }
                productoInfo = productoResponse.data.attributes;
                productoResourceId = productoResponse.data.id;
            } catch (httpError) {
                // Este catch es para errores de la lógica de obtención de productoInfo
                if (httpError instanceof HttpException) throw httpError;
                // Si es otro tipo de error, lo envuelve
                throw new InternalServerErrorException(`Fallo al verificar producto: ${httpError.message}`);
            }

            if (productoResourceId !== producto_id) {
                throw new InternalServerErrorException('Inconsistencia en el ID del producto recibido.');
            }

            // --- 2. Verificar y descontar inventario (usando el queryRunner para la transacción) ---
            const itemInventario = await queryRunner.manager.findOne(Inventario, { where: { producto_id } });

            if (!itemInventario || itemInventario.cantidad < cantidad) {
                throw new HttpException('Inventario insuficiente.', HttpStatus.CONFLICT);
            }

            const inventarioRestante = itemInventario.cantidad - cantidad;
            await queryRunner.manager.update(Inventario, { producto_id }, { cantidad: inventarioRestante });

            // --- 3. Registrar la compra (usando el queryRunner) ---
            const precioTotal = productoInfo.precio * cantidad;
            const nuevaCompraEntidad = {
                producto_id: producto_id,
                nombre_producto: productoInfo.nombre,
                cantidad_comprada: cantidad,
                precio_unitario_en_compra: productoInfo.precio,
                precio_total: precioTotal,
                inventario_restante_tras_compra: inventarioRestante,
            };
            const nuevaCompra = this.compraRepository.create(nuevaCompraEntidad);
            const compraGuardada = await queryRunner.manager.save(Compra, nuevaCompra);

            await queryRunner.commitTransaction();

            return {
                id_compra: compraGuardada.id_compra,
                producto_id: producto_id,
                nombre_producto: compraGuardada.nombre_producto,
                cantidad_comprada: cantidad,
                precio_unitario: compraGuardada.precio_unitario_en_compra,
                precio_total: compraGuardada.precio_total,
                fecha_compra: compraGuardada.fecha_compra,
                inventario_restante: inventarioRestante,
            };

        } catch (error) {
            if (queryRunner.isTransactionActive) {
                try {
                    await queryRunner.rollbackTransaction();
                } catch (rollbackError) {
                    console.error('Error durante rollbackTransaction:', rollbackError);
                }
            }

            if (error instanceof HttpException) throw error;
            console.error("Error procesando compra (inesperado):", error);
            throw new InternalServerErrorException(`Ocurrió un error al procesar la compra: ${error.message}`);
        } finally {
            if (!queryRunner.isReleased) {
                await queryRunner.release();
            }
        }
    }
}