import { StructuredIndexedPortfolio } from 'build/types'
import { getTranchesData } from './getTranchesData'

export async function getDeficitCheckpoints(portfolio: StructuredIndexedPortfolio) {
  const tranchesData = await getTranchesData(portfolio)
  return tranchesData.map((trancheData) => trancheData.investmentsDeficitCheckpoint)
}
