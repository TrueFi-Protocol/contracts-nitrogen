import { expect, use } from 'chai'
import { solidity } from 'ethereum-waffle'
import { structuredIndexedPortfolioFixture } from 'fixtures/structuredIndexedPortfolioFixture'
import { setupFixtureLoader } from 'test/setup'
import { timeTravelTo } from 'utils/timeTravel'

use(solidity)

describe('StructuredIndexedPortfolio.limitedBlockTimestamp', () => {
  const loadFixture = setupFixtureLoader()

  it('endDate bigger', async () => {
    const { portfolio } = await loadFixture(structuredIndexedPortfolioFixture)

    await portfolio.start()
    const portfolioEndDate = (await portfolio.endDate()).toNumber()

    await timeTravelTo(portfolioEndDate - 1)

    expect(await portfolio.limitedBlockTimestamp()).to.eq(portfolioEndDate - 1)
  })

  it('endDate equal', async () => {
    const { portfolio } = await loadFixture(structuredIndexedPortfolioFixture)

    await portfolio.start()
    const portfolioEndDate = (await portfolio.endDate()).toNumber()

    await timeTravelTo(portfolioEndDate)

    expect(await portfolio.limitedBlockTimestamp()).to.eq(portfolioEndDate)
  })

  it('endDate smaller', async () => {
    const { portfolio } = await loadFixture(structuredIndexedPortfolioFixture)

    await portfolio.start()
    const portfolioEndDate = (await portfolio.endDate()).toNumber()

    await timeTravelTo(portfolioEndDate + 1)

    expect(await portfolio.limitedBlockTimestamp()).to.eq(portfolioEndDate)
  })
})
