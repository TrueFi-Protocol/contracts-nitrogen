import { expect, use } from 'chai'
import { solidity } from 'ethereum-waffle'
import { describe, it } from 'mocha'

import { structuredIndexedPortfolioFixture } from 'fixtures/structuredIndexedPortfolioFixture'
import { setupFixtureLoader } from 'test/setup'
import { getHalfPortfolioDuration } from 'utils/getHalfPortfolioDuration'
import { startAndGetTimestamp } from 'utils/startAndGetTimestamp'
import { setNextBlockTimestamp } from 'utils/timeTravel'

use(solidity)

describe('StructuredIndexedPortfolio.unregister', () => {
  const loadFixture = setupFixtureLoader()

  it('when not paused only', async () => {
    const { portfolio } = await loadFixture(structuredIndexedPortfolioFixture)
    await portfolio.pause()
    await expect(portfolio.close()).to.be.revertedWith('Pausable: paused')
  })

  it('only manager', async () => {
    const { portfolio, other, mockErc4626Vault } = await loadFixture(structuredIndexedPortfolioFixture)
    await expect(portfolio.connect(other).unregister(mockErc4626Vault.address))
      .to.be.revertedWith('SIP: Only manager')
  })

  it('not registered', async () => {
    const { portfolio, mockErc4626Vault } = await loadFixture(structuredIndexedPortfolioFixture)
    await portfolio.start()
    await expect(portfolio.unregister(mockErc4626Vault.address))
      .to.be.revertedWith('SIP: Investment not registered')
  })

  it('removes investment', async () => {
    const { portfolio, vaultsRegistry, mockErc4626Vault } = await loadFixture(structuredIndexedPortfolioFixture)

    await vaultsRegistry.addVault(mockErc4626Vault.address)
    await portfolio.start()
    await portfolio.register(mockErc4626Vault.address)

    await portfolio.unregister(mockErc4626Vault.address)

    expect(await portfolio.getInvestments()).to.deep.eq([])
  })

  it('updates checkpoint', async () => {
    const { portfolio, mockErc4626Vault, vaultsRegistry, tranches } = await loadFixture(structuredIndexedPortfolioFixture)
    const timeElapsed = await getHalfPortfolioDuration(portfolio)

    await vaultsRegistry.addVault(mockErc4626Vault.address)
    const startTimestamp = await startAndGetTimestamp(portfolio)
    await portfolio.register(mockErc4626Vault.address)

    const unregisterTimestamp = startTimestamp + timeElapsed
    await setNextBlockTimestamp(unregisterTimestamp)
    await portfolio.unregister(mockErc4626Vault.address)

    const checkpoint = await tranches[0].getCheckpoint()
    await expect(checkpoint.timestamp).to.eq(unregisterTimestamp)
  })

  it('emits event', async () => {
    const { portfolio, vaultsRegistry, mockErc4626Vault } = await loadFixture(structuredIndexedPortfolioFixture)

    await vaultsRegistry.addVault(mockErc4626Vault.address)
    await portfolio.start()
    await portfolio.register(mockErc4626Vault.address)

    await expect(portfolio.unregister(mockErc4626Vault.address))
      .to.emit(portfolio, 'InvestmentUnregistered')
      .withArgs(mockErc4626Vault.address)
  })
})
