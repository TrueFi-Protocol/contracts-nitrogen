import { expect } from 'chai'
import { setupFixtureLoader } from 'test/setup'
import { structuredIndexedPortfolioFixture } from 'fixtures/structuredIndexedPortfolioFixture'
import { accessControlMissingRoleRevertMessage } from 'utils'

describe('Upgradeable.unpause', () => {
  const loadFixture = setupFixtureLoader()

  it('reverts when already not paused', async () => {
    const { upgradeable, wallet } = await loadFixture(structuredIndexedPortfolioFixture)
    const pauser = wallet

    await expect(upgradeable.connect(pauser).unpause()).to.be.revertedWith('Pausable: not paused')
  })

  it('allows whenNotPaused functions', async () => {
    const { upgradeable, wallet } = await loadFixture(structuredIndexedPortfolioFixture)
    const pauser = wallet

    await upgradeable.connect(pauser).pause()
    await upgradeable.connect(pauser).unpause()

    expect(await upgradeable.falseWhenNotPaused()).to.be.false
  })

  it('reverts whenPaused functions', async () => {
    const { upgradeable, wallet } = await loadFixture(structuredIndexedPortfolioFixture)
    const pauser = wallet

    await upgradeable.connect(pauser).pause()
    await upgradeable.connect(pauser).unpause()

    await expect(upgradeable.trueWhenPaused()).to.be.revertedWith('Pausable: not paused')
  })

  it('reverts if not called by pauser', async () => {
    const { upgradeable, wallet, other, PAUSER_ROLE } = await loadFixture(structuredIndexedPortfolioFixture)
    const pauser = wallet

    await upgradeable.connect(pauser).pause()
    await expect(upgradeable.connect(other).unpause())
      .to.be.revertedWith(accessControlMissingRoleRevertMessage(other, PAUSER_ROLE))
  })
})
