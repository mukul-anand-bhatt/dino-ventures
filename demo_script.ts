
const BASE_URL = "http://localhost:3000/api";
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Helper for colored logs
const log = {
    info: (msg: string) => console.log(`\x1b[36m[INFO]\x1b[0m ${msg}`),
    action: (msg: string) => console.log(`\n\x1b[33m[ACTION]\x1b[0m ${msg}`),
    success: (msg: string) => console.log(`\x1b[32m[SUCCESS]\x1b[0m ${msg}`),
    error: (msg: string) => console.log(`\x1b[31m[ERROR]\x1b[0m ${msg}`),
    header: (msg: string) => console.log(`\n\x1b[35m========================================\n ${msg}\n========================================\x1b[0m`)
};

async function main() {
    console.clear();
    log.header("🦖 DINO WALLET SERVICE - DEMO 🦖");
    console.log("Starting demo in 2 seconds...");
    await delay(2000);

    // 1. Setup
    log.action("1. Creating a new User and Wallet for the demo...");
    await delay(1000);
    const setupRes = await fetch(`${BASE_URL}/setup`, { method: "POST" });
    const setupData: any = await setupRes.json();

    if (!setupData.success) {
        log.error("Failed to setup! Is the server running?");
        return;
    }

    const walletId = setupData.walletId;
    const user = setupData.user;

    log.success(`User Created: ${user.name}`);
    log.success(`Wallet ID: ${walletId}`);
    await delay(2000);

    // 2. Initial Balance
    log.action("2. Checking Initial Balance...");
    const balRes1 = await fetch(`${BASE_URL}/wallet/${walletId}`);
    const bal1: any = await balRes1.json();
    log.info(`Current Balance: ${bal1.balance} GOLD`);
    await delay(2000);

    // 3. Top Up
    log.action("3. Adding 1000 GOLD (Top-up)...");
    await delay(1000);
    await fetch(`${BASE_URL}/transact`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ walletId, amount: 1000, type: "TOPUP", referenceId: "DEMO_1", description: "Initial Deposit" })
    });
    log.success("Transaction Complete!");

    const balRes2 = await fetch(`${BASE_URL}/wallet/${walletId}`);
    const bal2: any = await balRes2.json();
    log.info(`New Balance: ${bal2.balance} GOLD`);
    await delay(2000);

    // 4. Spend
    log.action("4. Spending 200 GOLD (Buying Dino Food)...");
    await delay(1000);
    await fetch(`${BASE_URL}/transact`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ walletId, amount: -200, type: "SPEND", referenceId: "DEMO_2", description: "Dino Food" })
    });
    log.success("Transaction Complete!");

    const balRes3 = await fetch(`${BASE_URL}/wallet/${walletId}`);
    const bal3: any = await balRes3.json();
    log.info(`New Balance: ${bal3.balance} GOLD`);
    await delay(2000);

    // 5. Concurrency Test (Visual)
    log.action("5. 🔥 CONCURRENCY TEST: Spaming 10 requests at once! 🔥");
    log.info("Sending 5 Spends of 100 GOLD and 5 Bonuses of 100 GOLD simultaneously...");
    log.info("Expected Net Change: 0 GOLD.");
    await delay(2000);

    const promises = [];
    for (let i = 0; i < 5; i++) {
        promises.push(fetch(`${BASE_URL}/transact`, {
            method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ walletId, amount: -100, type: "SPEND", referenceId: `CONC_SPEND_${i}` })
        }));
        promises.push(fetch(`${BASE_URL}/transact`, {
            method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ walletId, amount: 100, type: "BONUS", referenceId: `CONC_BONUS_${i}` })
        }));
    }

    await Promise.all(promises);
    log.success("All concurrent requests processed!");

    const balRes4 = await fetch(`${BASE_URL}/wallet/${walletId}`);
    const bal4: any = await balRes4.json();

    if (bal4.balance === bal3.balance) {
        log.success(`Final Balance: ${bal4.balance} GOLD (Matched execution!)`);
    } else {
        log.error(`Final Balance: ${bal4.balance} GOLD (Mismatch!)`);
    }
    await delay(2000);

    // 6. Idempotency
    log.action("6. 🛡️ IDEMPOTENCY TEST: Double-Clicking Pay button 🛡️");
    log.info("Simulating network lag where user clicks twice...");
    const idemKey = `KEY_${Date.now()}`;
    await delay(1000);

    log.info(`Sending Request A with Key: ${idemKey} (Top-up 500)`);
    await fetch(`${BASE_URL}/transact`, {
        method: "POST", headers: { "Content-Type": "application/json", "Idempotency-Key": idemKey },
        body: JSON.stringify({ walletId, amount: 500, type: "TOPUP", referenceId: "IDEM_1" })
    });

    await delay(500);
    log.info(`Sending Request B with SAME Key: ${idemKey} (Top-up 500)`);
    await fetch(`${BASE_URL}/transact`, {
        method: "POST", headers: { "Content-Type": "application/json", "Idempotency-Key": idemKey },
        body: JSON.stringify({ walletId, amount: 500, type: "TOPUP", referenceId: "IDEM_1" })
    });

    log.success("Both requests sent!");
    const balRes5 = await fetch(`${BASE_URL}/wallet/${walletId}`);
    const bal5: any = await balRes5.json();
    const expected = bal4.balance + 500;

    log.info(`Previous Balance: ${bal4.balance}`);
    log.info(`Expected Balance: ${expected} (Only one +500 applied)`);
    log.info(`Actual Balance:   ${bal5.balance}`);

    if (bal5.balance === expected) {
        log.success("Idempotency Works! Only charged once.");
    } else {
        log.error("Idempotency Failed! Charged twice.");
    }

    log.header("✅ DEMO COMPLETE ✅");
}

main();
