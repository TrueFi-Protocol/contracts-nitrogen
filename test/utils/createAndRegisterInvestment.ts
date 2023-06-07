import { ERC20__factory, MockERC4626Vault__factory, StructuredIndexedPortfolio, VaultsRegistry__factory } from 'build/types'
import { BigNumberish, Wallet } from 'ethers'
import { getTxTimestamp } from './getTxTimestamp'

type PossibleFactories = MockERC4626Vault__factory

type ExtractContract<Factory> = Factory extends new(wallet: Wallet) => {deploy: (...args) => Promise<infer Contract>} ? Contract : never

type ExtendedContract<T> = T & {
  approveAndDeposit: (amount: BigNumberish, receiver: string) => Promise<void>,
  createTxTimestamp: number,
}

type VaultFactory = new(wallet: Wallet) => PossibleFactories
type VaultFromFactory<T> = ExtendedContract<ExtractContract<T>>

export async function createAndRegisterInvestment<T extends VaultFactory>(
  portfolio: StructuredIndexedPortfolio,
  wallet: Wallet,
  Factory: T): Promise<VaultFromFactory<T>> {
  const token = ERC20__factory.connect(await portfolio.asset(), wallet)
  const vaultsRegistry = VaultsRegistry__factory.connect(await portfolio.vaultsRegistry(), wallet)
  const investment = await new Factory(wallet).deploy(token.address)

  await vaultsRegistry.addVault(investment.address)
  const txTimestamp = await getTxTimestamp(await portfolio.register(investment.address))

  investment['approveAndDeposit'] = async (amount: BigNumberish, receiver: string) => {
    await token.approve(investment.address, amount)
    await investment.deposit(amount, receiver)
  }

  investment['createTxTimestamp'] = txTimestamp

  return investment as VaultFromFactory<T>
}
