import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiKeyGuard } from './api-key.guard';

// Mock del ConfigService
const mockConfigService = {
    get: jest.fn(),
};

// Mock del ExecutionContext y sus partes
const mockGetHeader = jest.fn();
const mockHttpRequest = {
    headers: {

    },
};
const mockSwitchToHttp = jest.fn().mockReturnValue({
    getRequest: () => mockHttpRequest,
});

const mockExecutionContext = {
    switchToHttp: mockSwitchToHttp,
} as unknown as ExecutionContext;


describe('ApiKeyGuard', () => {
    let guard: ApiKeyGuard;
    let configService: jest.Mocked<ConfigService>;

    const VALID_API_KEY = 'test-api-key';

    beforeEach(() => {
        // Hacemos un type assertion para tratar nuestro mock como un ConfigService completo
        configService = mockConfigService as unknown as jest.Mocked<ConfigService>;
        guard = new ApiKeyGuard(configService);

        // Reset mocks
        configService.get.mockClear();
        mockGetHeader.mockClear();
        // Reset el header para cada test si lo estás asignando directamente
        mockHttpRequest.headers['x-api-key'] = undefined;
    });

    it('should be defined', () => {
        expect(guard).toBeDefined();
    });

    it('should allow access if API key is valid', () => {
        // Simula que ConfigService devuelve la API key válida
        configService.get.mockReturnValue(VALID_API_KEY);
        // Simula que el request tiene el header con la API key válida
        mockHttpRequest.headers['x-api-key'] = VALID_API_KEY;
        // O si usas request.get('x-api-key') : mockGetHeader.mockReturnValue(VALID_API_KEY);

        const canActivate = guard.canActivate(mockExecutionContext);
        expect(canActivate).toBe(true);
        expect(configService.get).toHaveBeenCalledWith('PRODUCTOS_API_KEY'); // Verifica que se pidió la key correcta
    });

    it('should throw UnauthorizedException if API key is missing', () => {
        configService.get.mockReturnValue(VALID_API_KEY);
        // No se establece el header 'x-api-key' en mockHttpRequest, por lo que será undefined

        expect(() => guard.canActivate(mockExecutionContext)).toThrow(UnauthorizedException);
        expect(configService.get).toHaveBeenCalledWith('PRODUCTOS_API_KEY');
    });

    it('should throw UnauthorizedException if API key is invalid', () => {
        configService.get.mockReturnValue(VALID_API_KEY);
        mockHttpRequest.headers['x-api-key'] = 'invalid-api-key';

        expect(() => guard.canActivate(mockExecutionContext)).toThrow(UnauthorizedException);
        expect(configService.get).toHaveBeenCalledWith('PRODUCTOS_API_KEY');
    });

    it('should throw UnauthorizedException if configured API key is undefined (misconfiguration)', () => {
        // Simula que la variable de entorno PRODUCTOS_API_KEY no está configurada
        configService.get.mockReturnValue(undefined);
        mockHttpRequest.headers['x-api-key'] = VALID_API_KEY; // Incluso si el cliente envía una key

        expect(() => guard.canActivate(mockExecutionContext)).toThrow(UnauthorizedException);
        expect(configService.get).toHaveBeenCalledWith('PRODUCTOS_API_KEY');
    });
});