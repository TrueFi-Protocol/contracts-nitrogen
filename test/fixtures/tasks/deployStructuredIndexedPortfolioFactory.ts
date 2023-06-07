import { Wallet } from 'ethers'

import { StructuredIndexedPortfolioFactory__factory } from 'build/types'
import { StructuredIndexedPortfolioFactoryDeployParams } from 'fixtures/types'

export async function deployStructuredIndexedPortfolioFactory(
  wallet: Wallet,
  deployParams: StructuredIndexedPortfolioFactoryDeployParams,
) {
  const portfolioFactory = await new StructuredIndexedPortfolioFactory__factory(wallet).deploy(
    deployParams.portfolioImplementationAddress,
    deployParams.trancheVaultImplementationAddress,
    deployParams.protocolConfigAddress,
    deployParams.vaultsRegistryAddress,
  )
  return portfolioFactory
}
