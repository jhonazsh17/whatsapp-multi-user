import { Injectable, NestInterceptor, ExecutionContext, CallHandler, UnauthorizedException } from '@nestjs/common';
import { Observable } from 'rxjs';

@Injectable()
export class JwtInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    
    // Extraer datos del token
    const authData = this.extractAuthData(request);
    
    // Agregar al request para usar en los controladores
    request.authData = authData;
    
    return next.handle();
  }

  private extractAuthData(request: any): any {
    try {
      // Buscar token en Authorization header o en token header
      const authorization = request.headers['authorization'];
      const token = request.headers['token'];
      
      let jwtToken = '';
      
      if (authorization) {
        jwtToken = authorization.replace('Bearer ', '');
      } else if (token) {
        jwtToken = token;
      }
      
      if (!jwtToken) {
        throw new UnauthorizedException('No JWT token found in headers');
      }
      
      // Añadir padding si es necesario
      const paddedBase64 = jwtToken + '='.repeat((4 - jwtToken.length % 4) % 4);
      const payloadJson = Buffer.from(paddedBase64, 'base64').toString();
      
      const payload = JSON.parse(payloadJson);      
      return payload;
    } catch (error) {
      throw new UnauthorizedException(`Invalid JWT token: ${error.message}`);
    }
  }
}
