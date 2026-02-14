import { Balance, Settlement } from "../types/finance";

/**
 * Calculates optimal settlement transactions to minimize the number of payments.
 * Algorithm: Match the biggest debtor with the biggest creditor until everyone is settled.
 *
 * @param balances - Array of balances from the flat_balances view
 * @returns Array of suggested settlement transactions
 */
export function calculateSettlements(balances: Balance[]): Settlement[] {
  const settlements: Settlement[] = [];

  // Create mutable copies of balances
  const debtors = balances
    .filter((b) => b.net_balance < 0)
    .map((b) => ({ name: b.name, amount: Math.abs(b.net_balance) }))
    .sort((a, b) => b.amount - a.amount); // Sort descending

  const creditors = balances
    .filter((b) => b.net_balance > 0)
    .map((b) => ({ name: b.name, amount: b.net_balance }))
    .sort((a, b) => b.amount - a.amount); // Sort descending

  let i = 0; // Debtor index
  let j = 0; // Creditor index

  while (i < debtors.length && j < creditors.length) {
    const debtor = debtors[i];
    const creditor = creditors[j];

    // Find the minimum of what debtor owes and what creditor is owed
    const settlementAmount = Math.min(debtor.amount, creditor.amount);

    // Create a settlement transaction
    settlements.push({
      from: debtor.name,
      to: creditor.name,
      amount: Math.round(settlementAmount * 100) / 100, // Round to 2 decimal places
    });

    // Update balances
    debtor.amount -= settlementAmount;
    creditor.amount -= settlementAmount;

    // Move to next debtor or creditor if their balance is settled
    if (debtor.amount === 0) i++;
    if (creditor.amount === 0) j++;
  }

  return settlements;
}
