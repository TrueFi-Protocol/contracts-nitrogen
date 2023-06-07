import { StructuredIndexedPortfolio } from 'build/types'

export async function getTranchesData(portfolio: StructuredIndexedPortfolio) {
  const tranches = await portfolio.getTranches()
  const getTrancheData = (_: any, trancheIndex: number) => portfolio.tranchesData(trancheIndex)
  return Promise.all(tranches.map(getTrancheData))
}
