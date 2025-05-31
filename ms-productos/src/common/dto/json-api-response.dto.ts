import { Producto } from "src/productos/entities/producto.entity";

export interface JsonApiResource<TAttributes> {
    id: string | number;
    type: string;
    attributes: TAttributes;
    relationships?: any; //
}

export interface JsonApiDocument<TAttributes> {
    data: JsonApiResource<TAttributes> | JsonApiResource<TAttributes>[];
}

/**
 * Crea un objeto de recurso JSON API para un solo ítem.
 * @param type El tipo de recurso (ej. "productos").
 * @param item El objeto completo que DEBE tener una propiedad 'id'. Los demás campos serán los atributos.
 * @returns Un objeto JsonApiResource.
 */
export function toJsonApi<TFull extends { id: string | number }>(
    type: string,
    item: TFull,
): JsonApiResource<Omit<TFull, 'id'>> {
    const { id, ...attributes } = item;
    return {
        type,
        id,
        attributes: attributes as Omit<TFull, 'id'>,
    };
}

/**
 * Crea un array de objetos de recurso JSON API para una colección de ítems.
 * @param type El tipo de recurso (ej. "productos").
 * @param items Un array de objetos, donde cada objeto DEBE tener una propiedad 'id'.
 * @returns Un array de objetos JsonApiResource.
 */
export function toJsonApiCollection<TFull extends { id: string | number }>(
    type: string,
    items: TFull[],
): JsonApiResource<Omit<TFull, 'id'>>[] {
    return items.map(item => {
        const { id, ...attributes } = item;
        return {
            type,
            id,
            attributes: attributes as Omit<TFull, 'id'>,
        };
    });
}