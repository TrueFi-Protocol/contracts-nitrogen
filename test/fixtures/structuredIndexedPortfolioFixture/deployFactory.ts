import { ProtocolConfig, VaultsRegistry } from 'build/types'
import { Wallet } from 'ethers'
import {
  deployStructuredIndexedPortfolioFactory,
  deployStructuredIndexedPortfolioTestImplementation,
  deployTrancheVaultImplementation,
} from 'fixtures/tasks'
import { getStructuredIndexedPortfolioFactoryDeployParams } from 'fixtures/utils'
import { WHITELISTED_MANAGER_ROLE } from 'utils/constants'

export async function deployFactory(wallet: Wallet, protocolConfig: ProtocolConfig, vaultsRegistry: VaultsRegistry) {
  const portfolioImplementation = await deployStructuredIndexedPortfolioTestImplementation(wallet)
  const trancheVaultImplementation = await deployTrancheVaultImplementation(wallet)

  const factoryDeployParams = getStructuredIndexedPortfolioFactoryDeployParams(
    portfolioImplementation,
    trancheVaultImplementation,
    protocolConfig,
    vaultsRegistry,
  )
  const portfolioFactory = await deployStructuredIndexedPortfolioFactory(wallet, factoryDeployParams)
  await portfolioFactory.grantRole(WHITELISTED_MANAGER_ROLE, wallet.address)

  return { portfolioFactory, factoryDeployParams }
}
