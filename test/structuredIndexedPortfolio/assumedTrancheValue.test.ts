import { expect, use } from 'chai'
import { solidity } from 'ethereum-waffle'
import { structuredIndexedPortfolioFixture } from 'fixtures/structuredIndexedPortfolioFixture'
import { setupFixtureLoader } from 'test/setup'
import { ONE_YEAR_IN_SECONDS } from 'utils/constants'
import { CheckpointAndTrancheDataFields, mockCheckpointAndTrancheData } from 'utils/mockCheckpointAndTrancheData'
import { percentToBips } from 'utils'

use(solidity)

describe('StructuredIndexedPortfolio.assumedTrancheValue', () => {
  const loadFixture = setupFixtureLoader()

  it('one year, totalAssets zero, deficit zero', async () => {
    const { portfolioWithMockTranche, mockTrancheVault } = await loadFixture(structuredIndexedPortfolioFixture)
    const mockData: CheckpointAndTrancheDataFields = { targetApy: percentToBips(3) }
    await mockCheckpointAndTrancheData(mockTrancheVault, portfolioWithMockTranche, mockData)
    const currentTimestamp = ONE_YEAR_IN_SECONDS

    expect(await portfolioWithMockTranche.assumedTrancheValue(0, currentTimestamp)).to.eq(0)
  })

  it('one year, totalAssets non-zero, deficit zero', async () => {
    const { portfolioWithMockTranche, mockTrancheVault } = await loadFixture(structuredIndexedPortfolioFixture)
    const mockData: CheckpointAndTrancheDataFields = { targetApy: percentToBips(3), totalAssets: 100 }
    await mockCheckpointAndTrancheData(mockTrancheVault, portfolioWithMockTranche, mockData)
    const currentTimestamp = ONE_YEAR_IN_SECONDS

    expect(await portfolioWithMockTranche.assumedTrancheValue(0, currentTimestamp)).to.eq(103)
  })

  it('one year, totalAssets zero, deficit non-zero', async () => {
    const { portfolioWithMockTranche, mockTrancheVault } = await loadFixture(structuredIndexedPortfolioFixture)
    const mockData: CheckpointAndTrancheDataFields = { targetApy: percentToBips(3), deficit: 100 }
    await mockCheckpointAndTrancheData(mockTrancheVault, portfolioWithMockTranche, mockData)
    const currentTimestamp = ONE_YEAR_IN_SECONDS

    expect(await portfolioWithMockTranche.assumedTrancheValue(0, currentTimestamp)).to.eq(103)
  })

  it('one year, totalAssets non-zero, deficit non-zero', async () => {
    const { portfolioWithMockTranche, mockTrancheVault } = await loadFixture(structuredIndexedPortfolioFixture)
    const mockData: CheckpointAndTrancheDataFields = {
      targetApy: percentToBips(3),
      totalAssets: 100,
      deficit: 100,
    }
    await mockCheckpointAndTrancheData(mockTrancheVault, portfolioWithMockTranche, mockData)
    const currentTimestamp = ONE_YEAR_IN_SECONDS

    expect(await portfolioWithMockTranche.assumedTrancheValue(0, currentTimestamp)).to.eq(206)
  })

  it('timestamps equal, totalAssets zero, deficit zero', async () => {
    const { portfolioWithMockTranche, mockTrancheVault } = await loadFixture(structuredIndexedPortfolioFixture)
    const mockData: CheckpointAndTrancheDataFields = {
      targetApy: percentToBips(3),
      vaultTimestamp: ONE_YEAR_IN_SECONDS,
      investmentTimestamp: ONE_YEAR_IN_SECONDS,
    }
    await mockCheckpointAndTrancheData(mockTrancheVault, portfolioWithMockTranche, mockData)
    const currentTimestamp = ONE_YEAR_IN_SECONDS

    expect(await portfolioWithMockTranche.assumedTrancheValue(0, currentTimestamp)).to.eq(0)
  })

  it('timestamps equal, totalAssets zero, deficit non-zero', async () => {
    const { portfolioWithMockTranche, mockTrancheVault } = await loadFixture(structuredIndexedPortfolioFixture)
    const mockData: CheckpointAndTrancheDataFields = {
      targetApy: percentToBips(3),
      vaultTimestamp: ONE_YEAR_IN_SECONDS,
      investmentTimestamp: ONE_YEAR_IN_SECONDS,
      deficit: 100,
    }
    await mockCheckpointAndTrancheData(mockTrancheVault, portfolioWithMockTranche, mockData)
    const currentTimestamp = ONE_YEAR_IN_SECONDS

    expect(await portfolioWithMockTranche.assumedTrancheValue(0, currentTimestamp)).to.eq(100)
  })

  it('timestamps equal, totalAssets non-zero, deficit zero', async () => {
    const { portfolioWithMockTranche, mockTrancheVault } = await loadFixture(structuredIndexedPortfolioFixture)
    const mockData: CheckpointAndTrancheDataFields = {
      targetApy: percentToBips(3),
      vaultTimestamp: ONE_YEAR_IN_SECONDS,
      investmentTimestamp: ONE_YEAR_IN_SECONDS,
      totalAssets: 100,
    }
    await mockCheckpointAndTrancheData(mockTrancheVault, portfolioWithMockTranche, mockData)
    const currentTimestamp = ONE_YEAR_IN_SECONDS

    expect(await portfolioWithMockTranche.assumedTrancheValue(0, currentTimestamp)).to.eq(100)
  })

  it('timestamps equal, totalAssets non-zero, deficit non-zero', async () => {
    const { portfolioWithMockTranche, mockTrancheVault } = await loadFixture(structuredIndexedPortfolioFixture)
    const mockData: CheckpointAndTrancheDataFields = {
      targetApy: percentToBips(3),
      vaultTimestamp: ONE_YEAR_IN_SECONDS,
      investmentTimestamp: ONE_YEAR_IN_SECONDS,
      totalAssets: 100,
      deficit: 100,
    }
    await mockCheckpointAndTrancheData(mockTrancheVault, portfolioWithMockTranche, mockData)
    const currentTimestamp = ONE_YEAR_IN_SECONDS

    expect(await portfolioWithMockTranche.assumedTrancheValue(0, currentTimestamp)).to.eq(200)
  })

  it('targetApy zero', async () => {
    const { portfolioWithMockTranche, mockTrancheVault } = await loadFixture(structuredIndexedPortfolioFixture)
    const mockData: CheckpointAndTrancheDataFields = {
      targetApy: percentToBips(3),
      vaultTimestamp: ONE_YEAR_IN_SECONDS,
      investmentTimestamp: ONE_YEAR_IN_SECONDS,
      totalAssets: 100,
      deficit: 100,
    }
    await mockCheckpointAndTrancheData(mockTrancheVault, portfolioWithMockTranche, mockData)
    const currentTimestamp = ONE_YEAR_IN_SECONDS

    expect(await portfolioWithMockTranche.assumedTrancheValue(0, currentTimestamp)).to.eq(200)
  })

  it('everything zero', async () => {
    const { portfolioWithMockTranche, mockTrancheVault } = await loadFixture(structuredIndexedPortfolioFixture)
    await mockCheckpointAndTrancheData(mockTrancheVault, portfolioWithMockTranche, {})
    const currentTimestamp = ONE_YEAR_IN_SECONDS

    expect(await portfolioWithMockTranche.assumedTrancheValue(0, currentTimestamp)).to.eq(0)
  })

  it('checkpoint timestamps different', async () => {
    const { portfolioWithMockTranche, mockTrancheVault } = await loadFixture(structuredIndexedPortfolioFixture)
    const mockData: CheckpointAndTrancheDataFields = {
      deficit: 100,
      totalAssets: 100,
      investmentTimestamp: ONE_YEAR_IN_SECONDS / 2,
      vaultTimestamp: 0,
      targetApy: percentToBips(3),
    }
    await mockCheckpointAndTrancheData(mockTrancheVault, portfolioWithMockTranche, mockData)
    const currentTimestamp = ONE_YEAR_IN_SECONDS

    expect(await portfolioWithMockTranche.assumedTrancheValue(0, currentTimestamp)).to.eq(206)
  })
})
