import { TrancheVault, MockToken } from 'contracts'
import { BigNumberish, Wallet } from 'ethers'

export async function approveAndDepositToTranche(tranche: TrancheVault, token: MockToken, assets: BigNumberish, wallet: Wallet) {
  await token.connect(wallet).approve(tranche.address, assets)
  return tranche.connect(wallet).deposit(assets, wallet.address)
}

export function withdrawFromTranche(tranche: TrancheVault, shares: BigNumberish, wallet: Wallet) {
  return tranche.withdraw(shares, wallet.address, wallet.address)
}
