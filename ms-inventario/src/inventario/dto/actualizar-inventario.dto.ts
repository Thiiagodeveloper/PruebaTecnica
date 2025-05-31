import { IsInt, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ActualizarInventarioDto {
    @ApiProperty({ example: 50, description: 'Nueva cantidad total en stock para el producto', minimum: 0, type: Number })
    @IsInt()
    @Min(0)
    cantidad: number;
}