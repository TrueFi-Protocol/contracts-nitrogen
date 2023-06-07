import { contract, ExecuteOptions } from 'ethereum-mars'
import { DEFAULT_ADMIN_ROLE } from './utils'

import { ManagerRoleGranter, StructuredIndexedPortfolio, OpenStructuredIndexedPortfolioFactory, TrancheVault } from '../../build/artifacts'
import { deployProtocolConfig } from './tasks/deployProtocolConfig'
import { deployVaultsRegistry } from './tasks/deployVaultsRegistry'

export function deployNitrogen(_: string, { networkName }: ExecuteOptions) {
  const protocolConfig = deployProtocolConfig(networkName)
  const vaultsRegistry = deployVaultsRegistry()
  const tranche = contract(TrancheVault)
  const structuredIndexedPortfolio = contract(StructuredIndexedPortfolio)
  const structuredIndexedPortfolioFactory = contract('structuredIndexedPortfolioFactory', OpenStructuredIndexedPortfolioFactory, [structuredIndexedPortfolio, tranche, protocolConfig, vaultsRegistry])
  // const structuredIndexedPortfolioFactory = contract(StructuredIndexedPortfolioFactory, [structuredIndexedPortfolio, tranche, protocolConfig, vaultsRegistry])

  const deployTestnetContracts = () => {
    const managerRoleGranter = contract(ManagerRoleGranter, [structuredIndexedPortfolioFactory])
    structuredIndexedPortfolioFactory.grantRole(DEFAULT_ADMIN_ROLE, managerRoleGranter)
    return { managerRoleGranter }
  }

  const isTestnet = networkName !== 'mainnet' && networkName !== 'optimism'

  return {
    vaultsRegistry,
    protocolConfig,
    structuredIndexedPortfolioFactory,
    ...(isTestnet && deployTestnetContracts()),
  }
}
