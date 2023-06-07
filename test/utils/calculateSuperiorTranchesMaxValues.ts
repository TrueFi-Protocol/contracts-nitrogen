import { BigNumber, BigNumberish } from 'ethers'
import { calculateTrancheMaxValue } from '.'

export function calculateSuperiorTranchesMaxValues(equityTrancheValue: BigNumber, minSubordinateRatios: BigNumberish[]): BigNumber[] {
  let subordinateTranchesValue = equityTrancheValue
  const superiorTranchesMaxValues = []

  for (let i = 1; i < minSubordinateRatios.length; i++) {
    const minSubordinateRatio = minSubordinateRatios[i]
    const trancheMaxValue = calculateTrancheMaxValue(subordinateTranchesValue, minSubordinateRatio)
    subordinateTranchesValue = subordinateTranchesValue.add(trancheMaxValue)
    superiorTranchesMaxValues.push(trancheMaxValue)
  }

  return superiorTranchesMaxValues
}
