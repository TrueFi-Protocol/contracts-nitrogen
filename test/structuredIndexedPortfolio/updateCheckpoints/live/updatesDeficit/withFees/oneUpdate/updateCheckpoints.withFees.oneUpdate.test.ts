import { Zero } from '@ethersproject/constants'
import { expect, use } from 'chai'
import { solidity } from 'ethereum-waffle'
import { structuredIndexedPortfolioFixture } from 'fixtures/structuredIndexedPortfolioFixture'
import { calculateAssumedTranchesValue } from 'fixtures/utils'
import { setupFixtureLoader } from 'test/setup'
import {
  getHalfPortfolioDuration,
  calculateTranchesValuesAfterFees,
  setNextBlockTimestamp,
  getDeficitCheckpoints,
  setTranchesAndProtocolFeeRates,
  getPortfolioDuration,
  startAndGetTimestamp,
  subtractArrays,
  sumArray,
  subtractFees,
} from 'utils'

use(solidity)

const DEFAULT_PROTOCOL_FEE_RATE = 400
const EQUITY_FEE_RATE = 100
const JUNIOR_FEE_RATE = 200
const SENIOR_FEE_RATE = 300
const TRANCHES_FEE_RATES = [
  EQUITY_FEE_RATE,
  JUNIOR_FEE_RATE,
  SENIOR_FEE_RATE,
]
const EQUITY_DEPOSIT_ASSETS = 1_000_000
const JUNIOR_DEPOSIT_ASSETS = 2_000_000
const SENIOR_DEPOSIT_ASSETS = 3_000_000
const DEPOSIT_AMOUNTS = [
  EQUITY_DEPOSIT_ASSETS,
  JUNIOR_DEPOSIT_ASSETS,
  SENIOR_DEPOSIT_ASSETS,
]

