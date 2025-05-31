export interface JsonApiResource<TAttributes> {
    id: string | number;
    type: string;
    attributes: TAttributes;
    relationships?: any;
}

export interface JsonApiDocument<TAttributes> {
    data: JsonApiResource<TAttributes> | JsonApiResource<TAttributes>[];
}

export function toJsonApi<TAttributes>(
    type: string,
    id: string | number,
    attributes: TAttributes,
): JsonApiResource<TAttributes> {
    return {
        type,
        id,
        attributes,
    };
}

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