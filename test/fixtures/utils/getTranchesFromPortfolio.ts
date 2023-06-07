import { StructuredIndexedPortfolio, TrancheVault__factory } from 'contracts'
import { Wallet } from 'ethers'

export async function getTranchesFromPortfolio(portfolio: StructuredIndexedPortfolio, wallet: Wallet) {
  const tranchesAddresses = await portfolio.getTranches()
  return tranchesAddresses.map((trancheAddress) => new TrancheVault__factory(wallet).attach(trancheAddress))
}
