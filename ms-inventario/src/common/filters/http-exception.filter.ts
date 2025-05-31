import { ExceptionFilter, Catch, ArgumentsHost, HttpException, HttpStatus } from '@nestjs/common';
import { Request, Response } from 'express';

export interface JsonApiErrorObject {
    id?: string;
    status: string;
    code?: string;
    title: string;
    detail?: string;
    source?: { pointer?: string; parameter?: string };
}

@Catch(HttpException)
export class HttpExceptionFilter implements ExceptionFilter {
    catch(exception: HttpException, host: ArgumentsHost) {
        const ctx = host.switchToHttp();
        const response = ctx.getResponse<Response>();
        const request = ctx.getRequest<Request>();
        const status = exception.getStatus();
        const exceptionResponse = exception.getResponse();

        let errors: JsonApiErrorObject[] = [];

        if (typeof exceptionResponse === 'string') {
            errors.push({
                status: status.toString(),
                title: exceptionResponse,
                detail: exception.message,
            });
        } else if (typeof exceptionResponse === 'object' && exceptionResponse !== null) {
            const resp = exceptionResponse as any;
            if (Array.isArray(resp.message)) {
                errors = resp.message.map((msg: string) => ({
                    status: status.toString(),
                    title: 'Validation Error',
                    detail: msg,
                    source: { pointer: `/data/attributes/${msg.split(' ')[0]}` }
                }));
            } else {
                errors.push({
                    status: status.toString(),
                    title: resp.error || 'Error',
                    detail: resp.message || exception.message,
                });
            }
        }

        response.status(status).json({ errors });
    }
}