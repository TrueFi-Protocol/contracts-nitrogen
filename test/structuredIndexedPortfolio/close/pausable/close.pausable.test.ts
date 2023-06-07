import { expect, use } from 'chai'
import { solidity } from 'ethereum-waffle'
import { structuredIndexedPortfolioFixture } from 'fixtures/structuredIndexedPortfolioFixture'
import { setupFixtureLoader } from 'test/setup'

use(solidity)

describe('StructuredIndexedPortfolio.close.pausable', () => {
  const loadFixture = setupFixtureLoader()

  it('when not paused only', async () => {
    const { portfolio } = await loadFixture(structuredIndexedPortfolioFixture)
    await portfolio.pause()
    await expect(portfolio.close()).to.be.revertedWith('Pausable: paused')
  })
})
