import { expect, use } from 'chai'
import { solidity } from 'ethereum-waffle'
import { structuredIndexedPortfolioFixture } from 'fixtures/structuredIndexedPortfolioFixture'
import { setupFixtureLoader } from 'test/setup'

use(solidity)

describe('StructuredIndexedPortfolio.min', () => {
  const loadFixture = setupFixtureLoader()

  it('x bigger', async () => {
    const { portfolio } = await loadFixture(structuredIndexedPortfolioFixture)
    expect(await portfolio.min(3, 2)).to.eq(2)
  })

  it('x smaller', async () => {
    const { portfolio } = await loadFixture(structuredIndexedPortfolioFixture)
    expect(await portfolio.min(1, 2)).to.eq(1)
  })

  it('x equal', async () => {
    const { portfolio } = await loadFixture(structuredIndexedPortfolioFixture)
    expect(await portfolio.min(1, 1)).to.eq(1)
  })
})
