
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('Seeding database...');

    // 1. Create System User (Treasury)
    // We use upsert to avoid errors if running multiple times
    const systemUser = await prisma.user.upsert({
        where: { email: 'treasury@dino.com' },
        update: {},
        create: {
            name: 'System Treasury',
            email: 'treasury@dino.com',
        },
    });

    const systemWallet = await prisma.wallet.upsert({
        where: {
            userId_assetType: { userId: systemUser.id, assetType: 'GOLD' }
        },
        update: {},
        create: {
            userId: systemUser.id,
            assetType: 'GOLD',
        }
    });
    console.log({ systemWallet });

    // 2. Create Normal Users
    const user1 = await prisma.user.upsert({
        where: { email: 'alice@dino.com' },
        update: {},
        create: { name: 'Alice', email: 'alice@dino.com' },
    });

    const wallet1 = await prisma.wallet.upsert({
        where: { userId_assetType: { userId: user1.id, assetType: 'GOLD' } },
        update: {},
        create: { userId: user1.id, assetType: 'GOLD' }
    });

    const user2 = await prisma.user.upsert({
        where: { email: 'bob@dino.com' },
        update: {},
        create: { name: 'Bob', email: 'bob@dino.com' },
    });

    const wallet2 = await prisma.wallet.upsert({
        where: { userId_assetType: { userId: user2.id, assetType: 'GOLD' } },
        update: {},
        create: { userId: user2.id, assetType: 'GOLD' }
    });

    console.log({ user1: wallet1, user2: wallet2 });

    // Initial Balances (Optional - giving them some startup cash via Transaction)
    // We check if they have transactions first to avoid duplicate seed balance
    const txCount = await prisma.ledgerTransaction.count({ where: { walletId: wallet1.id } });
    if (txCount === 0) {
        await prisma.ledgerTransaction.create({
            data: {
                walletId: wallet1.id,
                amount: 100,
                type: 'BONUS',
                referenceId: 'SEED_INIT_1',
                description: 'Welcome Bonus'
            }
        });
        console.log("Seeded Alice with 100 Gold");
    }
}

main()
    .then(async () => {
        await prisma.$disconnect();
    })
    .catch(async (e) => {
        console.error(e);
        await prisma.$disconnect();
        process.exit(1);
    });
