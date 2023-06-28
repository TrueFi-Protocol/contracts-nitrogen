import { Zero } from '@ethersproject/constants'
import { expect, use } from 'chai'
import { solidity } from 'ethereum-waffle'
import { structuredIndexedPortfolioFixture } from 'fixtures/structuredIndexedPortfolioFixture'
import { calculateAssumedTranchesValue } from 'fixtures/utils'
import { setupFixtureLoader } from 'test/setup'
import {
  calculateAssumedTranchesValuesAfterMultipleUpdates,
  getPortfolioDurationFraction,
  getQuarterPortfolioDuration,
  setNextBlockTimestamp,
  startAndGetTimestamp,
  subtractArrays,
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
const NUMBER_OF_UPDATES = 2

describe('StructuredIndexedPortfolio.updateCheckpoints.noFees.multipleUpdates', () => {
  const loadFixture = setupFixtureLoader()

  it('senior empty, junior empty, equity empty', async () => {
    const { portfolio, depositToTranches, parseMockToken, wallet, tranches: [equityTranche, juniorTranche, seniorTranche] } = await loadFixture(structuredIndexedPortfolioFixture)
    const updatesNumber = 4
    const timeElapsed = await getPortfolioDurationFraction(portfolio, updatesNumber)
    const depositAmounts = DEPOSIT_AMOUNTS.map(parseMockToken)
    await depositToTranches(portfolio, depositAmounts, wallet)

    const startTimestamp = await startAndGetTimestamp(portfolio)
    await portfolio.setVirtualTokenBalance(Zero)

    let assumedTranchesValues = depositAmounts

    for (let i = 1; i < updatesNumber; i++) {
      await setNextBlockTimestamp(startTimestamp + timeElapsed * i)
      await portfolio.updateCheckpoints()

      assumedTranchesValues = await calculateAssumedTranchesValue(portfolio, assumedTranchesValues, timeElapsed)
      const [, juniorDeficit, seniorDeficit] = assumedTranchesValues

      const equityCheckpoint = await equityTranche.getCheckpoint()
      const juniorCheckpoint = await juniorTranche.getCheckpoint()
      const seniorCheckpoint = await seniorTranche.getCheckpoint()
      expect('updateCheckpointFromPortfolio').to.be.calledOnContractWith(equityTranche, [Zero])
      expect('updateCheckpointFromPortfolio').to.be.calledOnContractWith(juniorTranche, [Zero])
      expect('updateCheckpointFromPortfolio').to.be.calledOnContractWith(seniorTranche, [Zero])
      expect(equityCheckpoint.deficit).to.eq(Zero)
      expect(juniorCheckpoint.deficit).to.eq(juniorDeficit)
      expect(seniorCheckpoint.deficit).to.eq(seniorDeficit)
    }
  })

  it('senior deficit partially comes back', async () => {
    const { portfolio, depositToTranches, parseMockToken, wallet, tranches: [equityTranche, juniorTranche, seniorTranche] } = await loadFixture(structuredIndexedPortfolioFixture)
    const timeElapsed = await getQuarterPortfolioDuration(portfolio)
    const depositAmounts = DEPOSIT_AMOUNTS.map(parseMockToken)
    await depositToTranches(portfolio, depositAmounts, wallet)

    const startTimestamp = await startAndGetTimestamp(portfolio)
    await portfolio.setVirtualTokenBalance(Zero)

    await setNextBlockTimestamp(startTimestamp + timeElapsed)
    await portfolio.updateCheckpoints()

    const assumedTranchesValues = await calculateAssumedTranchesValuesAfterMultipleUpdates(portfolio, depositAmounts, timeElapsed, NUMBER_OF_UPDATES)
    const seniorRealValue = assumedTranchesValues[2].div(2)
    const realTranchesValues = [Zero, Zero, seniorRealValue]

    const newVirtualTokenBalance = sumArray(realTranchesValues)
    await portfolio.setVirtualTokenBalance(newVirtualTokenBalance)

    await setNextBlockTimestamp(startTimestamp + timeElapsed * 2)
    await portfolio.updateCheckpoints()

    const [, juniorDeficit, seniorDeficit] = subtractArrays(assumedTranchesValues, realTranchesValues)
    const equityCheckpoint = await equityTranche.getCheckpoint()
    const juniorCheckpoint = await juniorTranche.getCheckpoint()
    const seniorCheckpoint = await seniorTranche.getCheckpoint()
    expect('updateCheckpointFromPortfolio').to.be.calledOnContractWith(equityTranche, [Zero])
    expect('updateCheckpointFromPortfolio').to.be.calledOnContractWith(juniorTranche, [Zero])
    expect('updateCheckpointFromPortfolio').to.be.calledOnContractWith(seniorTranche, [seniorRealValue])
    expect(equityCheckpoint.deficit).to.eq(Zero)
    expect(juniorCheckpoint.deficit).to.eq(juniorDeficit)
    expect(seniorCheckpoint.deficit).to.eq(seniorDeficit)
  })

  it('senior deficit comes back', async () => {
    const { portfolio, depositToTranches, parseMockToken, wallet, tranches: [equityTranche, juniorTranche, seniorTranche] } = await loadFixture(structuredIndexedPortfolioFixture)
    const timeElapsed = await getQuarterPortfolioDuration(portfolio)
    const depositAmounts = DEPOSIT_AMOUNTS.map(parseMockToken)
    await depositToTranches(portfolio, depositAmounts, wallet)

    const startTimestamp = await startAndGetTimestamp(portfolio)
    await portfolio.setVirtualTokenBalance(Zero)

    await setNextBlockTimestamp(startTimestamp + timeElapsed)
    await portfolio.updateCheckpoints()

    const assumedTranchesValues = await calculateAssumedTranchesValuesAfterMultipleUpdates(portfolio, depositAmounts, timeElapsed, NUMBER_OF_UPDATES)
    const seniorRealValue = assumedTranchesValues[2]
    const realTranchesValues = [Zero, Zero, seniorRealValue]

    const newVirtualTokenBalance = sumArray(realTranchesValues)
    await portfolio.setVirtualTokenBalance(newVirtualTokenBalance)

    await setNextBlockTimestamp(startTimestamp + timeElapsed * 2)
    await portfolio.updateCheckpoints()

    const [, juniorDeficit] = subtractArrays(assumedTranchesValues, realTranchesValues)
    const equityCheckpoint = await equityTranche.getCheckpoint()
    const juniorCheckpoint = await juniorTranche.getCheckpoint()
    const seniorCheckpoint = await seniorTranche.getCheckpoint()
    expect('updateCheckpointFromPortfolio').to.be.calledOnContractWith(equityTranche, [Zero])
    expect('updateCheckpointFromPortfolio').to.be.calledOnContractWith(juniorTranche, [Zero])
    expect('updateCheckpointFromPortfolio').to.be.calledOnContractWith(seniorTranche, [seniorRealValue])
    expect(equityCheckpoint.deficit).to.eq(Zero)
    expect(juniorCheckpoint.deficit).to.eq(juniorDeficit)
    expect(seniorCheckpoint.deficit).to.eq(Zero)
  })

  it('junior deficit partially comes back', async () => {
    const { portfolio, depositToTranches, parseMockToken, wallet, tranches: [equityTranche, juniorTranche, seniorTranche] } = await loadFixture(structuredIndexedPortfolioFixture)
    const timeElapsed = await getQuarterPortfolioDuration(portfolio)
    const depositAmounts = DEPOSIT_AMOUNTS.map(parseMockToken)
    await depositToTranches(portfolio, depositAmounts, wallet)

    const startTimestamp = await startAndGetTimestamp(portfolio)
    await portfolio.setVirtualTokenBalance(Zero)

    await setNextBlockTimestamp(startTimestamp + timeElapsed)
    await portfolio.updateCheckpoints()

    const assumedTranchesValues = await calculateAssumedTranchesValuesAfterMultipleUpdates(portfolio, depositAmounts, timeElapsed, NUMBER_OF_UPDATES)
    const seniorRealValue = assumedTranchesValues[2]
    const juniorRealValue = assumedTranchesValues[1].div(2)
    const realTranchesValues = [Zero, juniorRealValue, seniorRealValue]

    const newVirtualTokenBalance = sumArray(realTranchesValues)
    await portfolio.setVirtualTokenBalance(newVirtualTokenBalance)

    await setNextBlockTimestamp(startTimestamp + timeElapsed * 2)
    await portfolio.updateCheckpoints()

    const [, juniorDeficit] = subtractArrays(assumedTranchesValues, realTranchesValues)
    const equityCheckpoint = await equityTranche.getCheckpoint()
    const juniorCheckpoint = await juniorTranche.getCheckpoint()
    const seniorCheckpoint = await seniorTranche.getCheckpoint()
    expect('updateCheckpointFromPortfolio').to.be.calledOnContractWith(equityTranche, [Zero])
    expect('updateCheckpointFromPortfolio').to.be.calledOnContractWith(juniorTranche, [juniorRealValue])
    expect('updateCheckpointFromPortfolio').to.be.calledOnContractWith(seniorTranche, [seniorRealValue])
    expect(equityCheckpoint.deficit).to.eq(Zero)
    expect(juniorCheckpoint.deficit).to.eq(juniorDeficit)
    expect(seniorCheckpoint.deficit).to.eq(Zero)
  })

  it('junior deficit comes back', async () => {
    const { portfolio, depositToTranches, parseMockToken, wallet, tranches: [equityTranche, juniorTranche, seniorTranche] } = await loadFixture(structuredIndexedPortfolioFixture)
    const timeElapsed = await getQuarterPortfolioDuration(portfolio)
    const depositAmounts = DEPOSIT_AMOUNTS.map(parseMockToken)
    await depositToTranches(portfolio, depositAmounts, wallet)

    const startTimestamp = await startAndGetTimestamp(portfolio)
    await portfolio.setVirtualTokenBalance(Zero)

    await setNextBlockTimestamp(startTimestamp + timeElapsed)
    await portfolio.updateCheckpoints()

    const assumedTranchesValues = await calculateAssumedTranchesValuesAfterMultipleUpdates(portfolio, depositAmounts, timeElapsed, NUMBER_OF_UPDATES)
    const seniorRealValue = assumedTranchesValues[2]
    const juniorRealValue = assumedTranchesValues[1]
    const realTranchesValues = [Zero, juniorRealValue, seniorRealValue]

    const newVirtualTokenBalance = sumArray(realTranchesValues)
    await portfolio.setVirtualTokenBalance(newVirtualTokenBalance)

    await setNextBlockTimestamp(startTimestamp + timeElapsed * 2)
    await portfolio.updateCheckpoints()

    const equityCheckpoint = await equityTranche.getCheckpoint()
    const juniorCheckpoint = await juniorTranche.getCheckpoint()
    const seniorCheckpoint = await seniorTranche.getCheckpoint()
    expect('updateCheckpointFromPortfolio').to.be.calledOnContractWith(equityTranche, [Zero])
    expect('updateCheckpointFromPortfolio').to.be.calledOnContractWith(juniorTranche, [juniorRealValue])
    expect('updateCheckpointFromPortfolio').to.be.calledOnContractWith(seniorTranche, [seniorRealValue])
    expect(equityCheckpoint.deficit).to.eq(Zero)
    expect(juniorCheckpoint.deficit).to.eq(Zero)
    expect(seniorCheckpoint.deficit).to.eq(Zero)
  })

  it('equity surplus', async () => {
    const { portfolio, depositToTranches, parseMockToken, wallet, tranches: [equityTranche, juniorTranche, seniorTranche] } = await loadFixture(structuredIndexedPortfolioFixture)
    const timeElapsed = await getQuarterPortfolioDuration(portfolio)
    const depositAmounts = DEPOSIT_AMOUNTS.map(parseMockToken)
    await depositToTranches(portfolio, depositAmounts, wallet)

    const startTimestamp = await startAndGetTimestamp(portfolio)
    await portfolio.setVirtualTokenBalance(Zero)

    await setNextBlockTimestamp(startTimestamp + timeElapsed)
    await portfolio.updateCheckpoints()

    const assumedTranchesValues = await calculateAssumedTranchesValuesAfterMultipleUpdates(portfolio, depositAmounts, timeElapsed, NUMBER_OF_UPDATES)
    const equityRealValue = parseMockToken(100)
    const juniorRealValue = assumedTranchesValues[1]
    const seniorRealValue = assumedTranchesValues[2]
    const realTranchesValues = [equityRealValue, juniorRealValue, seniorRealValue]

    const newVirtualTokenBalance = sumArray(realTranchesValues)
    await portfolio.setVirtualTokenBalance(newVirtualTokenBalance)

    await setNextBlockTimestamp(startTimestamp + timeElapsed * 2)
    await portfolio.updateCheckpoints()

    const equityCheckpoint = await equityTranche.getCheckpoint()
    const juniorCheckpoint = await juniorTranche.getCheckpoint()
    const seniorCheckpoint = await seniorTranche.getCheckpoint()
    expect('updateCheckpointFromPortfolio').to.be.calledOnContractWith(equityTranche, [equityRealValue])
    expect('updateCheckpointFromPortfolio').to.be.calledOnContractWith(juniorTranche, [juniorRealValue])
    expect('updateCheckpointFromPortfolio').to.be.calledOnContractWith(seniorTranche, [seniorRealValue])
    expect(equityCheckpoint.deficit).to.eq(Zero)
    expect(juniorCheckpoint.deficit).to.eq(Zero)
    expect(seniorCheckpoint.deficit).to.eq(Zero)
  })

  it('equity loses value', async () => {
    const { portfolio, depositToTranches, parseMockToken, wallet, tranches: [equityTranche, juniorTranche, seniorTranche] } = await loadFixture(structuredIndexedPortfolioFixture)
    const timeElapsed = await getQuarterPortfolioDuration(portfolio)
    const depositAmounts = DEPOSIT_AMOUNTS.map(parseMockToken)
    await depositToTranches(portfolio, depositAmounts, wallet)

    const startTimestamp = await startAndGetTimestamp(portfolio)

    const assumedTranchesValues = await calculateAssumedTranchesValue(portfolio, depositAmounts, timeElapsed)
    await portfolio.setVirtualTokenBalance(sumArray(assumedTranchesValues))

    await setNextBlockTimestamp(startTimestamp + timeElapsed)
    await portfolio.updateCheckpoints()

    const secondAssumedTranchesValues = await calculateAssumedTranchesValuesAfterMultipleUpdates(portfolio, depositAmounts, timeElapsed, NUMBER_OF_UPDATES)
    const equityRealValue = Zero
    const juniorRealValue = secondAssumedTranchesValues[1]
    const seniorRealValue = secondAssumedTranchesValues[2]
    const realTranchesValues = [equityRealValue, juniorRealValue, seniorRealValue]

    const newVirtualTokenBalance = sumArray(realTranchesValues)
    await portfolio.setVirtualTokenBalance(newVirtualTokenBalance)

    await setNextBlockTimestamp(startTimestamp + timeElapsed * 2)
    await portfolio.updateCheckpoints()

    const equityCheckpoint = await equityTranche.getCheckpoint()
    const juniorCheckpoint = await juniorTranche.getCheckpoint()
    const seniorCheckpoint = await seniorTranche.getCheckpoint()
    expect('updateCheckpointFromPortfolio').to.be.calledOnContractWith(equityTranche, [equityRealValue])
    expect('updateCheckpointFromPortfolio').to.be.calledOnContractWith(juniorTranche, [juniorRealValue])
    expect('updateCheckpointFromPortfolio').to.be.calledOnContractWith(seniorTranche, [seniorRealValue])
    expect(equityCheckpoint.deficit).to.eq(Zero)
    expect(juniorCheckpoint.deficit).to.eq(Zero)
    expect(seniorCheckpoint.deficit).to.eq(Zero)
  })

  it('junior loses value', async () => {
    const { portfolio, depositToTranches, parseMockToken, wallet, tranches: [equityTranche, juniorTranche, seniorTranche] } = await loadFixture(structuredIndexedPortfolioFixture)
    const timeElapsed = await getQuarterPortfolioDuration(portfolio)
    const depositAmounts = DEPOSIT_AMOUNTS.map(parseMockToken)
    await depositToTranches(portfolio, depositAmounts, wallet)

    const startTimestamp = await startAndGetTimestamp(portfolio)

    const assumedTranchesValues = await calculateAssumedTranchesValue(portfolio, depositAmounts, timeElapsed)
    await portfolio.setVirtualTokenBalance(sumArray(assumedTranchesValues))

    await setNextBlockTimestamp(startTimestamp + timeElapsed)
    await portfolio.updateCheckpoints()

    const secondAssumedTranchesValues = await calculateAssumedTranchesValuesAfterMultipleUpdates(portfolio, depositAmounts, timeElapsed, NUMBER_OF_UPDATES)
    const equityRealValue = Zero
    const juniorRealValue = secondAssumedTranchesValues[1].sub(parseMockToken(100))
    const seniorRealValue = secondAssumedTranchesValues[2]
    const realTranchesValues = [equityRealValue, juniorRealValue, seniorRealValue]

    const newVirtualTokenBalance = sumArray(realTranchesValues)
    await portfolio.setVirtualTokenBalance(newVirtualTokenBalance)

    await setNextBlockTimestamp(startTimestamp + timeElapsed * 2)
    await portfolio.updateCheckpoints()

    const [, juniorDeficit] = subtractArrays(secondAssumedTranchesValues, realTranchesValues)
    const equityCheckpoint = await equityTranche.getCheckpoint()
    const juniorCheckpoint = await juniorTranche.getCheckpoint()
    const seniorCheckpoint = await seniorTranche.getCheckpoint()
    expect('updateCheckpointFromPortfolio').to.be.calledOnContractWith(equityTranche, [equityRealValue])
    expect('updateCheckpointFromPortfolio').to.be.calledOnContractWith(juniorTranche, [juniorRealValue])
    expect('updateCheckpointFromPortfolio').to.be.calledOnContractWith(seniorTranche, [seniorRealValue])
    expect(equityCheckpoint.deficit).to.eq(Zero)
    expect(juniorCheckpoint.deficit).to.eq(juniorDeficit)
    expect(seniorCheckpoint.deficit).to.eq(Zero)
  })

  it('senior loses value', async () => {
    const { portfolio, depositToTranches, parseMockToken, wallet, tranches: [equityTranche, juniorTranche, seniorTranche] } = await loadFixture(structuredIndexedPortfolioFixture)
    const timeElapsed = await getQuarterPortfolioDuration(portfolio)
    const depositAmounts = DEPOSIT_AMOUNTS.map(parseMockToken)
    await depositToTranches(portfolio, depositAmounts, wallet)

    const startTimestamp = await startAndGetTimestamp(portfolio)

    const assumedTranchesValues = await calculateAssumedTranchesValue(portfolio, depositAmounts, timeElapsed)
    await portfolio.setVirtualTokenBalance(sumArray(assumedTranchesValues))

    await setNextBlockTimestamp(startTimestamp + timeElapsed)
    await portfolio.updateCheckpoints()

    const secondAssumedTranchesValues = await calculateAssumedTranchesValuesAfterMultipleUpdates(portfolio, depositAmounts, timeElapsed, NUMBER_OF_UPDATES)
    const equityRealValue = Zero
    const juniorRealValue = Zero
    const seniorRealValue = secondAssumedTranchesValues[2].sub(parseMockToken(100))
    const realTranchesValues = [equityRealValue, juniorRealValue, seniorRealValue]

    const newVirtualTokenBalance = sumArray(realTranchesValues)
    await portfolio.setVirtualTokenBalance(newVirtualTokenBalance)

    await setNextBlockTimestamp(startTimestamp + timeElapsed * 2)
    await portfolio.updateCheckpoints()

    const [, juniorDeficit, seniorDeficit] = subtractArrays(secondAssumedTranchesValues, realTranchesValues)
    const equityCheckpoint = await equityTranche.getCheckpoint()
    const juniorCheckpoint = await juniorTranche.getCheckpoint()
    const seniorCheckpoint = await seniorTranche.getCheckpoint()
    expect('updateCheckpointFromPortfolio').to.be.calledOnContractWith(equityTranche, [equityRealValue])
    expect('updateCheckpointFromPortfolio').to.be.calledOnContractWith(juniorTranche, [juniorRealValue])
    expect('updateCheckpointFromPortfolio').to.be.calledOnContractWith(seniorTranche, [seniorRealValue])
    expect(equityCheckpoint.deficit).to.eq(Zero)
    expect(juniorCheckpoint.deficit).to.eq(juniorDeficit)
    expect(seniorCheckpoint.deficit).to.eq(seniorDeficit)
  })

  it('loses all value', async () => {
    const { portfolio, depositToTranches, parseMockToken, wallet, tranches: [equityTranche, juniorTranche, seniorTranche] } = await loadFixture(structuredIndexedPortfolioFixture)
    const timeElapsed = await getQuarterPortfolioDuration(portfolio)
    const depositAmounts = DEPOSIT_AMOUNTS.map(parseMockToken)
    await depositToTranches(portfolio, depositAmounts, wallet)

    const startTimestamp = await startAndGetTimestamp(portfolio)

    const assumedTranchesValues = await calculateAssumedTranchesValue(portfolio, depositAmounts, timeElapsed)
    await portfolio.setVirtualTokenBalance(sumArray(assumedTranchesValues))

    await setNextBlockTimestamp(startTimestamp + timeElapsed)
    await portfolio.updateCheckpoints()

    const secondAssumedTranchesValues = await calculateAssumedTranchesValuesAfterMultipleUpdates(portfolio, depositAmounts, timeElapsed, NUMBER_OF_UPDATES)
    const equityRealValue = Zero
    const juniorRealValue = Zero
    const seniorRealValue = Zero
    const realTranchesValues = [equityRealValue, juniorRealValue, seniorRealValue]

    const newVirtualTokenBalance = sumArray(realTranchesValues)
    await portfolio.setVirtualTokenBalance(newVirtualTokenBalance)

    await setNextBlockTimestamp(startTimestamp + timeElapsed * 2)
    await portfolio.updateCheckpoints()

    const [, juniorDeficit, seniorDeficit] = subtractArrays(secondAssumedTranchesValues, realTranchesValues)
    const equityCheckpoint = await equityTranche.getCheckpoint()
    const juniorCheckpoint = await juniorTranche.getCheckpoint()
    const seniorCheckpoint = await seniorTranche.getCheckpoint()
    expect('updateCheckpointFromPortfolio').to.be.calledOnContractWith(equityTranche, [equityRealValue])
    expect('updateCheckpointFromPortfolio').to.be.calledOnContractWith(juniorTranche, [juniorRealValue])
    expect('updateCheckpointFromPortfolio').to.be.calledOnContractWith(seniorTranche, [seniorRealValue])
    expect(equityCheckpoint.deficit).to.eq(Zero)
    expect(juniorCheckpoint.deficit).to.eq(juniorDeficit)
    expect(seniorCheckpoint.deficit).to.eq(seniorDeficit)
  })
})
