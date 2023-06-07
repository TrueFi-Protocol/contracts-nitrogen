import { IndexedPortfoliosProtocolConfig } from 'contracts'
import { Wallet } from 'ethers'

export async function getProtocolConfigFeeRateForWallet(protocolConfig: IndexedPortfoliosProtocolConfig, wallet: Wallet) {
  return (await protocolConfig.functions['protocolFeeRate(address)'](wallet.address))[0]
}

export async function getProtocolConfigFeeRateForSender(protocolConfig: IndexedPortfoliosProtocolConfig, sender: Wallet) {
  return (await protocolConfig.connect(sender).functions['protocolFeeRate()']())[0]
}
