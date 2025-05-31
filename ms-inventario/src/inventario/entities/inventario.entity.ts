import { Entity, Column, PrimaryColumn } from 'typeorm';

@Entity('inventarios')
export class Inventario {
    @PrimaryColumn('uuid')
    producto_id: string;

    @Column({ type: 'int' })
    cantidad: number;


}