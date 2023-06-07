import { BigNumber } from 'ethers'
import { ONE_HUNDRED_PERCENT_IN_BIPS, ONE_YEAR_IN_SECONDS } from 'utils'

export function calculateInterest(targetAPY: number, timeElapsed: number, amount: BigNumber) {
  return amount.mul(timeElapsed).mul(targetAPY).div(ONE_YEAR_IN_SECONDS).div(ONE_HUNDRED_PERCENT_IN_BIPS)
}
