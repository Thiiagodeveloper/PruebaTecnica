import { Controller, Get, Post, Body, Param, ParseUUIDPipe, UseGuards, HttpStatus, HttpCode, Patch, Delete, Version } from '@nestjs/common';
import { ProductosService } from './productos.service';
import { CreateProductoDto } from './dto/create-producto.dto';
import { UpdateProductoDto } from './dto/update-producto.dto';
import { toJsonApi, toJsonApiCollection, JsonApiDocument } from '../common/dto/json-api-response.dto';
import { ApiKeyGuard } from '../common/guards/api-key.guard';
import { Producto } from './entities/producto.entity';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiBody, ApiSecurity } from '@nestjs/swagger';
import { ProductoJsonApiDocument, ProductoListJsonApiDocument } from './dto/producto-json-api-resource.dto';

const PRODUCTO_RESOURCE_TYPE = 'productos';

@ApiTags('productos')
@ApiSecurity('ApiKeyAuth')
@Controller({ path: 'productos', version: '1' })
export class ProductosController {
    constructor(private readonly productosService: ProductosService) { }

    @Post()
    @HttpCode(HttpStatus.CREATED)
    @ApiOperation({ summary: 'Crear un nuevo producto' })
    @ApiBody({ type: CreateProductoDto })
    @ApiResponse({ status: HttpStatus.CREATED, description: 'Producto creado exitosamente.', type: ProductoJsonApiDocument })
    @ApiResponse({ status: HttpStatus.BAD_REQUEST, description: 'Datos de entrada inválidos.' })
    @ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: 'API Key no válida o no proporcionada.' })
    async create(
        @Body() createProductoDto: CreateProductoDto,
    ): Promise<JsonApiDocument<Omit<Producto, 'id'>>> {
        const producto = await this.productosService.create(createProductoDto);

        return { data: toJsonApi(PRODUCTO_RESOURCE_TYPE, producto) };
    }

    @Get()
    @ApiOperation({ summary: 'Listar todos los productos' })
    @ApiResponse({ status: HttpStatus.OK, description: 'Lista de productos obtenida.', type: ProductoListJsonApiDocument })
    @ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: 'API Key no válida o no proporcionada.' })
    async findAll(): Promise<JsonApiDocument<Omit<Producto, 'id'>>> {
        const productos = await this.productosService.findAll();
        return { data: toJsonApiCollection(PRODUCTO_RESOURCE_TYPE, productos) };
    }

    @Get(':id')
    @ApiOperation({ summary: 'Obtener un producto por su ID' })
    @ApiParam({ name: 'id', description: 'UUID del producto', type: String, format: 'uuid' })
    @ApiResponse({ status: HttpStatus.OK, description: 'Producto obtenido.', type: ProductoJsonApiDocument })
    @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Producto no encontrado.' })
    @ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: 'API Key no válida o no proporcionada.' })
    async findOne(
        @Param('id', ParseUUIDPipe) id: string,
    ): Promise<JsonApiDocument<Omit<Producto, 'id'>>> {
        const producto = await this.productosService.findOne(id);
        return { data: toJsonApi(PRODUCTO_RESOURCE_TYPE, producto) };
    }

    @Patch(':id')
    @ApiOperation({ summary: 'Actualizar parcialmente un producto' })
    @ApiParam({ name: 'id', description: 'UUID del producto a actualizar', type: String, format: 'uuid' })
    @ApiBody({ type: UpdateProductoDto })
    @ApiResponse({ status: HttpStatus.OK, description: 'Producto actualizado.', type: ProductoJsonApiDocument })
    @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Producto no encontrado.' })
    @ApiResponse({ status: HttpStatus.BAD_REQUEST, description: 'Datos de entrada inválidos.' })
    @ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: 'API Key no válida o no proporcionada.' })
    async update(
        @Param('id', ParseUUIDPipe) id: string,
        @Body() updateProductoDto: UpdateProductoDto,
    ): Promise<JsonApiDocument<Omit<Producto, 'id'>>> {
        const productoActualizado = await this.productosService.update(id, updateProductoDto);
        return { data: toJsonApi(PRODUCTO_RESOURCE_TYPE, productoActualizado) };
    }

    @Delete(':id')
    @HttpCode(HttpStatus.NO_CONTENT)
    @ApiOperation({ summary: 'Eliminar un producto' })
    @ApiParam({ name: 'id', description: 'UUID del producto a eliminar', type: String, format: 'uuid' })
    @ApiResponse({ status: HttpStatus.NO_CONTENT, description: 'Producto eliminado.' })
    @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Producto no encontrado.' })
    @ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: 'API Key no válida o no proporcionada.' })
    async remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
        await this.productosService.remove(id);
    }
}