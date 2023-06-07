import { expect, use } from 'chai'
import { solidity } from 'ethereum-waffle'
import { structuredIndexedPortfolioFixture } from 'fixtures/structuredIndexedPortfolioFixture'
import { setupFixtureLoader } from 'test/setup'

use(solidity)

describe('StructuredIndexedPortfolio.increaseVirtualTokenBalance', () => {
  const loadFixture = setupFixtureLoader()

  it('increases virtual token balance', async () => {
    const { portfolioWithMockTranche, mockTrancheVault } = await loadFixture(structuredIndexedPortfolioFixture)
    await mockTrancheVault.increaseVirtualTokenBalance(10)
    expect(await portfolioWithMockTranche.virtualTokenBalance()).to.eq(10)
  })

  it('reverts when called by non tranche', async () => {
    const { portfolioWithMockTranche } = await loadFixture(structuredIndexedPortfolioFixture)
    await expect(portfolioWithMockTranche.increaseVirtualTokenBalance(10)).to.be.revertedWith('SIP: Not a tranche')
  })
})
