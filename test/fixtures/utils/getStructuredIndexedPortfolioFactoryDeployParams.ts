import { ProtocolConfig, StructuredIndexedPortfolio, TrancheVault, VaultsRegistry } from 'build/types'
import { StructuredIndexedPortfolioFactoryDeployParams } from 'fixtures/types'

export function getStructuredIndexedPortfolioFactoryDeployParams(
  portfolioImplementation: StructuredIndexedPortfolio,
  trancheVaultImplementation: TrancheVault,
  protocolConfig: ProtocolConfig,
  vaultsRegistry: VaultsRegistry,
): StructuredIndexedPortfolioFactoryDeployParams {
  return {
    portfolioImplementationAddress: portfolioImplementation.address,
    trancheVaultImplementationAddress: trancheVaultImplementation.address,
    protocolConfigAddress: protocolConfig.address,
    vaultsRegistryAddress: vaultsRegistry.address,
  }
}
