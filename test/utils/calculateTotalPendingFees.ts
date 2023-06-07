import { Zero } from '@ethersproject/constants'
import { BigNumber } from 'ethers'
import { calculateInterest } from 'utils'

export function calculateTotalPendingFees(tranchesValues: BigNumber[], protocolFeeRate: number, tranchesFeeRates: number[], timeElapsed: number) {
  return tranchesValues.reduce((totalPendingFees, trancheValue, idx) => {
    const protocolFee = calculateInterest(protocolFeeRate, timeElapsed, trancheValue)
    const managerFee = calculateInterest(tranchesFeeRates[idx], timeElapsed, trancheValue)
    let sum = protocolFee.add(managerFee)
    if (idx !== 0) {
      sum = sum.gt(trancheValue) ? trancheValue : sum
    }
    return totalPendingFees.add(sum)
  }, Zero)
}
