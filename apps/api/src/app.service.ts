import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getRoot() {
    return { ok: true, msg: 'api root' };
  }
}
