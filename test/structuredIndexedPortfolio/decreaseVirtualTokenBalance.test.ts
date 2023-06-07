import { expect, use } from 'chai'
import { solidity } from 'ethereum-waffle'
import { structuredIndexedPortfolioFixture } from 'fixtures/structuredIndexedPortfolioFixture'
import { setupFixtureLoader } from 'test/setup'

use(solidity)

describe('StructuredIndexedPortfolio.decreaseVirtualTokenBalance', () => {
  const loadFixture = setupFixtureLoader()

  it('decreases virtual token balance', async () => {
    const { portfolioWithMockTranche, mockTrancheVault } = await loadFixture(structuredIndexedPortfolioFixture)

    await mockTrancheVault.increaseVirtualTokenBalance(100)
    await mockTrancheVault.decreaseVirtualTokenBalance(10)

    expect(await portfolioWithMockTranche.virtualTokenBalance()).to.eq(90)
  })

  it('reverts when called by non tranche', async () => {
    const { portfolioWithMockTranche } = await loadFixture(structuredIndexedPortfolioFixture)
    await expect(portfolioWithMockTranche.decreaseVirtualTokenBalance(10)).to.be.revertedWith('SIP: Not a tranche')
  })

  it('reverts when decreasing below 0', async () => {
    const { mockTrancheVault } = await loadFixture(structuredIndexedPortfolioFixture)
    await expect(mockTrancheVault.decreaseVirtualTokenBalance(10)).to.be.revertedWith('panic code 0x11')
  })
})
