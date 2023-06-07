import { TrancheVault } from 'build/types'
import { BigNumber } from 'ethers'
import { subtractFees } from './subtractFees'

export function calculateTranchesValuesAfterFees(tranches: TrancheVault[], tranchesFeeRates: number[], tranchesValues: BigNumber[], protocolFeeRate: number, timeElapsed: number) {
  const valuesAfterFees: BigNumber[] = []
  for (let i = 0; i < tranches.length; i++) {
    valuesAfterFees.push(subtractFees(tranchesValues[i], timeElapsed, protocolFeeRate, tranchesFeeRates[i]))
  }
  return valuesAfterFees
}
