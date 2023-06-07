import { StructuredIndexedPortfolio } from 'build/types'
import { BigNumber, Wallet } from 'ethers'
import { calculateWaterfallWithoutFees, getProtocolConfigFromPortfolio, getTranchesFromPortfolio } from 'fixtures/utils'
import { calculateTranchesValuesAfterFees } from './calculateTranchesValuesAfterFees'

export async function calculateTranchesValuesAfterTime(portfolio: StructuredIndexedPortfolio, values: BigNumber[], timeElapsed: number, _totalAssets?: BigNumber) {
  const signer = portfolio.signer as Wallet
  const tranches = await getTranchesFromPortfolio(portfolio, signer)
  const protocolConfig = await getProtocolConfigFromPortfolio(portfolio, signer)

  const protocolFeeRate = (await protocolConfig.defaultProtocolFeeRate()).toNumber()
  const tranchesFeeRates = []

  for (const tranche of tranches) {
    tranchesFeeRates.push((await tranche.managerFeeRate()).toNumber())
  }

  const waterfallAfterRegister = await calculateWaterfallWithoutFees(portfolio, values, timeElapsed, _totalAssets)
  return calculateTranchesValuesAfterFees(tranches, tranchesFeeRates, waterfallAfterRegister, protocolFeeRate, timeElapsed)
}
