import { Wallet } from 'ethers'

import { StructuredIndexedPortfolioTest__factory } from 'build/types'

export async function deployStructuredIndexedPortfolioTestImplementation(wallet: Wallet) {
  const portfolioImplementation = await new StructuredIndexedPortfolioTest__factory(wallet).deploy()
  return portfolioImplementation
}
