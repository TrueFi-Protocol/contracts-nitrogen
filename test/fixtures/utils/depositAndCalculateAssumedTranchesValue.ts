import { MockToken, StructuredIndexedPortfolio } from 'contracts'
import { BigNumber, Wallet } from 'ethers'
import { depositToTranches, calculateAssumedTranchesValue } from 'fixtures/utils'

export const depositAndCalculateAssumedTranchesValue = async (portfolio: StructuredIndexedPortfolio, token: MockToken, amounts: BigNumber[], wallet: Wallet, timeElapsed: number) => {
  await depositToTranches(token, portfolio, amounts, wallet)
  const assumedTranchesValues = await calculateAssumedTranchesValue(portfolio, amounts, timeElapsed)
  return assumedTranchesValues
}
