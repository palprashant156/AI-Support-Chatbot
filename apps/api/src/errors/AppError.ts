export class AppError extends Error {
  status: number;
  code: string;
  constructor(status: number, code: string, message: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

export const notFound = (msg = 'Not found') => new AppError(404, 'NOT_FOUND', msg);
export const forbidden = (msg = 'Forbidden') => new AppError(403, 'FORBIDDEN', msg);
export const badRequest = (msg = 'Bad request') => new AppError(400, 'BAD_REQUEST', msg);
export const conflict = (msg = 'Conflict') => new AppError(409, 'CONFLICT', msg);
