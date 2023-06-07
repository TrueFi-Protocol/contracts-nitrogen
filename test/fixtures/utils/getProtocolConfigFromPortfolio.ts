import { Wallet } from 'ethers'

import { ProtocolConfig__factory, StructuredIndexedPortfolio } from 'contracts'

export async function getProtocolConfigFromPortfolio(portfolio: StructuredIndexedPortfolio, wallet: Wallet) {
  const protocolConfig = await portfolio.protocolConfig()
  return new ProtocolConfig__factory(wallet).attach(protocolConfig)
}
