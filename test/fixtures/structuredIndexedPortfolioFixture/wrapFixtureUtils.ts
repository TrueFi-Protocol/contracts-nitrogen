import { BigNumber, BigNumberish, Wallet } from 'ethers'
import { parseTokenUnits, setTranchesFeeRates } from 'fixtures/utils'
import { deployFixtureContracts } from './deployFixtureContracts'
import {
  approveAndDepositToTranche as _approveAndDepositToTranche,
  withdrawFromTranche as _withdrawFromTranche,
  depositToTranches as _depositToTranches,
  depositAndCalculateAssumedTranchesValue as _depositAndCalculateAssumedTranchesValue,
  depositAndCalculateWaterfallWithoutFees as _depositAndCalculateWaterfallWithoutFees,
} from 'fixtures/utils'
import { StructuredIndexedPortfolioStatus } from './structuredIndexedPortfolioFixture'
import { OmitFirstOne, OmitFirstTwo } from 'fixtures/types'
import { DepositController, TrancheVault, WithdrawController } from 'contracts'

export function wrapFixtureUtils(params: Awaited<ReturnType<typeof deployFixtureContracts>>) {
  const { portfolio, portfolioWithMockTranche, mockTrancheVault, tokenDecimals, token, protocolConfig } = params

  const parseMockToken = (amount: number) => parseTokenUnits(amount.toString(), tokenDecimals)

  const approveAndDepositToTranche = (tranche: TrancheVault, assets: BigNumberish, wallet: Wallet) => _approveAndDepositToTranche(tranche, token, assets, wallet)
  const withdrawFromTranche = _withdrawFromTranche

  const allowDepositsOnStatus = async (depositControllers: DepositController[], status: StructuredIndexedPortfolioStatus) => {
    for (const depositController of depositControllers) {
      await depositController.setDepositAllowed(true, status)
    }
  }

  const allowWithdrawalsOnStatus = async (withdrawControllers: WithdrawController[], status: StructuredIndexedPortfolioStatus) => {
    for (const withdrawController of withdrawControllers) {
      await withdrawController.setWithdrawAllowed(true, status)
    }
  }

  const increasePortfolioWithMockTrancheBalance = async (assets: BigNumber) => {
    await token.transfer(portfolioWithMockTranche.address, assets)
    await mockTrancheVault.increaseVirtualTokenBalance(assets)
  }

  const depositToTranches = (...args: OmitFirstOne<Parameters<typeof _depositToTranches>>) => _depositToTranches(token, ...args)

  const depositAndCalculateAssumedTranchesValue = (...args: OmitFirstTwo<Parameters<typeof _depositAndCalculateAssumedTranchesValue>>) => _depositAndCalculateAssumedTranchesValue(portfolio, token, ...args)

  const depositAndCalculateWaterfallWithoutFees = (...args: OmitFirstTwo<Parameters<typeof _depositAndCalculateWaterfallWithoutFees>>) => _depositAndCalculateWaterfallWithoutFees(portfolio, token, ...args)

  const setProtocolAndTranchesFeeRates = async (tranches: TrancheVault[], protocolFeeRate: number, tranchesFeeRates: number[]) => {
    await protocolConfig.setDefaultProtocolFeeRate(protocolFeeRate)
    await setTranchesFeeRates(tranches, tranchesFeeRates)
  }

  return {
    parseMockToken,
    approveAndDepositToTranche,
    withdrawFromTranche,
    allowDepositsOnStatus,
    allowWithdrawalsOnStatus,
    increasePortfolioWithMockTrancheBalance,
    depositToTranches,
    depositAndCalculateAssumedTranchesValue,
    depositAndCalculateWaterfallWithoutFees,
    setProtocolAndTranchesFeeRates,
  }
}
