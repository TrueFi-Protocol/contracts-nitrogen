import { MockToken, StructuredIndexedPortfolio } from 'contracts'
import { BigNumber, Wallet } from 'ethers'
import { depositToTranches, calculateWaterfallWithoutFees } from 'fixtures/utils'

export const depositAndCalculateWaterfallWithoutFees = async (portfolio: StructuredIndexedPortfolio, token: MockToken, amounts: BigNumber[], wallet: Wallet, timeElapsed: number) => {
  await depositToTranches(token, portfolio, amounts, wallet)
  const waterfall = await calculateWaterfallWithoutFees(portfolio, amounts, timeElapsed)
  return waterfall
}
