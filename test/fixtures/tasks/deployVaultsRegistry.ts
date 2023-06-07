import { Wallet } from 'ethers'

import { VaultsRegistry__factory } from 'build/types'
import { deployBehindProxy } from 'utils/deployBehindProxy'

export async function deployVaultsRegistry(wallet: Wallet) {
  const vaultsRegistry = await deployBehindProxy(new VaultsRegistry__factory(wallet))
  return vaultsRegistry
}
