import { StructuredIndexedPortfolio } from 'build/types'
import { BigNumber } from 'ethers'
import { calculateAssumedTranchesValue } from 'fixtures/utils'

export async function calculateAssumedTranchesValuesAfterMultipleUpdates(
  portfolio: StructuredIndexedPortfolio,
  depositAmounts: BigNumber[],
  timeElapsed: number,
  numberOfUpdates = 1,
) {
  let assumedTranchesValues = depositAmounts
  for (let i = 0; i < numberOfUpdates; i++) {
    assumedTranchesValues = await calculateAssumedTranchesValue(
      portfolio,
      assumedTranchesValues,
      timeElapsed,
    )
  }

  return assumedTranchesValues
}
