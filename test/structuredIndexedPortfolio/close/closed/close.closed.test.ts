import { expect, use } from 'chai'
import { solidity } from 'ethereum-waffle'
import { describe, it } from 'mocha'

import { structuredIndexedPortfolioFixture } from 'fixtures/structuredIndexedPortfolioFixture'
import { setupFixtureLoader } from 'test/setup'

use(solidity)

describe('StructuredIndexedPortfolio.close.closed', () => {
  const loadFixture = setupFixtureLoader()

  it('already closed', async () => {
    const { portfolio } = await loadFixture(structuredIndexedPortfolioFixture)
    await portfolio.close()
    await expect(portfolio.close())
      .to.be.revertedWith('SIP: Portfolio already closed')
  })
})
