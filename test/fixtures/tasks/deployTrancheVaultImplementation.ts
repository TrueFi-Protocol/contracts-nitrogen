import { TrancheVault__factory } from 'contracts'
import { Wallet } from 'ethers'

export async function deployTrancheVaultImplementation(wallet: Wallet) {
  const trancheVaultImplementation = await new TrancheVault__factory(wallet).deploy()
  return trancheVaultImplementation
}
