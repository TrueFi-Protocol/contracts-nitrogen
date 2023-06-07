import { BigNumber, BytesLike } from 'ethers'

import { AllowAllLenderVerifier, DepositController, TransferController, WithdrawController } from 'contracts'
import { ExpectedEquityRateStruct, PortfolioParamsStruct, TrancheInitDataStruct } from 'build/types/StructuredIndexedPortfolio'
import { PromiseOrValue } from 'build/types/common'

type AwaitedValue<T> = T extends PromiseOrValue<infer R> ? R : T

export type AwaitedValueObject<T> = {
  [K in keyof T]: AwaitedValue<T[K]>
}

export type OmitFirstOne<T> = T extends [any, ...infer Rest] ? [...Rest] : never
export type OmitFirstTwo<T> = T extends [any, any, ...infer Rest] ? [...Rest] : never

export interface TranchesControllersConfig {
  depositControllerFeeRate: BigNumber,
  depositControllersCeilings: BigNumber[],
  withdrawControllerFeeRate: BigNumber,
  withdrawControllerFloors: BigNumber[],
}

export interface TranchesParameters {
  names: string[],
  symbols: string[],
  targetAPYs: number[],
  minSubordinateRatios: number[],
  managerFeeRates: number[],
}

export interface TranchesConfig {
  controllers: TranchesControllersConfig,
  tranches: TranchesParameters,
}

export interface TrancheInitData {
  name: string,
  symbol: string,
  depositControllerImplementation: string,
  depositControllerInitData: BytesLike,
  withdrawControllerImplementation: string,
  withdrawControllerInitData: BytesLike,
  transferControllerImplementation: string,
  transferControllerInitData: BytesLike,
  targetApy: number,
  minSubordinateRatio: number,
  managerFeeRate: number,
}

export interface Controllers {
  depositController: DepositController,
  withdrawController: WithdrawController,
  transferController: TransferController,
  allowAllLenderVerifier: AllowAllLenderVerifier,
}

export interface ProtocolConfigDeployParams {
  defaultProtocolFeeRate: number,
  protocolAdminAddress: string,
  protocolTreasuryAddress: string,
  pauserAddress: string,
}
export interface StructuredIndexedPortfolioDeployParams {
  managerAddress: string,
  assetAddress: string,
  protocolConfigAddress: string,
  vaultsRegistryAddress: string,
  portfolioParams: AwaitedValueObject<PortfolioParamsStruct>,
  trancheInitData: AwaitedValueObject<TrancheInitDataStruct>[],
  expectedEquityRate: AwaitedValueObject<ExpectedEquityRateStruct>,
}

export interface StructuredIndexedPortfolioFactoryDeployParams {
  portfolioImplementationAddress: string,
  trancheVaultImplementationAddress: string,
  protocolConfigAddress: string,
  vaultsRegistryAddress: string,
}

export interface TranchesDeployParams {
  managerAddress: string,
  assetAddress: string,
  protocolConfigAddress: string,
  depositControllerAddress: string,
  withdrawControllerAddress: string,
  transferControllerAddress: string,
  waterfallIndex: number,
  managerFeeRate: number,
}
