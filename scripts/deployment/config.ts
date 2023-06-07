import { defaultAccounts } from 'ethereum-waffle'
import { Wallet } from 'ethers'

const ganacheDeployer = new Wallet(defaultAccounts[0].secretKey).address

interface ProtocolConfig {
  defaultProtocolFeeRate: number,
  protocolAdmin: string,
  protocolTreasury: string,
  pauserAddress: string,
}

interface Config {
  protocolConfig: Record<string, ProtocolConfig>,
}

export const config: Config = {
  protocolConfig: {
    ganache: {
      defaultProtocolFeeRate: 10,
      protocolAdmin: ganacheDeployer,
      protocolTreasury: ganacheDeployer,
      pauserAddress: ganacheDeployer,
    },
    mainnet: {
      defaultProtocolFeeRate: 50,
      protocolAdmin: '0x16cEa306506c387713C70b9C1205fd5aC997E78E',
      protocolTreasury: '0x2A5c94f3F00Db7f11D53D1CfbD9AE8A2Bbc7bBf0',
      pauserAddress: '0xf0aE09d3ABdF3641e2eB4cD45cf56873296a02CB',
    },
  },
}
