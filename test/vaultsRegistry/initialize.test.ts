import { expect, use } from 'chai'
import { solidity } from 'ethereum-waffle'
import { setupFixtureLoader } from 'test/setup'
import { structuredIndexedPortfolioFixture } from 'fixtures/structuredIndexedPortfolioFixture'
import { DEFAULT_ADMIN_ROLE, LIST_ADMIN_ROLE, PAUSER_ROLE } from 'utils/constants'

use(solidity)

describe('VaultsRegistry.initialize', () => {
  const loadFixture = setupFixtureLoader()

  it('sets creator as admin', async () => {
    const { vaultsRegistry, wallet } = await loadFixture(structuredIndexedPortfolioFixture)
    expect(await vaultsRegistry.getRoleMember(DEFAULT_ADMIN_ROLE, 0)).to.eq(wallet.address)
  })

  it('sets creator as pauser', async () => {
    const { vaultsRegistry, wallet } = await loadFixture(structuredIndexedPortfolioFixture)
    expect(await vaultsRegistry.hasRole(PAUSER_ROLE, wallet.address)).to.be.true
  })

  it('DEFAULT_ADMIN_ROLE is admin of LIST_ADMIN_ROLE', async () => {
    const { vaultsRegistry } = await loadFixture(structuredIndexedPortfolioFixture)
    expect(await vaultsRegistry.getRoleAdmin(LIST_ADMIN_ROLE)).to.eq(DEFAULT_ADMIN_ROLE)
  })
})
