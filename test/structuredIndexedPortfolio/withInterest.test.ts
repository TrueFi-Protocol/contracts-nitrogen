import { expect, use } from 'chai'
import { solidity } from 'ethereum-waffle'
import { structuredIndexedPortfolioFixture } from 'fixtures/structuredIndexedPortfolioFixture'
import { setupFixtureLoader } from 'test/setup'
import { ONE_YEAR_IN_SECONDS, percentToBips } from 'utils'

use(solidity)

describe('StructuredIndexedPortfolio.withInterest', () => {
  const loadFixture = setupFixtureLoader()

  it('timePassed 0', async () => {
    const { portfolio } = await loadFixture(structuredIndexedPortfolioFixture)
    expect(await portfolio.withInterest(100, percentToBips(3), 0)).to.eq(100)
  })

  it('timePassed year/2', async () => {
    const { portfolio } = await loadFixture(structuredIndexedPortfolioFixture)
    expect(await portfolio.withInterest(100, percentToBips(3), ONE_YEAR_IN_SECONDS / 2)).to.eq(101)
  })

  it('timePassed year', async () => {
    const { portfolio } = await loadFixture(structuredIndexedPortfolioFixture)
    expect(await portfolio.withInterest(100, percentToBips(3), ONE_YEAR_IN_SECONDS)).to.eq(103)
  })

  it('targetApy 0', async () => {
    const { portfolio } = await loadFixture(structuredIndexedPortfolioFixture)
    expect(await portfolio.withInterest(100, 0, ONE_YEAR_IN_SECONDS)).to.eq(100)
  })

  it('targetApy non-zero', async () => {
    const { portfolio } = await loadFixture(structuredIndexedPortfolioFixture)
    expect(await portfolio.withInterest(100, percentToBips(5), ONE_YEAR_IN_SECONDS)).to.eq(105)
  })

  it('initialValue 0', async () => {
    const { portfolio } = await loadFixture(structuredIndexedPortfolioFixture)
    expect(await portfolio.withInterest(0, percentToBips(5), ONE_YEAR_IN_SECONDS)).to.eq(0)
  })

  it('rounds down', async () => {
    const { portfolio } = await loadFixture(structuredIndexedPortfolioFixture)
    expect(await portfolio.withInterest(10, percentToBips(5), ONE_YEAR_IN_SECONDS)).to.eq(10)
  })
})
