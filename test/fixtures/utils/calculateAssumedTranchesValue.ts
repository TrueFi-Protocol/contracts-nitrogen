import { StructuredIndexedPortfolio } from 'contracts'
import { BigNumber } from 'ethers'
import { calculateInterest } from 'utils'

export function calculateAssumedTranchesValue(portfolio: StructuredIndexedPortfolio, values: BigNumber[], timeElapsed: number) {
  const calculateAssumedTrancheValue = async (value: BigNumber, trancheId: number) => {
    const trancheData = await portfolio.tranchesData(trancheId)
    const interest = calculateInterest(trancheData.targetApy.toNumber(), timeElapsed, value)
    return value.add(interest)
  }

  return Promise.all(values.map(calculateAssumedTrancheValue))
}
