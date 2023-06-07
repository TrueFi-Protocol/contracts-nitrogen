import { Zero } from '@ethersproject/constants'
import { StructuredIndexedPortfolio } from 'contracts'
import { BigNumber } from 'ethers'
import { calculateInterest } from 'utils'
import { sumArray } from 'utils'

export async function calculateWaterfallWithoutFees(portfolio: StructuredIndexedPortfolio, values: BigNumber[], timeElapsed: number, _totalAssets?: BigNumber) {
  const valuesAfterWaterfall = values.map(() => Zero)
  let totalAssets = _totalAssets ?? sumArray(values)
  for (let i = values.length - 1; i > 0; i--) {
    const trancheData = await portfolio.tranchesData(i)
    const interest = calculateInterest(trancheData.targetApy.toNumber(), timeElapsed, values[i])
    const assumedTrancheValue = values[i].add(interest)
    if (assumedTrancheValue.gte(totalAssets)) {
      valuesAfterWaterfall[i] = totalAssets
      return valuesAfterWaterfall
    }
    valuesAfterWaterfall[i] = assumedTrancheValue
    totalAssets = totalAssets.sub(assumedTrancheValue)
  }
  valuesAfterWaterfall[0] = totalAssets
  return valuesAfterWaterfall
}
