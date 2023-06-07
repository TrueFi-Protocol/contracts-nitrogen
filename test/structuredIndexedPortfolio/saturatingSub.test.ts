import { expect, use } from 'chai'
import { solidity } from 'ethereum-waffle'
import { structuredIndexedPortfolioFixture } from 'fixtures/structuredIndexedPortfolioFixture'
import { setupFixtureLoader } from 'test/setup'

use(solidity)

describe('StructuredIndexedPortfolio.saturatingSub', () => {
  const loadFixture = setupFixtureLoader()

  it('x bigger', async () => {
    const { portfolio } = await loadFixture(structuredIndexedPortfolioFixture)
    expect(await portfolio.saturatingSub(10, 6)).to.eq(4)
  })

  it('x smaller', async () => {
    const { portfolio } = await loadFixture(structuredIndexedPortfolioFixture)
    expect(await portfolio.saturatingSub(15, 40)).to.eq(0)
  })

  it('x equal', async () => {
    const { portfolio } = await loadFixture(structuredIndexedPortfolioFixture)
    expect(await portfolio.saturatingSub(11, 11)).to.eq(0)
  })
})
