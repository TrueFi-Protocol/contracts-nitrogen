import { Wallet } from 'ethers'

import { ProtocolConfigDeployParams } from 'fixtures/types'

export function getProtocolConfigDeployParams(wallet: Wallet): ProtocolConfigDeployParams {
  return {
    defaultProtocolFeeRate: 0,
    protocolAdminAddress: wallet.address,
    protocolTreasuryAddress: Wallet.createRandom().address,
    pauserAddress: wallet.address,
  }
}
