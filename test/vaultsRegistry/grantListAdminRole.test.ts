import { expect, use } from 'chai'
import { solidity } from 'ethereum-waffle'
import { structuredIndexedPortfolioFixture } from 'fixtures/structuredIndexedPortfolioFixture'
import { setupFixtureLoader } from 'test/setup'
import { accessControlMissingRoleRevertMessage } from 'utils/accessControlRevertMessage'
import { DEFAULT_ADMIN_ROLE, LIST_ADMIN_ROLE } from 'utils/constants'

use(solidity)

describe('VaultsRegistry.grantListAdminRole', () => {
  const loadFixture = setupFixtureLoader()

  it('reverts if called by non default admin', async () => {
    const { vaultsRegistry, other } = await loadFixture(structuredIndexedPortfolioFixture)
    await expect(vaultsRegistry.connect(other).grantRole(LIST_ADMIN_ROLE, other.address))
      .to.be.revertedWith(accessControlMissingRoleRevertMessage(other.address, DEFAULT_ADMIN_ROLE))
  })

  it('grants list admin role', async () => {
    const { vaultsRegistry, other } = await loadFixture(structuredIndexedPortfolioFixture)
    await vaultsRegistry.grantRole(LIST_ADMIN_ROLE, other.address)
    expect(await vaultsRegistry.hasRole(LIST_ADMIN_ROLE, other.address)).to.be.true
  })
})
