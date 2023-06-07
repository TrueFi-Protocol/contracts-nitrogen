import { Wallet } from 'ethers'

import { MockToken__factory } from 'build/types'

export async function deployMockToken(wallet: Wallet, decimals: number) {
  const token = await new MockToken__factory(wallet).deploy(decimals)
  return token
}
