import { BigNumber, BigNumberish } from 'ethers'
import { ONE_HUNDRED_PERCENT_IN_BIPS } from './constants'

export function calculateTrancheMaxValue(subordinateTranchesValue: BigNumber, minSubordinateRatio: BigNumberish): BigNumber {
  return subordinateTranchesValue.div(minSubordinateRatio).mul(ONE_HUNDRED_PERCENT_IN_BIPS)
}
