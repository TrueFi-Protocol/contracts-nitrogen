import { expect, use } from 'chai'
import { solidity } from 'ethereum-waffle'
import { structuredIndexedPortfolioFixture } from 'fixtures/structuredIndexedPortfolioFixture'
import { setupFixtureLoader } from 'test/setup'
import {
  getHalfPortfolioDuration,
  getTxTimestamp,
  setNextBlockTimestamp,
  startAndGetTimestamp,
} from 'utils'

use(solidity)

describe('StructuredIndexedPortfolio.updateCheckpoints.updatesDeficitCheckpointTimestamp', () => {
  const loadFixture = setupFixtureLoader()

  it('no time passed', async () => {
    const { portfolio, tranches: [equityTranche, juniorTranche, seniorTranche] } = await loadFixture(structuredIndexedPortfolioFixture)
    await portfolio.start()
    const updateTx = await portfolio.updateCheckpoints()
    const updateTxTimestamp = await getTxTimestamp(updateTx)

    const equityCheckpoint = await equityTranche.getCheckpoint()
    const juniorCheckpoint = await juniorTranche.getCheckpoint()
    const seniorCheckpoint = await seniorTranche.getCheckpoint()
    expect(equityCheckpoint.timestamp).to.eq(updateTxTimestamp)
    expect(juniorCheckpoint.timestamp).to.eq(updateTxTimestamp)
    expect(seniorCheckpoint.timestamp).to.eq(updateTxTimestamp)
  })

  it('half portfolio duration', async () => {
    const { portfolio, tranches: [equityTranche, juniorTranche, seniorTranche] } = await loadFixture(structuredIndexedPortfolioFixture)
    const halfPortfolioDuration = await getHalfPortfolioDuration(portfolio)
    const startTimestamp = await startAndGetTimestamp(portfolio)

    const expectedTimestamp = startTimestamp + halfPortfolioDuration
    await setNextBlockTimestamp(expectedTimestamp)

    await portfolio.updateCheckpoints()

    const equityCheckpoint = await equityTranche.getCheckpoint()
    const juniorCheckpoint = await juniorTranche.getCheckpoint()
    const seniorCheckpoint = await seniorTranche.getCheckpoint()
    expect(equityCheckpoint.timestamp).to.eq(expectedTimestamp)
    expect(juniorCheckpoint.timestamp).to.eq(expectedTimestamp)
    expect(seniorCheckpoint.timestamp).to.eq(expectedTimestamp)
  })
})
