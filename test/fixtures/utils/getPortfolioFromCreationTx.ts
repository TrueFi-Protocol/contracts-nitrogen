import { StructuredIndexedPortfolioTest__factory } from 'build/types'
import { ContractTransaction, Wallet } from 'ethers'
import { extractEventArgFromTx } from 'utils'

export async function getPortfolioFromCreationTx(wallet:Wallet, portfolioCreationTx: ContractTransaction, factoryAddress: string) {
  const portfolioAddress = await extractEventArgFromTx(portfolioCreationTx, [factoryAddress, 'PortfolioCreated', 'newPortfolio'])
  return new StructuredIndexedPortfolioTest__factory(wallet).attach(portfolioAddress)
}
