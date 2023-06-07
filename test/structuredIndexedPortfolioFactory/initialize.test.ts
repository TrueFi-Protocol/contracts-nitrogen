import { expect, use } from 'chai'
import { solidity } from 'ethereum-waffle'
import { structuredIndexedPortfolioFixture } from 'fixtures/structuredIndexedPortfolioFixture'
import { setupFixtureLoader } from 'test/setup'
import { DEFAULT_ADMIN_ROLE } from 'utils/constants'

use(solidity)

describe('StructuredIndexedPortfolioFactory.initialize', () => {
  const loadFixture = setupFixtureLoader()

  it('sets sender as admin', async () => {
    const { portfolioFactory, wallet } = await loadFixture(structuredIndexedPortfolioFixture)
    expect(await portfolioFactory.getRoleMemberCount(DEFAULT_ADMIN_ROLE)).to.eq(1)
    expect(await portfolioFactory.getRoleMember(DEFAULT_ADMIN_ROLE, 0)).to.eq(wallet.address)
  })

  it('sets portfolio implementation', async () => {
    const { portfolioFactory, factoryDeployParams: { portfolioImplementationAddress } } = await loadFixture(structuredIndexedPortfolioFixture)
    expect(await portfolioFactory.portfolioImplementation()).to.eq(portfolioImplementationAddress)
  })

  it('sets tranche vault implementation', async () => {
    const { portfolioFactory, factoryDeployParams: { trancheVaultImplementationAddress } } = await loadFixture(structuredIndexedPortfolioFixture)
    expect(await portfolioFactory.trancheImplementation()).to.eq(trancheVaultImplementationAddress)
  })

  it('sets protocol config', async () => {
    const { portfolioFactory, factoryDeployParams: { protocolConfigAddress } } = await loadFixture(structuredIndexedPortfolioFixture)
    expect(await portfolioFactory.protocolConfig()).to.eq(protocolConfigAddress)
  })

  it('sets vaults registry', async () => {
    const { portfolioFactory, factoryDeployParams: { vaultsRegistryAddress } } = await loadFixture(structuredIndexedPortfolioFixture)
    expect(await portfolioFactory.vaultsRegistry()).to.eq(vaultsRegistryAddress)
  })
})
