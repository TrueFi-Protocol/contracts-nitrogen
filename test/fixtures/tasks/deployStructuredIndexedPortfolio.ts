import { Wallet } from 'ethers'

import { StructuredIndexedPortfolioTest__factory } from 'build/types'
import { StructuredIndexedPortfolioDeployParams } from 'fixtures/types'
import { deployBehindProxy } from 'utils/deployBehindProxy'

export async function deployStructuredIndexedPortfolio(
  wallet: Wallet,
  deployParams: StructuredIndexedPortfolioDeployParams,
) {
  const portfolio = await deployBehindProxy(
    new StructuredIndexedPortfolioTest__factory(wallet),
    deployParams.managerAddress,
    deployParams.assetAddress,
    deployParams.protocolConfigAddress,
    deployParams.vaultsRegistryAddress,
    deployParams.portfolioParams,
    deployParams.trancheInitData,
    deployParams.expectedEquityRate,
  )
  return portfolio
}
