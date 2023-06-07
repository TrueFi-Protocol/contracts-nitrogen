import { expect } from 'chai'
import { setupFixtureLoader } from 'test/setup'
import { structuredIndexedPortfolioFixture } from 'fixtures/structuredIndexedPortfolioFixture'
import { TestUpgradeable__factory } from 'contracts'
import { accessControlMissingRoleRevertMessage, extractImplementationAddress } from 'utils'

describe('Upgradeable.upgradeTo', () => {
  const loadFixture = setupFixtureLoader()

  it('performs upgrade', async () => {
    const { upgradeable, wallet } = await loadFixture(structuredIndexedPortfolioFixture)

    const newImplementation = await new TestUpgradeable__factory(wallet).deploy()
    await upgradeable.upgradeTo(newImplementation.address)
    const proxyImplementationAddress = await extractImplementationAddress(upgradeable)

    expect(proxyImplementationAddress).to.eq(newImplementation.address)
  })

  it('reverts if not called by default admin', async () => {
    const { upgradeable, other, DEFAULT_ADMIN_ROLE } = await loadFixture(structuredIndexedPortfolioFixture)

    const newImplementation = await new TestUpgradeable__factory(other).deploy()

    await expect(upgradeable.connect(other).upgradeTo(newImplementation.address))
      .to.be.revertedWith(accessControlMissingRoleRevertMessage(other, DEFAULT_ADMIN_ROLE))
  })
})
