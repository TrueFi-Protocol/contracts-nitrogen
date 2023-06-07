import { expect, use } from 'chai'
import { solidity } from 'ethereum-waffle'
import { structuredIndexedPortfolioFixture } from 'fixtures/structuredIndexedPortfolioFixture'
import { setupFixtureLoader } from 'test/setup'

use(solidity)

describe('StructuredIndexedPortfolio.updateCheckpoints', () => {
  const loadFixture = setupFixtureLoader()

  it('capitalFormation', async () => {
    const { portfolio } = await loadFixture(structuredIndexedPortfolioFixture)
    await expect(portfolio.updateCheckpoints()).to.be.revertedWith('SIP: No checkpoints before start')
  })
})
