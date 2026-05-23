import type { Request, Response, NextFunction } from "express";
import { ZodSchema, ZodError } from "zod";

export type ValidatedRequest<T> = Request & { validated: T };

export function validate<T>(schema: ZodSchema<T>) {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      const parsed = schema.parse({
        body: req.body,
        params: req.params,
        query: req.query,
      });
      (req as ValidatedRequest<T>).validated = parsed;
      next();
    } catch (err) {
      if (err instanceof ZodError) {
        res.status(400).json({ error: "Validation failed", details: err.flatten() });
        return;
      }
      next(err);
    }
  };
}
