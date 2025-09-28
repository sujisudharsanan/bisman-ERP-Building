import { Injectable, NestMiddleware } from "@nestjs/common";
import { randomUUID } from "crypto";

@Injectable()
export class RequestIdMiddleware implements NestMiddleware {
  use(req: any, res: any, next: () => void) {
    const incoming = req.headers["x-request-id"] || req.headers["x-correlation-id"];
    const id = incoming || randomUUID();
    req.requestId = id;
    res.setHeader("x-request-id", id);
    next();
  }
}
