import { Zero } from '@ethersproject/constants'
import { expect, use } from 'chai'
import { solidity } from 'ethereum-waffle'
import { structuredIndexedPortfolioFixture } from 'fixtures/structuredIndexedPortfolioFixture'
import { calculateAssumedTranchesValue } from 'fixtures/utils'
import { setupFixtureLoader } from 'test/setup'
import {
  getHalfPortfolioDuration,
  setNextBlockTimestamp,
  getDeficitCheckpoints,
  getPortfolioDuration,
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

describe('StructuredIndexedPortfolio.updateCheckpoints.noFees.oneUpdate', () => {
  const loadFixture = setupFixtureLoader()

  it('senior empty, junior empty, equity empty', async () => {
    const { portfolio, depositToTranches, parseMockToken, wallet, tranches: [equityTranche, juniorTranche, seniorTranche] } = await loadFixture(structuredIndexedPortfolioFixture)
    const timeElapsed = await getHalfPortfolioDuration(portfolio)
    const depositAmounts = DEPOSIT_AMOUNTS.map(parseMockToken)

    await depositToTranches(portfolio, depositAmounts, wallet)

    const startTimestamp = await startAndGetTimestamp(portfolio)

    const assumedTranchesValues = await calculateAssumedTranchesValue(portfolio, depositAmounts, timeElapsed)
    const realTranchesValues = [Zero, Zero, Zero]
    const newVirtualTokenBalance = sumArray(realTranchesValues)
    await portfolio.setVirtualTokenBalance(newVirtualTokenBalance)

    await setNextBlockTimestamp(startTimestamp + timeElapsed)
    await portfolio.updateCheckpoints()

    const [, juniorDeficit, seniorDeficit] = subtractArrays(assumedTranchesValues, realTranchesValues)
    const [equityCheckpoint, juniorCheckpoint, seniorCheckpoint] = await getDeficitCheckpoints(portfolio)
    expect('updateCheckpointFromPortfolio').to.be.calledOnContractWith(equityTranche, [Zero, Zero])
    expect('updateCheckpointFromPortfolio').to.be.calledOnContractWith(juniorTranche, [Zero, Zero])
    expect('updateCheckpointFromPortfolio').to.be.calledOnContractWith(seniorTranche, [Zero, Zero])
    expect(equityCheckpoint.deficit).to.eq(Zero)
    expect(juniorCheckpoint.deficit).to.eq(juniorDeficit)
    expect(seniorCheckpoint.deficit).to.eq(seniorDeficit)
  })

  it('senior underflow, junior empty, equity empty', async () => {
    const { portfolio, depositToTranches, parseMockToken, wallet, tranches: [equityTranche, juniorTranche, seniorTranche] } = await loadFixture(structuredIndexedPortfolioFixture)
    const timeElapsed = await getHalfPortfolioDuration(portfolio)
    const depositAmounts = DEPOSIT_AMOUNTS.map(parseMockToken)

    await depositToTranches(portfolio, depositAmounts, wallet)

    const startTimestamp = await startAndGetTimestamp(portfolio)

    const assumedTranchesValues = await calculateAssumedTranchesValue(portfolio, depositAmounts, timeElapsed)
    const realSeniorValue = assumedTranchesValues[2].div(3)
    const realTranchesValues = [Zero, Zero, realSeniorValue]
    const newVirtualTokenBalance = sumArray(realTranchesValues)
    await portfolio.setVirtualTokenBalance(newVirtualTokenBalance)

    await setNextBlockTimestamp(startTimestamp + timeElapsed)
    await portfolio.updateCheckpoints()

    const [, juniorDeficit, seniorDeficit] = subtractArrays(assumedTranchesValues, realTranchesValues)
    const [equityCheckpoint, juniorCheckpoint, seniorCheckpoint] = await getDeficitCheckpoints(portfolio)
    expect('updateCheckpointFromPortfolio').to.be.calledOnContractWith(equityTranche, [Zero, Zero])
    expect('updateCheckpointFromPortfolio').to.be.calledOnContractWith(juniorTranche, [Zero, juniorDeficit])
    expect('updateCheckpointFromPortfolio').to.be.calledOnContractWith(seniorTranche, [realSeniorValue, seniorDeficit])
    expect(equityCheckpoint.deficit).to.eq(Zero)
    expect(juniorCheckpoint.deficit).to.eq(juniorDeficit)
    expect(seniorCheckpoint.deficit).to.eq(seniorDeficit)
  })

  it('senior full, junior empty, equity empty', async () => {
    const { portfolio, depositToTranches, parseMockToken, wallet, tranches: [equityTranche, juniorTranche, seniorTranche] } = await loadFixture(structuredIndexedPortfolioFixture)
    const timeElapsed = await getHalfPortfolioDuration(portfolio)
    const depositAmounts = DEPOSIT_AMOUNTS.map(parseMockToken)

    await depositToTranches(portfolio, depositAmounts, wallet)

    const startTimestamp = await startAndGetTimestamp(portfolio)

    const assumedTranchesValues = await calculateAssumedTranchesValue(portfolio, depositAmounts, timeElapsed)
    const realSeniorValue = assumedTranchesValues[2]
    const realTranchesValues = [Zero, Zero, realSeniorValue]
    const newVirtualTokenBalance = sumArray(realTranchesValues)
    await portfolio.setVirtualTokenBalance(newVirtualTokenBalance)

    await setNextBlockTimestamp(startTimestamp + timeElapsed)
    await portfolio.updateCheckpoints()

    const [, juniorDeficit] = subtractArrays(assumedTranchesValues, realTranchesValues)
    const [equityCheckpoint, juniorCheckpoint, seniorCheckpoint] = await getDeficitCheckpoints(portfolio)
    expect('updateCheckpointFromPortfolio').to.be.calledOnContractWith(equityTranche, [Zero, Zero])
    expect('updateCheckpointFromPortfolio').to.be.calledOnContractWith(juniorTranche, [Zero, Zero])
    expect('updateCheckpointFromPortfolio').to.be.calledOnContractWith(seniorTranche, [realSeniorValue, Zero])
    expect(equityCheckpoint.deficit).to.eq(Zero)
    expect(juniorCheckpoint.deficit).to.eq(juniorDeficit)
    expect(seniorCheckpoint.deficit).to.eq(Zero)
  })

  it('senior full, junior underflow, equity empty', async () => {
    const { portfolio, depositToTranches, parseMockToken, wallet, tranches: [equityTranche, juniorTranche, seniorTranche] } = await loadFixture(structuredIndexedPortfolioFixture)
    const timeElapsed = await getHalfPortfolioDuration(portfolio)
    const depositAmounts = DEPOSIT_AMOUNTS.map(parseMockToken)

    await depositToTranches(portfolio, depositAmounts, wallet)

    const startTimestamp = await startAndGetTimestamp(portfolio)

    const assumedTranchesValues = await calculateAssumedTranchesValue(portfolio, depositAmounts, timeElapsed)
    const realJuniorValue = assumedTranchesValues[1].div(3)
    const realSeniorValue = assumedTranchesValues[2]
    const realTranchesValues = [Zero, realJuniorValue, realSeniorValue]
    const newVirtualTokenBalance = sumArray(realTranchesValues)
    await portfolio.setVirtualTokenBalance(newVirtualTokenBalance)

    await setNextBlockTimestamp(startTimestamp + timeElapsed)
    await portfolio.updateCheckpoints()

    const [, juniorDeficit] = subtractArrays(assumedTranchesValues, realTranchesValues)
    const [equityCheckpoint, juniorCheckpoint, seniorCheckpoint] = await getDeficitCheckpoints(portfolio)
    expect('updateCheckpointFromPortfolio').to.be.calledOnContractWith(equityTranche, [Zero, Zero])
    expect('updateCheckpointFromPortfolio').to.be.calledOnContractWith(juniorTranche, [realJuniorValue, juniorDeficit])
    expect('updateCheckpointFromPortfolio').to.be.calledOnContractWith(seniorTranche, [realSeniorValue, Zero])
    expect(equityCheckpoint.deficit).to.eq(Zero)
    expect(juniorCheckpoint.deficit).to.eq(juniorDeficit)
    expect(seniorCheckpoint.deficit).to.eq(Zero)
  })

  it('senior full, junior full, equity empty', async () => {
    const { portfolio, depositToTranches, parseMockToken, wallet, tranches: [equityTranche, juniorTranche, seniorTranche] } = await loadFixture(structuredIndexedPortfolioFixture)
    const timeElapsed = await getHalfPortfolioDuration(portfolio)
    const depositAmounts = DEPOSIT_AMOUNTS.map(parseMockToken)

    await depositToTranches(portfolio, depositAmounts, wallet)

    const startTimestamp = await startAndGetTimestamp(portfolio)

    const assumedTranchesValues = await calculateAssumedTranchesValue(portfolio, depositAmounts, timeElapsed)
    const realJuniorValue = assumedTranchesValues[1]
    const realSeniorValue = assumedTranchesValues[2]
    const realTranchesValues = [Zero, realJuniorValue, realSeniorValue]
    const newVirtualTokenBalance = sumArray(realTranchesValues)
    await portfolio.setVirtualTokenBalance(newVirtualTokenBalance)

    await setNextBlockTimestamp(startTimestamp + timeElapsed)
    await portfolio.updateCheckpoints()

    const [equityCheckpoint, juniorCheckpoint, seniorCheckpoint] = await getDeficitCheckpoints(portfolio)
    expect('updateCheckpointFromPortfolio').to.be.calledOnContractWith(equityTranche, [Zero, Zero])
    expect('updateCheckpointFromPortfolio').to.be.calledOnContractWith(juniorTranche, [realJuniorValue, Zero])
    expect('updateCheckpointFromPortfolio').to.be.calledOnContractWith(seniorTranche, [realSeniorValue, Zero])
    expect(equityCheckpoint.deficit).to.eq(Zero)
    expect(juniorCheckpoint.deficit).to.eq(Zero)
    expect(seniorCheckpoint.deficit).to.eq(Zero)
  })

  it('senior full, junior full, equity surplus', async () => {
    const { portfolio, depositToTranches, parseMockToken, wallet, tranches: [equityTranche, juniorTranche, seniorTranche] } = await loadFixture(structuredIndexedPortfolioFixture)
    const timeElapsed = await getHalfPortfolioDuration(portfolio)
    const depositAmounts = DEPOSIT_AMOUNTS.map(parseMockToken)

    await depositToTranches(portfolio, depositAmounts, wallet)

    const startTimestamp = await startAndGetTimestamp(portfolio)

    const assumedTranchesValues = await calculateAssumedTranchesValue(portfolio, depositAmounts, timeElapsed)
    const realEquityValue = parseMockToken(EQUITY_DEPOSIT_ASSETS * 2)
    const realJuniorValue = assumedTranchesValues[1]
    const realSeniorValue = assumedTranchesValues[2]
    const realTranchesValues = [realEquityValue, realJuniorValue, realSeniorValue]
    const newVirtualTokenBalance = sumArray(realTranchesValues)
    await portfolio.setVirtualTokenBalance(newVirtualTokenBalance)

    await setNextBlockTimestamp(startTimestamp + timeElapsed)
    await portfolio.updateCheckpoints()

    const [equityCheckpoint, juniorCheckpoint, seniorCheckpoint] = await getDeficitCheckpoints(portfolio)
    expect('updateCheckpointFromPortfolio').to.be.calledOnContractWith(equityTranche, [realEquityValue, Zero])
    expect('updateCheckpointFromPortfolio').to.be.calledOnContractWith(juniorTranche, [realJuniorValue, Zero])
    expect('updateCheckpointFromPortfolio').to.be.calledOnContractWith(seniorTranche, [realSeniorValue, Zero])
    expect(equityCheckpoint.deficit).to.eq(Zero)
    expect(juniorCheckpoint.deficit).to.eq(Zero)
    expect(seniorCheckpoint.deficit).to.eq(Zero)
  })

  it('over portfolio duration, no real value', async () => {
    const { portfolio, depositAndCalculateAssumedTranchesValue, parseMockToken, wallet, tranches: [equityTranche, juniorTranche, seniorTranche] } = await loadFixture(structuredIndexedPortfolioFixture)
    const portfolioDuration = await getPortfolioDuration(portfolio)
    const depositAmounts = DEPOSIT_AMOUNTS.map(parseMockToken)
    const assumedTranchesValues = await depositAndCalculateAssumedTranchesValue(depositAmounts, wallet, portfolioDuration)

    const startTimestamp = await startAndGetTimestamp(portfolio)

    await portfolio.setVirtualTokenBalance(Zero)

    await setNextBlockTimestamp(startTimestamp + portfolioDuration * 2)
    await portfolio.updateCheckpoints()

    const [equityCheckpoint, juniorCheckpoint, seniorCheckpoint] = await getDeficitCheckpoints(portfolio)

    const [, expectedJuniorDeficit, expectedSeniorDeficit] = assumedTranchesValues
    expect('updateCheckpointFromPortfolio').to.be.calledOnContractWith(equityTranche, [Zero, Zero])
    expect('updateCheckpointFromPortfolio').to.be.calledOnContractWith(juniorTranche, [Zero, Zero])
    expect('updateCheckpointFromPortfolio').to.be.calledOnContractWith(seniorTranche, [Zero, Zero])
    expect(equityCheckpoint.deficit).to.eq(Zero)
    expect(juniorCheckpoint.deficit).to.eq(expectedJuniorDeficit)
    expect(seniorCheckpoint.deficit).to.eq(expectedSeniorDeficit)
  })

  it('over portfolio duration, with value', async () => {
    const { portfolio, depositAndCalculateAssumedTranchesValue, parseMockToken, wallet, tranches: [equityTranche, juniorTranche, seniorTranche] } = await loadFixture(structuredIndexedPortfolioFixture)
    const portfolioDuration = await getPortfolioDuration(portfolio)
    const depositAmounts = DEPOSIT_AMOUNTS.map(parseMockToken)
    const depositAmountsSum = sumArray(depositAmounts)
    const assumedTranchesValues = await depositAndCalculateAssumedTranchesValue(depositAmounts, wallet, portfolioDuration)

    const startTimestamp = await startAndGetTimestamp(portfolio)

    await portfolio.setVirtualTokenBalance(depositAmountsSum)

    await setNextBlockTimestamp(startTimestamp + portfolioDuration * 2)
    await portfolio.updateCheckpoints()

    const [equityCheckpoint, juniorCheckpoint, seniorCheckpoint] = await getDeficitCheckpoints(portfolio)

    const [, expectedJuniorValue, expectedSeniorValue] = assumedTranchesValues
    const expectedEquityValue = depositAmountsSum.sub(expectedSeniorValue).sub(expectedJuniorValue)
    expect('updateCheckpointFromPortfolio').to.be.calledOnContractWith(equityTranche, [expectedEquityValue, Zero])
    expect('updateCheckpointFromPortfolio').to.be.calledOnContractWith(juniorTranche, [expectedJuniorValue, Zero])
    expect('updateCheckpointFromPortfolio').to.be.calledOnContractWith(seniorTranche, [expectedSeniorValue, Zero])
    expect(equityCheckpoint.deficit).to.eq(Zero)
    expect(juniorCheckpoint.deficit).to.eq(Zero)
    expect(seniorCheckpoint.deficit).to.eq(Zero)
  })
})
