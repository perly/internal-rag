import { ArgumentsHost, Catch, ExceptionFilter, HttpStatus } from '@nestjs/common';
import { MulterError } from 'multer';
import { MissingApiKeyError } from './helper/embedder.helper.js';

@Catch(MissingApiKeyError)
export class MissingApiKeyFilter implements ExceptionFilter {
  catch(error: MissingApiKeyError, host: ArgumentsHost): void {
    host.switchToHttp().getResponse().status(HttpStatus.SERVICE_UNAVAILABLE).json({
      statusCode: HttpStatus.SERVICE_UNAVAILABLE,
      message: error.message,
    });
  }
}

@Catch(MulterError)
export class MulterExceptionFilter implements ExceptionFilter {
  catch(error: MulterError, host: ArgumentsHost): void {
    const message = error.code === 'LIMIT_FILE_SIZE' ? 'File is larger than 5 MB.' : error.message;
    host.switchToHttp().getResponse().status(HttpStatus.BAD_REQUEST).json({
      statusCode: HttpStatus.BAD_REQUEST,
      message,
    });
  }
}
