import { Wallet } from 'ethers'
import {
  deployControllerImplementations,
  deployMockERC4626Vault,
  deployMockToken,
  deployProtocolConfig,
  deployStandaloneControllers,
  deployStructuredIndexedPortfolioWithMockTranche,
  deployVaultsRegistry,
} from 'fixtures/tasks'
import { deployTestUpgradeable } from 'fixtures/tasks/deployTestUpgradeable'
import { getProtocolConfigDeployParams } from 'fixtures/utils'
import { deployFactory } from './deployFactory'
import { deployMultitranchePortfolio, deployUnitranchePortfolio } from './deployPortfolio'
import { TOKEN_DECIMALS } from './fixtureConfig'

export async function deployFixtureContracts([wallet]: Wallet[]) {
  const tokenDecimals = TOKEN_DECIMALS
  const token = await deployMockToken(wallet, tokenDecimals)

  const protocolConfigDeployParams = getProtocolConfigDeployParams(wallet)
  const protocolConfig = await deployProtocolConfig(wallet, protocolConfigDeployParams)

  const vaultsRegistry = await deployVaultsRegistry(wallet)

  const { portfolioFactory, factoryDeployParams } = await deployFactory(wallet, protocolConfig, vaultsRegistry)

  const controllersImplementations = await deployControllerImplementations(wallet)
  const standaloneControllers = await deployStandaloneControllers(wallet, wallet.address)

  const deployMultitranchePortfolioData = await deployMultitranchePortfolio(wallet, portfolioFactory, token, controllersImplementations)
  const deployUnitranchePortfolioData = await deployUnitranchePortfolio(wallet, portfolioFactory, token, controllersImplementations)

  const deployMockPortfolioData = await deployStructuredIndexedPortfolioWithMockTranche(wallet, token, protocolConfig, vaultsRegistry)

  const deployTestUpgradeableData = await deployTestUpgradeable(wallet)

  const mockErc4626Vault = await deployMockERC4626Vault(wallet, token)

  return {
    portfolioFactory,
    token,
    factoryDeployParams,
    protocolConfig,
    vaultsRegistry,
    protocolConfigDeployParams,
    standaloneControllers,
    tokenDecimals,
    controllersImplementations,
    mockErc4626Vault,
    ...deployMultitranchePortfolioData,
    ...deployUnitranchePortfolioData,
    ...deployMockPortfolioData,
    ...deployTestUpgradeableData,
  }
}
