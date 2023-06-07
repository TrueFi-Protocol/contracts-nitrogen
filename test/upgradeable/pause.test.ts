import { expect } from 'chai'
import { setupFixtureLoader } from 'test/setup'
import { structuredIndexedPortfolioFixture } from 'fixtures/structuredIndexedPortfolioFixture'
import { accessControlMissingRoleRevertMessage } from 'utils'

describe('Upgradeable.pause', () => {
  const loadFixture = setupFixtureLoader()

  it('reverts when already paused', async () => {
    const { upgradeable, wallet } = await loadFixture(structuredIndexedPortfolioFixture)
    const pauser = wallet

    await upgradeable.connect(pauser).pause()

    await expect(upgradeable.connect(pauser).pause()).to.be.revertedWith('Pausable: paused')
  })

  it('reverts whenNotPaused functions', async () => {
    const { upgradeable, wallet } = await loadFixture(structuredIndexedPortfolioFixture)
    const pauser = wallet

    await upgradeable.connect(pauser).pause()

    await expect(upgradeable.falseWhenNotPaused()).to.be.revertedWith('Pausable: paused')
  })

  it('allows whenPaused functions', async () => {
    const { upgradeable, wallet } = await loadFixture(structuredIndexedPortfolioFixture)
    const pauser = wallet

    await upgradeable.connect(pauser).pause()

    expect(await upgradeable.trueWhenPaused()).to.be.true
  })

  it('reverts if not called by pauser', async () => {
    const { upgradeable, other, PAUSER_ROLE } = await loadFixture(structuredIndexedPortfolioFixture)

    await expect(upgradeable.connect(other).pause())
      .to.be.revertedWith(accessControlMissingRoleRevertMessage(other, PAUSER_ROLE))
  })
})
