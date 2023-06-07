import { Wallet } from 'ethers'

import { TestUpgradeable__factory } from 'contracts'
import { deployBehindProxy } from 'utils/deployBehindProxy'

export async function deployTestUpgradeable(wallet: Wallet) {
  const upgradeable = await deployBehindProxy(new TestUpgradeable__factory(wallet), wallet.address)
  const DEFAULT_ADMIN_ROLE = await upgradeable.DEFAULT_ADMIN_ROLE()
  const PAUSER_ROLE = await upgradeable.PAUSER_ROLE()

  return { upgradeable, DEFAULT_ADMIN_ROLE, PAUSER_ROLE }
}
