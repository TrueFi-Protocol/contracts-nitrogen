import { BigNumber, Wallet } from 'ethers'

import { MockToken, ProtocolConfig, VaultsRegistry } from 'build/types'
import { TrancheInitDataStruct } from 'build/types/StructuredIndexedPortfolio'
import { AwaitedValueObject, StructuredIndexedPortfolioDeployParams } from 'fixtures/types'
import { MONTH_IN_SECONDS, WEEK_IN_SECONDS } from 'utils/units'

export const getDefaultPortfolioParams = () => ({
  name: 'Test Structured Indexed Portfolio',
  duration: MONTH_IN_SECONDS,
  capitalFormationPeriod: WEEK_IN_SECONDS,
  minimumSize: 0,
})

export const getDefaultExpectedEquityRate = () => ({ from: BigNumber.from(0), to: BigNumber.from(100) })

export function getStructuredIndexedPortfolioDeployParams(
  wallet: Wallet,
  token: MockToken,
  protocolConfig: ProtocolConfig,
  vaultsRegistry: VaultsRegistry,
  trancheInitData: AwaitedValueObject<TrancheInitDataStruct>[],
): StructuredIndexedPortfolioDeployParams {
  const portfolioParams = getDefaultPortfolioParams()
  const expectedEquityRate = getDefaultExpectedEquityRate()

  return {
    managerAddress: wallet.address,
    assetAddress: token.address,
    protocolConfigAddress: protocolConfig.address,
    vaultsRegistryAddress: vaultsRegistry.address,
    portfolioParams,
    trancheInitData,
    expectedEquityRate,
  }
}
