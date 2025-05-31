import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Producto } from '../entities/producto.entity';

// DTO para los atributos de un Producto (sin el 'id' de nivel superior)
export class ProductoAttributesDto implements Omit<Producto, 'id'> {
    @ApiProperty({ example: 'Laptop Gamer X', description: 'Nombre del producto' })
    nombre: string;

    @ApiProperty({ example: 1299.99, description: 'Precio del producto', type: Number })
    precio: number;

    @ApiPropertyOptional({ example: 'Potente laptop para gaming y desarrollo', description: 'Descripción opcional' })
    descripcion?: string;
}

// DTO para un recurso Producto individual en formato JSON API
export class ProductoResource {
    @ApiProperty({ example: 'productos', description: 'Tipo del recurso' })
    type: string;

    @ApiProperty({ example: 'a1b2c3d4-e5f6-7890-1234-567890abcdef', description: 'UUID del producto', format: 'uuid' })
    id: string;

    @ApiProperty({ type: ProductoAttributesDto, description: 'Atributos del producto' })
    attributes: ProductoAttributesDto;
}

// DTO para la respuesta JSON API de un solo Producto: { data: ProductoResource }
export class ProductoJsonApiDocument {
    @ApiProperty({ type: ProductoResource })
    data: ProductoResource;
}

// DTO para la respuesta JSON API de una lista de Productos: { data: [ProductoResource, ...] }
export class ProductoListJsonApiDocument {
    @ApiProperty({ type: [ProductoResource] })
    data: ProductoResource[];
}