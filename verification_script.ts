
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const BASE_URL = "http://localhost:3000/api";

async function main() {
    console.log("Starting Concurrency Test...");

    // 1. Setup Test Wallet
    const user = await prisma.user.create({
        data: {
            name: "Concurrency Tester",
            email: `tester_${Date.now()}@dino.com`
        }
    });

    const wallet = await prisma.wallet.create({
        data: {
            userId: user.id,
            assetType: "GOLD"
        }
    });

    console.log(`Created Test Wallet: ${wallet.id}`);

    // 2. Perform Parallel Transactions
    // We will send 50 requests: 25 Topups (+10) and 25 Spends (-10)
    // Expected Net Change: 0.
    // Initial Balance is 0.

    const REQUESTS = 50;
    const promises = [];

    // First, give some balance so spends don't fail immediately due to insufficient funds order
    await fetch(`${BASE_URL}/transact`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ walletId: wallet.id, amount: 1000, type: "TOPUP", referenceId: "INIT" })
    });

    console.log("Initial Balance set to 1000");

    for (let i = 0; i < REQUESTS; i++) {
        const type = i % 2 === 0 ? "TOPUP" : "SPEND";
        const amount = i % 2 === 0 ? 10 : -10;

        promises.push(
            fetch(`${BASE_URL}/transact`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    walletId: wallet.id,
                    amount,
                    type,
                    referenceId: `REF_${i}`
                })
            }).then(r => r.json())
        );
    }

    await Promise.all(promises);

    // 3. Verify Final Balance
    // Should be 1000 + (25 * 10) + (25 * -10) = 1000
    const res = await fetch(`${BASE_URL}/wallet/${wallet.id}`);
    const data: any = await res.json();

    console.log(`Final Balance: ${data.balance}`);

    if (data.balance === 1000) {
        console.log("✅ Concurrency Test PASSED: Balance is consistent.");
    } else {
        console.error(`❌ Concurrency Test FAILED: Expected 1000, got ${data.balance}`);
    }

    // 4. Test Idempotency
    const idemKey = `IDEM_${Date.now()}`;
    const req1 = await fetch(`${BASE_URL}/transact`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Idempotency-Key": idemKey },
        body: JSON.stringify({ walletId: wallet.id, amount: 50, type: "TOPUP", referenceId: "IDEM_TEST" })
    });
    const json1: any = await req1.json();

    const req2 = await fetch(`${BASE_URL}/transact`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Idempotency-Key": idemKey },
        body: JSON.stringify({ walletId: wallet.id, amount: 50, type: "TOPUP", referenceId: "IDEM_TEST" })
    });
    const json2: any = await req2.json();

    if (json1.transaction.id === json2.transaction.id) {
        console.log("✅ Idempotency Test PASSED: Returned same transaction ID.");
    } else {
        console.error("❌ Idempotency Test FAILED: Transaction IDs differ.");
    }
}

main();
