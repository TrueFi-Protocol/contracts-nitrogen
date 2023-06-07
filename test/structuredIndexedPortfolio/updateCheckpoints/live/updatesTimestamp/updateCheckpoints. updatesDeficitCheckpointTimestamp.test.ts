import { Zero } from '@ethersproject/constants'
import { expect, use } from 'chai'
import { solidity } from 'ethereum-waffle'
import { structuredIndexedPortfolioFixture } from 'fixtures/structuredIndexedPortfolioFixture'
import { setupFixtureLoader } from 'test/setup'
import {
  getHalfPortfolioDuration,
  getTxTimestamp,
  setNextBlockTimestamp,
  getDeficitCheckpoints,
  startAndGetTimestamp,
  getPortfolioDuration,
} from 'utils'

use(solidity)

describe('StructuredIndexedPortfolio.updateCheckpoints.updatesDeficitCheckpointTimestamp', () => {
  const loadFixture = setupFixtureLoader()

  it('no time passed', async () => {
    const { portfolio } = await loadFixture(structuredIndexedPortfolioFixture)
    await portfolio.start()
    const updateTx = await portfolio.updateCheckpoints()
    const updateTxTimestamp = await getTxTimestamp(updateTx)

    const [equityCheckpoint, juniorCheckpoint, seniorCheckpoint] = await getDeficitCheckpoints(portfolio)
    expect(equityCheckpoint.timestamp).to.eq(Zero)
    expect(juniorCheckpoint.timestamp).to.eq(updateTxTimestamp)
    expect(seniorCheckpoint.timestamp).to.eq(updateTxTimestamp)
  })

  it('half portfolio duration', async () => {
    const { portfolio } = await loadFixture(structuredIndexedPortfolioFixture)
    const halfPortfolioDuration = await getHalfPortfolioDuration(portfolio)
    const startTimestamp = await startAndGetTimestamp(portfolio)

    const expectedTimestamp = startTimestamp + halfPortfolioDuration
    await setNextBlockTimestamp(expectedTimestamp)

    await portfolio.updateCheckpoints()

    const [equityCheckpoint, juniorCheckpoint, seniorCheckpoint] = await getDeficitCheckpoints(portfolio)
    expect(equityCheckpoint.timestamp).to.eq(Zero)
    expect(juniorCheckpoint.timestamp).to.eq(expectedTimestamp)
    expect(seniorCheckpoint.timestamp).to.eq(expectedTimestamp)
  })

  it('twice portfolio duration', async () => {
    const { portfolio } = await loadFixture(structuredIndexedPortfolioFixture)
    const portfolioDuration = await getPortfolioDuration(portfolio)
    const startTimestamp = await startAndGetTimestamp(portfolio)

    await setNextBlockTimestamp(startTimestamp + portfolioDuration * 2)

    await portfolio.updateCheckpoints()

    const expectedTimestamp = startTimestamp + portfolioDuration
    const [equityCheckpoint, juniorCheckpoint, seniorCheckpoint] = await getDeficitCheckpoints(portfolio)
    expect(equityCheckpoint.timestamp).to.eq(Zero)
    expect(juniorCheckpoint.timestamp).to.eq(expectedTimestamp)
    expect(seniorCheckpoint.timestamp).to.eq(expectedTimestamp)
  })
})
