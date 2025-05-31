import { ApiProperty } from '@nestjs/swagger';
import { ConsultarInventarioResponseDto } from './consultar-inventario-response.dto';
import { Inventario } from '../entities/inventario.entity';

export class InventarioConsultadoResource {
    @ApiProperty({ example: 'inventarios', description: 'Tipo del recurso' })
    type: string;

    @ApiProperty({ example: 'producto-uuid-123', description: 'UUID del producto consultado', format: 'uuid' })
    id: string;

    @ApiProperty({ type: ConsultarInventarioResponseDto, description: 'Atributos del inventario consultado' })
    attributes: ConsultarInventarioResponseDto;
}

export class InventarioConsultadoJsonApiDocument {
    @ApiProperty({ type: InventarioConsultadoResource })
    data: InventarioConsultadoResource;
}

// DTO para la respuesta de actualizar inventario
export class InventarioActualizadoAttributesDto {
    @ApiProperty({ example: 50, description: 'Cantidad actual en inventario después de la actualización.' })
    cantidad_actual: number;
}
export class InventarioActualizadoResource {
    @ApiProperty({ example: 'inventarios', description: 'Tipo del recurso' })
    type: string;
    @ApiProperty({ example: 'producto-uuid-123', description: 'UUID del producto cuyo inventario se actualizó', format: 'uuid' })
    id: string;
    @ApiProperty({ type: InventarioActualizadoAttributesDto })
    attributes: InventarioActualizadoAttributesDto;
}
export class InventarioActualizadoJsonApiDocument {
    @ApiProperty({ type: InventarioActualizadoResource })
    data: InventarioActualizadoResource;
}