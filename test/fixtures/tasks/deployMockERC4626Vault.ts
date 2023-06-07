import { Wallet } from 'ethers'

import { MockERC4626Vault__factory, MockToken } from 'contracts'

export async function deployMockERC4626Vault(wallet: Wallet, token: MockToken) {
  const mockErc4626Vault = await new MockERC4626Vault__factory(wallet).deploy(token.address)
  return mockErc4626Vault
}
