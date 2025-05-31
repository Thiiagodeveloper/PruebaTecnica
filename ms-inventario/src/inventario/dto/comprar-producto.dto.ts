import { IsUUID, IsInt, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ComprarProductoDto {
    @ApiProperty({ example: 'a1b2c3d4-e5f6-7890-1234-567890abcdef', description: 'UUID del producto a comprar', format: 'uuid' })
    @IsUUID()
    producto_id: string;

    @ApiProperty({ example: 3, description: 'Cantidad de unidades a comprar', minimum: 1, type: Number })
    @IsInt()
    @Min(1)
    cantidad: number;
}