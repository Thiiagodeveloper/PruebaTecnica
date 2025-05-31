export class ConsultarInventarioResponseDto {
    producto_id: string;
    nombre_producto: string;
    precio_producto: number;
    cantidad_disponible: number;
    descripcion_producto?: string;
}