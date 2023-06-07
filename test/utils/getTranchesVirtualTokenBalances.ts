import { TrancheVault } from 'contracts'

export function getTranchesVirtualTokenBalances(tranches: TrancheVault[]) {
  return Promise.all(tranches.map((tranche) => tranche.virtualTokenBalance()))
}
