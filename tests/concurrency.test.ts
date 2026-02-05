
import { expect, test, describe } from "bun:test";

const BASE_URL = "http://localhost:3000/api";
const WALLET_ID = "test-wallet-id"; // Placeholder, will set dynamically

async function getBalance(walletId: string) {
    const res = await fetch(`${BASE_URL}/wallet/${walletId}`);
    const data = await res.json();
    return data.balance;
}

async function transact(walletId: string, amount: number, type: string, ref: string, idemKey?: string) {
    const headers: any = { "Content-Type": "application/json" };
    if (idemKey) headers["Idempotency-Key"] = idemKey;

    return fetch(`${BASE_URL}/transact`, {
        method: "POST",
        headers,
        body: JSON.stringify({
            walletId,
            amount,
            type,
            referenceId: ref
        })
    });
}

// NOTE: This test requires the server to be running.
// I will create a separate script to run the tests against the live server.
console.log("This file is a placeholder for the logic. See verification_script.ts for execution");