describe('StructuredIndexedPortfolio.updateCheckpoints.withFees.oneUpdate', () => {
  const loadFixture = setupFixtureLoader()

  it('senior empty, junior empty, equity empty', async () => {
    const { portfolio, depositToTranches, parseMockToken, wallet, protocolConfig, tranches } = await loadFixture(structuredIndexedPortfolioFixture)
    const [equityTranche, juniorTranche, seniorTranche] = tranches
    const timeElapsed = await getHalfPortfolioDuration(portfolio)
    const depositAmounts = DEPOSIT_AMOUNTS.map(parseMockToken)

    await setTranchesAndProtocolFeeRates(protocolConfig, tranches, DEFAULT_PROTOCOL_FEE_RATE, TRANCHES_FEE_RATES)
    await depositToTranches(portfolio, depositAmounts, wallet)

    const startTimestamp = await startAndGetTimestamp(portfolio)

    const assumedTranchesValues = await calculateAssumedTranchesValue(portfolio, depositAmounts, timeElapsed)
    const realTranchesValues = [Zero, Zero, Zero]

    await portfolio.setVirtualTokenBalance(Zero)
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
    const { portfolio, depositToTranches, parseMockToken, wallet, protocolConfig, tranches } = await loadFixture(structuredIndexedPortfolioFixture)
    const [equityTranche, juniorTranche, seniorTranche] = tranches
    const timeElapsed = await getHalfPortfolioDuration(portfolio)
    const depositAmounts = DEPOSIT_AMOUNTS.map(parseMockToken)

    await setTranchesAndProtocolFeeRates(protocolConfig, tranches, DEFAULT_PROTOCOL_FEE_RATE, TRANCHES_FEE_RATES)
    await depositToTranches(portfolio, depositAmounts, wallet)

    const startTimestamp = await startAndGetTimestamp(portfolio)

    const assumedTranchesValues = await calculateAssumedTranchesValue(portfolio, depositAmounts, timeElapsed)

    const realSeniorValue = assumedTranchesValues[2].div(3)
    const realTranchesValues = [Zero, Zero, realSeniorValue]
    const realTranchesValuesAfterFees = calculateTranchesValuesAfterFees(tranches, TRANCHES_FEE_RATES, realTranchesValues, DEFAULT_PROTOCOL_FEE_RATE, timeElapsed)

    const assumedTranchesFees = subtractArrays(realTranchesValues, realTranchesValuesAfterFees)
    const assumedTranchesValuesAfterFees = subtractArrays(assumedTranchesValues, assumedTranchesFees)

    await portfolio.setVirtualTokenBalance(sumArray(realTranchesValues))
    await setNextBlockTimestamp(startTimestamp + timeElapsed)
    await portfolio.updateCheckpoints()

    const [,, expectedSeniorValue] = realTranchesValuesAfterFees
    const [, juniorDeficit, seniorDeficit] = subtractArrays(assumedTranchesValuesAfterFees, realTranchesValuesAfterFees)
    const [equityCheckpoint, juniorCheckpoint, seniorCheckpoint] = await getDeficitCheckpoints(portfolio)
    expect('updateCheckpointFromPortfolio').to.be.calledOnContractWith(equityTranche, [Zero, Zero])
    expect('updateCheckpointFromPortfolio').to.be.calledOnContractWith(juniorTranche, [Zero, juniorDeficit])
    expect('updateCheckpointFromPortfolio').to.be.calledOnContractWith(seniorTranche, [expectedSeniorValue, seniorDeficit])
    expect(equityCheckpoint.deficit).to.eq(Zero)
    expect(juniorCheckpoint.deficit).to.eq(juniorDeficit)
    expect(seniorCheckpoint.deficit).to.eq(seniorDeficit)
  })

  it('senior full, junior empty, equity empty', async () => {
    const { portfolio, depositToTranches, parseMockToken, wallet, protocolConfig, tranches } = await loadFixture(structuredIndexedPortfolioFixture)
    const [equityTranche, juniorTranche, seniorTranche] = tranches
    const timeElapsed = await getHalfPortfolioDuration(portfolio)
    const depositAmounts = DEPOSIT_AMOUNTS.map(parseMockToken)

    await setTranchesAndProtocolFeeRates(protocolConfig, tranches, DEFAULT_PROTOCOL_FEE_RATE, TRANCHES_FEE_RATES)
    await depositToTranches(portfolio, depositAmounts, wallet)

    const startTimestamp = await startAndGetTimestamp(portfolio)

    const assumedTranchesValues = await calculateAssumedTranchesValue(portfolio, depositAmounts, timeElapsed)

    const realSeniorValue = assumedTranchesValues[2]
    const realTranchesValues = [Zero, Zero, realSeniorValue]
    const realTranchesValuesAfterFees = calculateTranchesValuesAfterFees(tranches, TRANCHES_FEE_RATES, realTranchesValues, DEFAULT_PROTOCOL_FEE_RATE, timeElapsed)

    const assumedTranchesFees = subtractArrays(realTranchesValues, realTranchesValuesAfterFees)
    const assumedTranchesValuesAfterFees = subtractArrays(assumedTranchesValues, assumedTranchesFees)

    const feesPaid = sumArray(realTranchesValues).sub(sumArray(realTranchesValuesAfterFees))

    await portfolio.setVirtualTokenBalance(sumArray(realTranchesValues))
    await setNextBlockTimestamp(startTimestamp + timeElapsed)
    await portfolio.updateCheckpoints()

    const [,, expectedSeniorValue] = realTranchesValuesAfterFees
    const [, juniorDeficit] = subtractArrays(assumedTranchesValuesAfterFees, realTranchesValuesAfterFees)
    const [equityCheckpoint, juniorCheckpoint, seniorCheckpoint] = await getDeficitCheckpoints(portfolio)
    expect('updateCheckpointFromPortfolio').to.be.calledOnContractWith(equityTranche, [Zero, Zero])
    expect('updateCheckpointFromPortfolio').to.be.calledOnContractWith(juniorTranche, [Zero, Zero])
    expect('updateCheckpointFromPortfolio').to.be.calledOnContractWith(seniorTranche, [expectedSeniorValue, Zero])
    expect(equityCheckpoint.deficit).to.eq(Zero)
    expect(juniorCheckpoint.deficit).to.eq(juniorDeficit)
    expect(seniorCheckpoint.deficit).to.eq(Zero)
    expect(await portfolio.virtualTokenBalance()).to.eq(sumArray(realTranchesValues).sub(feesPaid))
  })

  it('senior full, junior underflow, equity empty', async () => {
    const { portfolio, depositToTranches, parseMockToken, wallet, protocolConfig, tranches } = await loadFixture(structuredIndexedPortfolioFixture)
    const [equityTranche, juniorTranche, seniorTranche] = tranches
    const timeElapsed = await getHalfPortfolioDuration(portfolio)
    const depositAmounts = DEPOSIT_AMOUNTS.map(parseMockToken)

    await setTranchesAndProtocolFeeRates(protocolConfig, tranches, DEFAULT_PROTOCOL_FEE_RATE, TRANCHES_FEE_RATES)
    await depositToTranches(portfolio, depositAmounts, wallet)

    const startTimestamp = await startAndGetTimestamp(portfolio)

    const assumedTranchesValues = await calculateAssumedTranchesValue(portfolio, depositAmounts, timeElapsed)
    const assumedTranchesValuesAfterFees = calculateTranchesValuesAfterFees(tranches, TRANCHES_FEE_RATES, assumedTranchesValues, DEFAULT_PROTOCOL_FEE_RATE, timeElapsed)

    const realJuniorValue = assumedTranchesValues[1]
    const realSeniorValue = assumedTranchesValues[2]
    const realTranchesValues = [Zero, realJuniorValue, realSeniorValue]
    const realTranchesValuesAfterFees = calculateTranchesValuesAfterFees(tranches, TRANCHES_FEE_RATES, realTranchesValues, DEFAULT_PROTOCOL_FEE_RATE, timeElapsed)

    await portfolio.setVirtualTokenBalance(sumArray(realTranchesValues))
    await setNextBlockTimestamp(startTimestamp + timeElapsed)
    await portfolio.updateCheckpoints()

    const [, expectedJuniorValue, expectedSeniorValue] = realTranchesValuesAfterFees
    const [, juniorDeficit] = subtractArrays(assumedTranchesValuesAfterFees, realTranchesValuesAfterFees)
    const [equityCheckpoint, juniorCheckpoint, seniorCheckpoint] = await getDeficitCheckpoints(portfolio)
    expect('updateCheckpointFromPortfolio').to.be.calledOnContractWith(equityTranche, [Zero, Zero])
    expect('updateCheckpointFromPortfolio').to.be.calledOnContractWith(juniorTranche, [expectedJuniorValue, Zero])
    expect('updateCheckpointFromPortfolio').to.be.calledOnContractWith(seniorTranche, [expectedSeniorValue, Zero])
    expect(equityCheckpoint.deficit).to.eq(Zero)
    expect(juniorCheckpoint.deficit).to.eq(juniorDeficit)
    expect(seniorCheckpoint.deficit).to.eq(Zero)
  })

  it('senior full, junior full, equity empty', async () => {
    const { portfolio, depositToTranches, parseMockToken, wallet, protocolConfig, tranches } = await loadFixture(structuredIndexedPortfolioFixture)
    const [equityTranche, juniorTranche, seniorTranche] = tranches
    const timeElapsed = await getHalfPortfolioDuration(portfolio)
    const depositAmounts = DEPOSIT_AMOUNTS.map(parseMockToken)

    await setTranchesAndProtocolFeeRates(protocolConfig, tranches, DEFAULT_PROTOCOL_FEE_RATE, TRANCHES_FEE_RATES)
    await depositToTranches(portfolio, depositAmounts, wallet)

    const startTimestamp = await startAndGetTimestamp(portfolio)

    const assumedTranchesValues = await calculateAssumedTranchesValue(portfolio, depositAmounts, timeElapsed)

    const realJuniorValue = assumedTranchesValues[1]
    const realSeniorValue = assumedTranchesValues[2]
    const realTranchesValues = [Zero, realJuniorValue, realSeniorValue]
    const realTranchesValuesAfterFees = calculateTranchesValuesAfterFees(tranches, TRANCHES_FEE_RATES, realTranchesValues, DEFAULT_PROTOCOL_FEE_RATE, timeElapsed)

    await portfolio.setVirtualTokenBalance(sumArray(realTranchesValues))
    await setNextBlockTimestamp(startTimestamp + timeElapsed)
    await portfolio.updateCheckpoints()

    const [, expectedJuniorValue, expectedSeniorValue] = realTranchesValuesAfterFees
    const [equityCheckpoint, juniorCheckpoint, seniorCheckpoint] = await getDeficitCheckpoints(portfolio)
    expect('updateCheckpointFromPortfolio').to.be.calledOnContractWith(equityTranche, [Zero, Zero])
    expect('updateCheckpointFromPortfolio').to.be.calledOnContractWith(juniorTranche, [expectedJuniorValue, Zero])
    expect('updateCheckpointFromPortfolio').to.be.calledOnContractWith(seniorTranche, [expectedSeniorValue, Zero])
    expect(equityCheckpoint.deficit).to.eq(Zero)
    expect(juniorCheckpoint.deficit).to.eq(Zero)
    expect(seniorCheckpoint.deficit).to.eq(Zero)
  })

  it('senior full, junior full, equity surplus', async () => {
    const { portfolio, depositToTranches, parseMockToken, wallet, protocolConfig, tranches } = await loadFixture(structuredIndexedPortfolioFixture)
    const [equityTranche, juniorTranche, seniorTranche] = tranches
    const timeElapsed = await getHalfPortfolioDuration(portfolio)
    const depositAmounts = DEPOSIT_AMOUNTS.map(parseMockToken)

    await setTranchesAndProtocolFeeRates(protocolConfig, tranches, DEFAULT_PROTOCOL_FEE_RATE, TRANCHES_FEE_RATES)
    await depositToTranches(portfolio, depositAmounts, wallet)

    const startTimestamp = await startAndGetTimestamp(portfolio)

    const assumedTranchesValues = await calculateAssumedTranchesValue(portfolio, depositAmounts, timeElapsed)

    const realEquityValue = parseMockToken(1_000)
    const realJuniorValue = assumedTranchesValues[1]
    const realSeniorValue = assumedTranchesValues[2]
    const realTranchesValues = [realEquityValue, realJuniorValue, realSeniorValue]
    const realTranchesValuesAfterFees = calculateTranchesValuesAfterFees(tranches, TRANCHES_FEE_RATES, realTranchesValues, DEFAULT_PROTOCOL_FEE_RATE, timeElapsed)

    await portfolio.setVirtualTokenBalance(sumArray(realTranchesValues))
    await setNextBlockTimestamp(startTimestamp + timeElapsed)
    await portfolio.updateCheckpoints()

    const [expectedEquityValue, expectedJuniorValue, expectedSeniorValue] = realTranchesValuesAfterFees
    const [equityCheckpoint, juniorCheckpoint, seniorCheckpoint] = await getDeficitCheckpoints(portfolio)
    expect('updateCheckpointFromPortfolio').to.be.calledOnContractWith(equityTranche, [expectedEquityValue, Zero])
    expect('updateCheckpointFromPortfolio').to.be.calledOnContractWith(juniorTranche, [expectedJuniorValue, Zero])
    expect('updateCheckpointFromPortfolio').to.be.calledOnContractWith(seniorTranche, [expectedSeniorValue, Zero])
    expect(equityCheckpoint.deficit).to.eq(Zero)
    expect(juniorCheckpoint.deficit).to.eq(Zero)
    expect(seniorCheckpoint.deficit).to.eq(Zero)
  })

  it('over portfolio duration, no real value', async () => {
    const { portfolio, protocolConfig, depositAndCalculateAssumedTranchesValue, parseMockToken, wallet, tranches } = await loadFixture(structuredIndexedPortfolioFixture)
    const [equityTranche, juniorTranche, seniorTranche] = tranches
    const portfolioDuration = await getPortfolioDuration(portfolio)
    const depositAmounts = DEPOSIT_AMOUNTS.map(parseMockToken)

    await setTranchesAndProtocolFeeRates(protocolConfig, tranches, DEFAULT_PROTOCOL_FEE_RATE, TRANCHES_FEE_RATES)
    const [, expectedJuniorDeficit, expectedSeniorDeficit] = await depositAndCalculateAssumedTranchesValue(depositAmounts, wallet, portfolioDuration)

    const startTimestamp = await startAndGetTimestamp(portfolio)

    await portfolio.setVirtualTokenBalance(Zero)

    await setNextBlockTimestamp(startTimestamp + portfolioDuration * 2)
    await portfolio.updateCheckpoints()

    const [equityCheckpoint, juniorCheckpoint, seniorCheckpoint] = await getDeficitCheckpoints(portfolio)

    expect('updateCheckpointFromPortfolio').to.be.calledOnContractWith(equityTranche, [Zero, Zero])
    expect('updateCheckpointFromPortfolio').to.be.calledOnContractWith(juniorTranche, [Zero, Zero])
    expect('updateCheckpointFromPortfolio').to.be.calledOnContractWith(seniorTranche, [Zero, Zero])
    expect(equityCheckpoint.deficit).to.eq(Zero)
    expect(juniorCheckpoint.deficit).to.eq(expectedJuniorDeficit)
    expect(seniorCheckpoint.deficit).to.eq(expectedSeniorDeficit)
  })

  it('over portfolio duration, with value', async () => {
    const { portfolio, protocolConfig, depositAndCalculateAssumedTranchesValue, parseMockToken, wallet, tranches } = await loadFixture(structuredIndexedPortfolioFixture)
    const [equityTranche, juniorTranche, seniorTranche] = tranches
    const portfolioDuration = await getPortfolioDuration(portfolio)
    const depositAmounts = DEPOSIT_AMOUNTS.map(parseMockToken)
    const depositAmountsSum = sumArray(depositAmounts)

    await setTranchesAndProtocolFeeRates(protocolConfig, tranches, DEFAULT_PROTOCOL_FEE_RATE, TRANCHES_FEE_RATES)
    const assumedTranchesValues = await depositAndCalculateAssumedTranchesValue(depositAmounts, wallet, portfolioDuration)
    const assumedTranchesValuesAfterFees = calculateTranchesValuesAfterFees(tranches, TRANCHES_FEE_RATES, assumedTranchesValues, DEFAULT_PROTOCOL_FEE_RATE, portfolioDuration * 2)

    const startTimestamp = await startAndGetTimestamp(portfolio)

    const virtualTokenBalance = depositAmountsSum.mul(2)
    await portfolio.setVirtualTokenBalance(virtualTokenBalance)

    await setNextBlockTimestamp(startTimestamp + portfolioDuration * 2)
    await portfolio.updateCheckpoints()

    const [equityCheckpoint, juniorCheckpoint, seniorCheckpoint] = await getDeficitCheckpoints(portfolio)

    const [, expectedJuniorValue, expectedSeniorValue] = assumedTranchesValuesAfterFees
    const expectedEquityValueBeforeFees = virtualTokenBalance.sub(assumedTranchesValues[1]).sub(assumedTranchesValues[2])
    const expectedEquityValue = subtractFees(expectedEquityValueBeforeFees, portfolioDuration * 2, DEFAULT_PROTOCOL_FEE_RATE, EQUITY_FEE_RATE)

    expect('updateCheckpointFromPortfolio').to.be.calledOnContractWith(equityTranche, [expectedEquityValue, Zero])
    expect('updateCheckpointFromPortfolio').to.be.calledOnContractWith(juniorTranche, [expectedJuniorValue, Zero])
    expect('updateCheckpointFromPortfolio').to.be.calledOnContractWith(seniorTranche, [expectedSeniorValue, Zero])
    expect(equityCheckpoint.deficit).to.eq(Zero)
    expect(juniorCheckpoint.deficit).to.eq(Zero)
    expect(seniorCheckpoint.deficit).to.eq(Zero)
  })
})
