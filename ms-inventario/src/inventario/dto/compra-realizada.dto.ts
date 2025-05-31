export class CompraRealizadaDto {
    id_compra: string;
    producto_id: string;
    nombre_producto: string;
    cantidad_comprada: number;
    precio_unitario: number;
    precio_total: number;
    fecha_compra: Date;
    inventario_restante: number;
}