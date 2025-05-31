import { ApiProperty } from '@nestjs/swagger';
import { CompraRealizadaDto } from './compra-realizada.dto';

class CompraAttributesDto implements Omit<CompraRealizadaDto, 'id_compra'> {
    @ApiProperty()
    producto_id: string;
    @ApiProperty()
    nombre_producto: string;
    @ApiProperty()
    cantidad_comprada: number;
    @ApiProperty()
    precio_unitario: number;
    @ApiProperty()
    precio_total: number;
    @ApiProperty()
    fecha_compra: Date;
    @ApiProperty()
    inventario_restante: number;
}

export class CompraResource {
    @ApiProperty({ example: 'compras', description: 'Tipo del recurso' })
    type: string;

    @ApiProperty({ example: 'compra-uuid-789', description: 'UUID de la compra realizada', format: 'uuid' })
    id: string;

    @ApiProperty({ type: CompraAttributesDto, description: 'Atributos de la compra realizada' })
    attributes: CompraAttributesDto;
}

export class CompraRealizadaJsonApiDocument {
    @ApiProperty({ type: CompraResource })
    data: CompraResource;
}