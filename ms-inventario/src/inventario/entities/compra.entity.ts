import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index } from 'typeorm';

@Entity('historial_compras')
export class Compra {
    @PrimaryGeneratedColumn('uuid')
    id_compra: string;

    @Index()
    @Column('uuid')
    producto_id: string;

    @Column('varchar')
    nombre_producto: string;

    @Column('int')
    cantidad_comprada: number;

    @Column({ type: 'decimal', precision: 10, scale: 2 })
    precio_unitario_en_compra: number;

    @Column({ type: 'decimal', precision: 10, scale: 2 })
    precio_total: number;

    @CreateDateColumn()
    fecha_compra: Date;

    @Column('int')
    inventario_restante_tras_compra: number;
}