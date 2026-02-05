
import { PrismaClient, Prisma } from '@prisma/client';

const prisma = new PrismaClient();

export type TransactionType = 'TOPUP' | 'BONUS' | 'SPEND';

interface TransactionInput {
    walletId: string;
    amount: number;
    type: TransactionType;
    referenceId: string;
    description?: string;
    idempotencyKey?: string;
}

export class LedgerService {
    async processTransaction(input: TransactionInput) {
        const { walletId, amount, type, referenceId, description, idempotencyKey } = input;

        if (type === 'SPEND' && amount >= 0) {
            throw new Error(`SPEND amount must be negative. Provided: ${amount}`);
        }
        if ((type === 'TOPUP' || type === 'BONUS') && amount <= 0) {
            throw new Error(`${type} amount must be positive. Provided: ${amount}`);
        }

        return await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
            const wallet = await tx.wallet.findUniqueOrThrow({
                where: { id: walletId },
            });

            if (type === 'SPEND') {
                const balanceAgg = await tx.ledgerTransaction.aggregate({
                    where: { walletId },
                    _sum: { amount: true },
                });
                const currentBalance = balanceAgg._sum.amount || 0;

                if (currentBalance + amount < 0) {
                    throw new Error(`Insufficient funds. Balance: ${currentBalance}, Required: ${Math.abs(amount)}`);
                }
            }

            const transaction = await tx.ledgerTransaction.create({
                data: {
                    walletId,
                    amount,
                    type,
                    referenceId,
                    description,
                },
            });

            return transaction;
        });
    }

    async getBalance(walletId: string): Promise<number> {
        const result = await prisma.ledgerTransaction.aggregate({
            where: { walletId },
            _sum: { amount: true },
        });
        return result._sum.amount || 0;
    }
}

export const ledgerService = new LedgerService();
