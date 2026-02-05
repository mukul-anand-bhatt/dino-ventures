
import { Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();



export const idempotency = async (req: Request, res: Response, next: NextFunction) => {
    const key = req.headers['idempotency-key'] as string;

    if (!key) {
        return next();
    }

    try {
        const existing = await prisma.idempotencyLog.findUnique({
            where: { key },
        });

        if (existing) {
            const responseBody = JSON.parse(existing.response);
            return res.status(200).json(responseBody);
        }

        const originalJson = res.json;

        res.json = function (body: any) {
            res.json = originalJson;

            prisma.idempotencyLog.create({
                data: {
                    key,
                    response: JSON.stringify(body),
                },
            }).catch(err => console.error("Failed to save idempotency log:", err));

            return originalJson.call(this, body);
        };

        next();
    } catch (error) {
        console.error("Idempotency middleware error:", error);
        next();
    }
};
