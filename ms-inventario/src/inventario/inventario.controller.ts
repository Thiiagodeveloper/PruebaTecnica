import { Controller, Get, Param, ParseUUIDPipe, Put, Body, HttpCode, HttpStatus, UseGuards, Post, Version } from '@nestjs/common';
import { InventarioService } from './inventario.service';
import { ActualizarInventarioDto } from './dto/actualizar-inventario.dto';
import { toJsonApi, JsonApiDocument } from '../common/dto/json-api-response.dto';
import { ComprarProductoDto } from './dto/comprar-producto.dto';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiBody } from '@nestjs/swagger';
import { InventarioConsultadoJsonApiDocument, InventarioActualizadoJsonApiDocument } from './dto/inventario-json-api-resource';
import { CompraRealizadaDto } from './dto/compra-realizada.dto';
import { ConsultarInventarioResponseDto } from './dto/consultar-inventario-response.dto';
import { CompraRealizadaJsonApiDocument } from './dto/compra-json.api-resource.dto';


const INVENTARIO_RESOURCE_TYPE = 'inventarios';
const COMPRA_RESOURCE_TYPE = 'compras';

@Controller({ path: 'inventario', version: '1' }) //
export class InventarioController {
    constructor(private readonly inventarioService: InventarioService) { }

    @ApiTags('inventario')
    @Get('producto/:productoId')
    @ApiOperation({ summary: 'Consultar inventario de un producto y sus detalles' })
    @ApiParam({ name: 'productoId', description: 'UUID del producto a consultar', type: String, format: 'uuid' })
    @ApiResponse({ status: HttpStatus.OK, description: 'Inventario y detalles del producto obtenidos.', type: InventarioConsultadoJsonApiDocument })
    @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Producto no encontrado en el catálogo o inventario.' })
    async consultarInventario(
        @Param('productoId', ParseUUIDPipe) productoId: string,
    ): Promise<JsonApiDocument<ConsultarInventarioResponseDto>> {
        const inventarioData = await this.inventarioService.consultarInventarioProducto(productoId);
        return { data: toJsonApi(INVENTARIO_RESOURCE_TYPE, productoId, inventarioData) };
    }

    @ApiTags('inventario')
    @Put('producto/:productoId')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Establecer/Actualizar la cantidad de stock para un producto' })
    @ApiParam({ name: 'productoId', description: 'UUID del producto cuyo stock se actualizará', type: String, format: 'uuid' })
    @ApiBody({ type: ActualizarInventarioDto })
    @ApiResponse({ status: HttpStatus.OK, description: 'Stock actualizado.', type: InventarioActualizadoJsonApiDocument })
    @ApiResponse({ status: HttpStatus.BAD_REQUEST, description: 'Datos de entrada inválidos.' })
    async actualizarInventario(
        @Param('productoId', ParseUUIDPipe) productoId: string,
        @Body() actualizarInventarioDto: ActualizarInventarioDto,
    ): Promise<JsonApiDocument<{ cantidad_actual: number }>> {
        const inventarioActualizado = await this.inventarioService.actualizarInventario(
            productoId,
            actualizarInventarioDto,
        );
        const attributes = { cantidad_actual: inventarioActualizado.cantidad };
        return { data: toJsonApi(INVENTARIO_RESOURCE_TYPE, inventarioActualizado.producto_id, attributes) };
    }

    @ApiTags('compras')
    @Post('compras')
    @HttpCode(HttpStatus.CREATED)
    @ApiOperation({ summary: 'Realizar la compra de un producto' })
    @ApiBody({ type: ComprarProductoDto })
    @ApiResponse({ status: HttpStatus.CREATED, description: 'Compra realizada exitosamente.', type: CompraRealizadaJsonApiDocument })
    @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Producto no encontrado en el catálogo.' })
    @ApiResponse({ status: HttpStatus.CONFLICT, description: 'Inventario insuficiente.' })
    @ApiResponse({ status: HttpStatus.BAD_REQUEST, description: 'Datos de entrada inválidos.' })
    async realizarCompra(
        @Body() comprarProductoDto: ComprarProductoDto,
    ): Promise<JsonApiDocument<CompraRealizadaDto>> {
        const compraRealizada: CompraRealizadaDto = await this.inventarioService.procesarCompra(comprarProductoDto);

        const itemParaJsonApi = { ...compraRealizada, id: compraRealizada.id_compra };


        return { data: toJsonApi(COMPRA_RESOURCE_TYPE, itemParaJsonApi.id, itemParaJsonApi) }
    }
}