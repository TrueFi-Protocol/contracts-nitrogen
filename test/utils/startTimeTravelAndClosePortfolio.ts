import { StructuredIndexedPortfolio } from 'build/types'
import { setNextBlockTimestamp } from './timeTravel'

export const startTimeTravelAndClosePortfolio = async (portfolio: StructuredIndexedPortfolio) => {
  await portfolio.start()
  const portfolioEndDate = (await portfolio.endDate()).toNumber()
  const closeTxTimestamp = portfolioEndDate + 1
  await setNextBlockTimestamp(closeTxTimestamp)
  await portfolio.close()

  return closeTxTimestamp
}
