import { Zero } from '@ethersproject/constants'
import { expect, use } from 'chai'
import { solidity } from 'ethereum-waffle'
import { structuredIndexedPortfolioFixture } from 'fixtures/structuredIndexedPortfolioFixture'
import { setupFixtureLoader } from 'test/setup'
import {
  getHalfPortfolioDuration,
  setNextBlockTimestamp,
  startAndGetTimestamp,
  sumArray,
} from 'utils'

use(solidity)

const EQUITY_DEPOSIT_ASSETS = 1_000_000
const JUNIOR_DEPOSIT_ASSETS = 2_000_000
const SENIOR_DEPOSIT_ASSETS = 3_000_000
const DEPOSIT_AMOUNTS = [
  EQUITY_DEPOSIT_ASSETS,
  JUNIOR_DEPOSIT_ASSETS,
  SENIOR_DEPOSIT_ASSETS,
]

describe('StructuredIndexedPortfolio.updateCheckpoints.noFees.noDeposit', () => {
  const loadFixture = setupFixtureLoader()

  it('immediately after start', async () => {
    const { portfolio, tranches: [equityTranche, juniorTranche, seniorTranche] } = await loadFixture(structuredIndexedPortfolioFixture)
    await portfolio.start()
    await portfolio.updateCheckpoints()

    const equityCheckpoint = await equityTranche.getCheckpoint()
    const juniorCheckpoint = await juniorTranche.getCheckpoint()
    const seniorCheckpoint = await seniorTranche.getCheckpoint()
    expect('updateCheckpointFromPortfolio').to.be.calledOnContractWith(equityTranche, [Zero])
    expect('updateCheckpointFromPortfolio').to.be.calledOnContractWith(juniorTranche, [Zero])
    expect('updateCheckpointFromPortfolio').to.be.calledOnContractWith(seniorTranche, [Zero])
    expect(equityCheckpoint.deficit).to.eq(Zero)
    expect(juniorCheckpoint.deficit).to.eq(Zero)
    expect(seniorCheckpoint.deficit).to.eq(Zero)
  })

  it('half portfolio duration', async () => {
    const { portfolio, tranches: [equityTranche, juniorTranche, seniorTranche] } = await loadFixture(structuredIndexedPortfolioFixture)
    const halfPortfolioDuration = await getHalfPortfolioDuration(portfolio)
    const startTimestamp = await startAndGetTimestamp(portfolio)

    await setNextBlockTimestamp(startTimestamp + halfPortfolioDuration)
    await portfolio.updateCheckpoints()

    const equityCheckpoint = await equityTranche.getCheckpoint()
    const juniorCheckpoint = await juniorTranche.getCheckpoint()
    const seniorCheckpoint = await seniorTranche.getCheckpoint()
    expect('updateCheckpointFromPortfolio').to.be.calledOnContractWith(equityTranche, [Zero])
    expect('updateCheckpointFromPortfolio').to.be.calledOnContractWith(juniorTranche, [Zero])
    expect('updateCheckpointFromPortfolio').to.be.calledOnContractWith(seniorTranche, [Zero])
    expect(equityCheckpoint.deficit).to.eq(Zero)
    expect(juniorCheckpoint.deficit).to.eq(Zero)
    expect(seniorCheckpoint.deficit).to.eq(Zero)
  })

  it('real total assets non-zero', async () => {
    const { portfolio, parseMockToken, tranches: [equityTranche, juniorTranche, seniorTranche] } = await loadFixture(structuredIndexedPortfolioFixture)
    const halfPortfolioDuration = await getHalfPortfolioDuration(portfolio)
    const startTimestamp = await startAndGetTimestamp(portfolio)

    const realTotalAssets = sumArray(DEPOSIT_AMOUNTS.map(parseMockToken))
    await portfolio.setVirtualTokenBalance(realTotalAssets)
    await setNextBlockTimestamp(startTimestamp + halfPortfolioDuration)
    await portfolio.updateCheckpoints()

    const equityCheckpoint = await equityTranche.getCheckpoint()
    const juniorCheckpoint = await juniorTranche.getCheckpoint()
    const seniorCheckpoint = await seniorTranche.getCheckpoint()
    expect('updateCheckpointFromPortfolio').to.be.calledOnContractWith(equityTranche, [realTotalAssets])
    expect('updateCheckpointFromPortfolio').to.be.calledOnContractWith(juniorTranche, [Zero])
    expect('updateCheckpointFromPortfolio').to.be.calledOnContractWith(seniorTranche, [Zero])
    expect(equityCheckpoint.deficit).to.eq(Zero)
    expect(juniorCheckpoint.deficit).to.eq(Zero)
    expect(seniorCheckpoint.deficit).to.eq(Zero)
  })

  it('multiple update', async () => {
    const { portfolio, tranches: [equityTranche, juniorTranche, seniorTranche] } = await loadFixture(structuredIndexedPortfolioFixture)
    const halfPortfolioDuration = await getHalfPortfolioDuration(portfolio)
    const startTimestamp = await startAndGetTimestamp(portfolio)

    await setNextBlockTimestamp(startTimestamp + halfPortfolioDuration)
    await portfolio.updateCheckpoints()
    await portfolio.updateCheckpoints()
    await portfolio.updateCheckpoints()
    await portfolio.updateCheckpoints()

    const equityCheckpoint = await equityTranche.getCheckpoint()
    const juniorCheckpoint = await juniorTranche.getCheckpoint()
    const seniorCheckpoint = await seniorTranche.getCheckpoint()
    expect('updateCheckpointFromPortfolio').to.be.calledOnContractWith(equityTranche, [Zero])
    expect('updateCheckpointFromPortfolio').to.be.calledOnContractWith(juniorTranche, [Zero])
    expect('updateCheckpointFromPortfolio').to.be.calledOnContractWith(seniorTranche, [Zero])
    expect(equityCheckpoint.deficit).to.eq(Zero)
    expect(juniorCheckpoint.deficit).to.eq(Zero)
    expect(seniorCheckpoint.deficit).to.eq(Zero)
  })
})
