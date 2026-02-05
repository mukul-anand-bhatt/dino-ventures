
import express from 'express';
import { z } from 'zod';
import { ledgerService, TransactionType } from '../services/ledger';
import { idempotency } from '../middleware/idempotency';
import { PrismaClient } from '@prisma/client';

const router = express.Router();
const prisma = new PrismaClient();


const transactionSchema = z.object({
    walletId: z.string().uuid(),
    amount: z.number().int(),
    type: z.enum(['TOPUP', 'BONUS', 'SPEND']),
    referenceId: z.string().min(1),
    description: z.string().optional(),
});


router.use(express.json());


router.post('/setup', async (req, res) => {
    try {
        const name = `TestUser_${Date.now()}`;
        const email = `test_${Date.now()}@dino.com`;

        const user = await prisma.user.create({
            data: { name, email }
        });

        const wallet = await prisma.wallet.create({
            data: { userId: user.id, assetType: 'GOLD' }
        });

        res.json({ success: true, walletId: wallet.id, user });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Setup failed' });
    }
});

router.post('/transact', idempotency, async (req, res) => {
    try {
        const data = transactionSchema.parse(req.body);

        const transaction = await ledgerService.processTransaction({
            walletId: data.walletId,
            amount: data.amount,
            type: data.type as TransactionType,
            referenceId: data.referenceId,
            description: data.description,
            idempotencyKey: req.headers['idempotency-key'] as string
        });

        res.json({ success: true, transaction });
    } catch (error: any) {
        if (error instanceof z.ZodError) {
            return res.status(400).json({ error: error });
        }
        if (error.message.includes('Insufficient funds') || error.message.includes('amount must be')) {
            return res.status(400).json({ error: error.message });
        }
        console.error(error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

router.get('/wallet/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const balance = await ledgerService.getBalance(id);
        res.json({ walletId: id, balance });
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch balance' });
    }
});

router.get('/wallet/:id/details', async (req, res) => {
    try {
        const { id } = req.params;
        const wallet = await prisma.wallet.findUnique({
            where: { id },
            include: { user: true }
        });
        if (!wallet) return res.status(404).json({ error: "Wallet not found" });
        const balance = await ledgerService.getBalance(id);
        res.json({ ...wallet, balance });
    } catch (error) {
        res.status(500).json({ error: "Internal Error" });
    }
});

export default router;
