import { StructuredIndexedPortfolio } from 'build/types'
import { BigNumber, Wallet } from 'ethers'
import { calculateInterest } from 'utils/calculateInterest'
import { calculateWaterfallWithoutFees } from './calculateWaterfallWithoutFees'
import { getProtocolConfigFromPortfolio } from './getProtocolConfigFromPortfolio'
import { getTranchesFromPortfolio } from './getTranchesFromPortfolio'

export async function calculateWaterfallFees(portfolio: StructuredIndexedPortfolio, values: BigNumber[], timeElapsed: number, _totalAssets?: BigNumber) {
  const signer = portfolio.signer as Wallet

  const waterfall = await calculateWaterfallWithoutFees(portfolio, values, timeElapsed, _totalAssets)
  const tranches = await getTranchesFromPortfolio(portfolio, signer)
  const protocolConfig = await getProtocolConfigFromPortfolio(portfolio, signer)
  const protocolFeeRate = (await protocolConfig['protocolFeeRate()']()).toNumber()

  const fees: BigNumber[] = []
  for (let i = 0; i < waterfall.length; i++) {
    const trancheValue = waterfall[i]
    const trancheFeeRate = (await tranches[i].managerFeeRate()).toNumber()
    const trancheFee = calculateInterest(trancheFeeRate, timeElapsed, trancheValue).add(calculateInterest(protocolFeeRate, timeElapsed, trancheValue))
    fees.push(trancheFee)
  }
  return fees
}
