import { StructuredIndexedPortfolio } from 'build/types'
import { getTxTimestamp } from './getTxTimestamp'

export async function startAndGetTimestamp(portfolio:StructuredIndexedPortfolio) {
  const tx = await portfolio.start()
  return getTxTimestamp(tx)
}
