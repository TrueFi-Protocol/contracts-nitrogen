import { Wallet } from 'ethers'

import {
  IndexedPortfoliosProtocolConfig__factory as ProtocolConfig__factory,
} from 'build/types'
import { deployBehindProxy } from 'utils/deployBehindProxy'
import { ProtocolConfigDeployParams } from 'fixtures/types'

export async function deployProtocolConfig(wallet: Wallet, deployParams: ProtocolConfigDeployParams) {
  const protocolConfig = await deployBehindProxy(
    new ProtocolConfig__factory(wallet),
    deployParams.defaultProtocolFeeRate,
    deployParams.protocolAdminAddress,
    deployParams.protocolTreasuryAddress,
    deployParams.pauserAddress,
  )
  return protocolConfig
}
