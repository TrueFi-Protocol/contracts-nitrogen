import { Wallet } from 'ethers'

import { MockToken, ProtocolConfig, VaultsRegistry } from 'contracts'
import { getStructuredIndexedPortfolioDeployParams } from 'fixtures/utils'
import { deployStructuredIndexedPortfolio } from './deployStructuredIndexedPortfolio'
import { deployMockTrancheVault } from './deployMockTrancheVault'

export async function deployStructuredIndexedPortfolioWithMockTranche(
  wallet: Wallet,
  token: MockToken,
  protocolConfig: ProtocolConfig,
  vaultsRegistry: VaultsRegistry,
) {
  const mockTrancheVault = await deployMockTrancheVault(wallet, token)

  const trancheInitData = [{ tranche: mockTrancheVault.address, minSubordinateRatio: 0, targetApy: 0 }]
  const deployParams = getStructuredIndexedPortfolioDeployParams(wallet, token, protocolConfig, vaultsRegistry, trancheInitData)
  const portfolioWithMockTranche = await deployStructuredIndexedPortfolio(wallet, deployParams)

  return { portfolioWithMockTranche, mockTrancheVault }
}
