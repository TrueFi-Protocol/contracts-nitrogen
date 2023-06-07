import { Wallet } from 'ethers'

import { MockToken, MockTrancheVault__factory } from 'build/types'

export async function deployMockTrancheVault(wallet: Wallet, token: MockToken) {
  const mockTrancheVault = await new MockTrancheVault__factory(wallet).deploy(token.address)
  return mockTrancheVault
}
