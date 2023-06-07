import { StructuredIndexedPortfolio, MockToken } from 'build/types'
import { BigNumberish, Wallet } from 'ethers'
import { approveAndDepositToTranche, getTranchesFromPortfolio } from 'fixtures/utils'

export const depositToTranches = async (token: MockToken, portfolio: StructuredIndexedPortfolio, amounts: BigNumberish[], wallet: Wallet) => {
  const tranches = await getTranchesFromPortfolio(portfolio, wallet)
  for (let i = 0; i < tranches.length; i++) {
    await approveAndDepositToTranche(tranches[i], token, amounts[i], wallet)
  }
}
