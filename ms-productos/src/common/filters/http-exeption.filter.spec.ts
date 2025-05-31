import { HttpException, HttpStatus, ArgumentsHost } from '@nestjs/common';
import { HttpAdapterHost } from '@nestjs/core';
import { HttpExceptionFilter, JsonApiErrorObject } from './http-exception.filter';

// Mocks para los objetos
const mockJson = jest.fn();
const mockStatus = jest.fn().mockImplementation(() => ({
    json: mockJson,
}));
const mockGetResponse = jest.fn().mockImplementation(() => ({
    status: mockStatus,
}));
const mockGetRequest = jest.fn();
const mockHttpArgumentsHost = jest.fn().mockImplementation(() => ({
    getResponse: mockGetResponse,
    getRequest: mockGetRequest,
}));
const mockArgumentsHost = {
    switchToHttp: mockHttpArgumentsHost,
    getArgByIndex: jest.fn(),
    getArgs: jest.fn(),
    getType: jest.fn(),
    switchToRpc: jest.fn(),
    switchToWs: jest.fn(),
} as ArgumentsHost;


describe('HttpExceptionFilter', () => {
    let filter: HttpExceptionFilter;

    beforeEach(() => {
        filter = new HttpExceptionFilter();
        // Limpiar mocks antes de cada prueba
        mockJson.mockClear();
        mockStatus.mockClear();
        mockGetResponse.mockClear();
        mockHttpArgumentsHost.mockClear();
    });

    it('should be defined', () => {
        expect(filter).toBeDefined();
    });

    it('should handle basic HttpException with string response', () => {
        const exception = new HttpException('Error Ocurrido', HttpStatus.BAD_REQUEST);
        jest.spyOn(exception, 'getStatus').mockReturnValue(HttpStatus.BAD_REQUEST);
        jest.spyOn(exception, 'getResponse').mockReturnValue('Error Ocurrido');


        filter.catch(exception, mockArgumentsHost);

        expect(mockStatus).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
        expect(mockJson).toHaveBeenCalledWith({
            errors: [
                {
                    status: HttpStatus.BAD_REQUEST.toString(),
                    title: 'Error Ocurrido',
                    detail: 'Error Ocurrido',
                },
            ],
        });
    });

    it('should handle HttpException with object response', () => {
        const errorResponse = { message: 'Detalle del error', error: 'Bad Request Error' };
        const exception = new HttpException(errorResponse, HttpStatus.UNAUTHORIZED);
        jest.spyOn(exception, 'getStatus').mockReturnValue(HttpStatus.UNAUTHORIZED);
        jest.spyOn(exception, 'getResponse').mockReturnValue(errorResponse);


        filter.catch(exception, mockArgumentsHost);

        expect(mockStatus).toHaveBeenCalledWith(HttpStatus.UNAUTHORIZED);
        expect(mockJson).toHaveBeenCalledWith({
            errors: [
                {
                    status: HttpStatus.UNAUTHORIZED.toString(),
                    title: 'Bad Request Error', // Toma de errorResponse.error
                    detail: 'Detalle del error', // Toma de errorResponse.message
                },
            ],
        });
    });

    it('should handle class-validator HttpException (array of messages)', () => {
        const validationErrorResponse = {
            message: ['campo1 debe ser string', 'campo2 no debe estar vacío'],
            error: 'Bad Request',
            statusCode: HttpStatus.BAD_REQUEST
        };
        const exception = new HttpException(validationErrorResponse, HttpStatus.BAD_REQUEST);
        jest.spyOn(exception, 'getStatus').mockReturnValue(HttpStatus.BAD_REQUEST);
        jest.spyOn(exception, 'getResponse').mockReturnValue(validationErrorResponse);


        filter.catch(exception, mockArgumentsHost);

        expect(mockStatus).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
        const expectedErrors: JsonApiErrorObject[] = [
            {
                status: HttpStatus.BAD_REQUEST.toString(),
                title: 'Validation Error',
                detail: 'campo1 debe ser string',
                source: { pointer: '/data/attributes/campo1' },
            },
            {
                status: HttpStatus.BAD_REQUEST.toString(),
                title: 'Validation Error',
                detail: 'campo2 no debe estar vacío',
                source: { pointer: '/data/attributes/campo2' },
            },
        ];
        expect(mockJson).toHaveBeenCalledWith({ errors: expectedErrors });
    });

    it('should handle HttpException with only a message if error title is not available', () => {
        const errorResponse = { message: 'Solo mensaje, sin título de error específico' };
        const exception = new HttpException(errorResponse, HttpStatus.INTERNAL_SERVER_ERROR);
        jest.spyOn(exception, 'getStatus').mockReturnValue(HttpStatus.INTERNAL_SERVER_ERROR);
        jest.spyOn(exception, 'getResponse').mockReturnValue(errorResponse);

        filter.catch(exception, mockArgumentsHost);

        expect(mockStatus).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);
        expect(mockJson).toHaveBeenCalledWith({
            errors: [
                {
                    status: HttpStatus.INTERNAL_SERVER_ERROR.toString(),
                    title: 'Error',
                    detail: 'Solo mensaje, sin título de error específico',
                },
            ],
        });
    });
});