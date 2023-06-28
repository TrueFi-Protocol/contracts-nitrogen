import { MockTrancheVault } from 'build/types'
import { CheckpointStruct } from 'build/types/ITrancheVault'
import { TrancheDataStruct } from 'build/types/StructuredIndexedPortfolioTest'
import { StructuredIndexedPortfolioTest } from 'build/types/contracts/test'
import { BigNumberish } from 'ethers'
import { AwaitedValueObject } from 'fixtures/types'

export interface CheckpointAndTrancheDataFields {
  distributedAssets?: BigNumberish,
  maxValueOnClose?: BigNumberish,
  minSubordinateRatio?: BigNumberish,
  targetApy?: BigNumberish,
  deficit?: BigNumberish,
  investmentTimestamp?: BigNumberish,
  protocolFeeRate?: BigNumberish,
  vaultTimestamp?: BigNumberish,
  totalAssets?: BigNumberish,
  unpaidFees?: BigNumberish,
}

export async function mockCheckpointAndTrancheData(vault: MockTrancheVault, portfolio: StructuredIndexedPortfolioTest, data: CheckpointAndTrancheDataFields) {
  const mockTrancheData: AwaitedValueObject<TrancheDataStruct> = {
    distributedAssets: data?.distributedAssets ?? 0,
    maxValueOnClose: data?.maxValueOnClose ?? 0,
    minSubordinateRatio: data?.minSubordinateRatio ?? 0,
    targetApy: data?.targetApy ?? 0,
  }

  const mockCheckpoint: AwaitedValueObject<CheckpointStruct> = {
    protocolFeeRate: data?.protocolFeeRate ?? 0,
    timestamp: data?.vaultTimestamp ?? 0,
    totalAssets: data?.totalAssets ?? 0,
    unpaidFees: data?.unpaidFees ?? 0,
    deficit: data?.deficit ?? 0,
  }

  await vault.setCheckpoint(mockCheckpoint)
  await portfolio.setTranchesData([mockTrancheData])
}
