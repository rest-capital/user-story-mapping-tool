import { Injectable } from '@nestjs/common';

@Injectable()
export class HealthService {
  check() {
    return {
      status: 'ok',
      message: 'User Story Mapping Service is running',
      timestamp: new Date().toISOString(),
    };
  }
}
