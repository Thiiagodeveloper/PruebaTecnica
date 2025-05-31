import { IsString, IsNotEmpty, IsNumber, Min, IsOptional, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'; // <<< IMPORTAR

export class CreateProductoDto {
    @ApiProperty({ example: 'Laptop Gamer X', description: 'Nombre del producto', maxLength: 255 })
    @IsString()
    @IsNotEmpty()
    @MaxLength(255)
    nombre: string;

    @ApiProperty({ example: 1299.99, description: 'Precio del producto', minimum: 0.01, type: Number })
    @IsNumber({ maxDecimalPlaces: 2 })
    @Min(0.01)
    precio: number;

    @ApiPropertyOptional({ example: 'Potente laptop para gaming y desarrollo', description: 'Descripción opcional del producto' })
    @IsOptional()
    @IsString()
    descripcion?: string;
}