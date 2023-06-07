import { contract } from 'ethereum-mars'

import { config } from '../config'
import { encodeInitializeCall, proxy } from '../utils'
import { IndexedPortfoliosProtocolConfig } from '../../../build/artifacts'
import { IndexedPortfoliosProtocolConfig__factory } from '../../../build/types'

export function deployProtocolConfig(networkName: string) {
  const {
    defaultProtocolFeeRate,
    protocolAdmin,
    protocolTreasury,
    pauserAddress,
  } = config.protocolConfig[networkName] ?? config.protocolConfig.mainnet

  const protocolConfigImplementation = contract(IndexedPortfoliosProtocolConfig)
  const initializeCallData = encodeInitializeCall(
    IndexedPortfoliosProtocolConfig__factory,
    defaultProtocolFeeRate,
    protocolAdmin,
    protocolTreasury,
    pauserAddress,
  )

  return proxy(protocolConfigImplementation, initializeCallData)
}
