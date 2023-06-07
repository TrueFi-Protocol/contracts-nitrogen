import { StructuredIndexedPortfolio } from 'build/types'
import { timeTravelTo } from './timeTravel'

export const startAndTimeTravelPastEndDate = async (portfolio: StructuredIndexedPortfolio) => {
  await portfolio.start()
  const portfolioEndDate = (await portfolio.endDate()).toNumber()
  await timeTravelTo(portfolioEndDate + 1)
  return portfolioEndDate + 1
}
