import { Zero } from '@ethersproject/constants'
import { BigNumber } from 'ethers'
import { calculateInterest } from 'utils'

export function subtractFees(amount: BigNumber, timeElapsed: number, ...feeRates: number[]) {
  const fees = feeRates.reduce((sum, feeRate) =>
    sum.add(calculateInterest(feeRate, timeElapsed, amount),
    ), Zero)
  return amount.sub(fees)
}
