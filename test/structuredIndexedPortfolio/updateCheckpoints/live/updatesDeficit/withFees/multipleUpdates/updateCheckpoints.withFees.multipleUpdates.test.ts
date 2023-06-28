import { Zero } from '@ethersproject/constants'
import { expect, use } from 'chai'
import { solidity } from 'ethereum-waffle'
import { structuredIndexedPortfolioFixture } from 'fixtures/structuredIndexedPortfolioFixture'
import { calculateAssumedTranchesValue } from 'fixtures/utils'
import { setupFixtureLoader } from 'test/setup'
import {
  calculateTranchesValuesAfterFees,
  setNextBlockTimestamp,
  setTranchesAndProtocolFeeRates,
  getQuarterPortfolioDuration,
  getPortfolioDurationFraction,
  calculateAssumedTranchesValuesAfterMultipleUpdates,
  startAndGetTimestamp,
  subtractArrays,
  sumArray,
  calculateInterest,
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

describe('StructuredIndexedPortfolio.updateCheckPoints.withFees.multipleUpdates', () => {
  const loadFixture = setupFixtureLoader()

  it('senior empty, junior empty, equity empty', async () => {
    const { portfolio, depositToTranches, parseMockToken, wallet, protocolConfig, tranches } = await loadFixture(structuredIndexedPortfolioFixture)
    const [equityTranche, juniorTranche, seniorTranche] = tranches
    const updatesNumber = 4
    const timeElapsed = await getPortfolioDurationFraction(portfolio, updatesNumber)
    const depositAmounts = DEPOSIT_AMOUNTS.map(parseMockToken)
    const realTranchesValues = [Zero, Zero, Zero]

    await setTranchesAndProtocolFeeRates(protocolConfig, tranches, DEFAULT_PROTOCOL_FEE_RATE, TRANCHES_FEE_RATES)
    await depositToTranches(portfolio, depositAmounts, wallet)

    const startTimestamp = await startAndGetTimestamp(portfolio)
    await portfolio.setVirtualTokenBalance(Zero)

    let assumedTranchesValues = depositAmounts
    for (let i = 1; i < updatesNumber; i++) {
      await setNextBlockTimestamp(startTimestamp + timeElapsed * i)
      await portfolio.updateCheckpoints()

      assumedTranchesValues = await calculateAssumedTranchesValue(portfolio, assumedTranchesValues, timeElapsed)
      const [, juniorDeficit, seniorDeficit] = subtractArrays(assumedTranchesValues, realTranchesValues)

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
    const { portfolio, depositToTranches, parseMockToken, wallet, protocolConfig, tranches, token, managerFeeBeneficiary } = await loadFixture(structuredIndexedPortfolioFixture)
    const [equityTranche, juniorTranche, seniorTranche] = tranches
    const timeElapsed = await getQuarterPortfolioDuration(portfolio)
    const depositAmounts = DEPOSIT_AMOUNTS.map(parseMockToken)
    const treasury = await protocolConfig.protocolTreasury()

    await setTranchesAndProtocolFeeRates(protocolConfig, tranches, DEFAULT_PROTOCOL_FEE_RATE, TRANCHES_FEE_RATES)
    await depositToTranches(portfolio, depositAmounts, wallet)
    const startTimestamp = await startAndGetTimestamp(portfolio)
    await portfolio.setVirtualTokenBalance(Zero)

    await setNextBlockTimestamp(startTimestamp + timeElapsed)
    await portfolio.updateCheckpoints()

    const assumedTranchesValues = await calculateAssumedTranchesValuesAfterMultipleUpdates(portfolio, depositAmounts, timeElapsed, 2)

    const realSeniorValue = assumedTranchesValues[2].div(2)
    const realTranchesValues = [Zero, Zero, realSeniorValue]
    const realTranchesValuesAfterFees = calculateTranchesValuesAfterFees(tranches, TRANCHES_FEE_RATES, realTranchesValues, DEFAULT_PROTOCOL_FEE_RATE, timeElapsed)

    const assumedTranchesFees = subtractArrays(realTranchesValues, realTranchesValuesAfterFees)
    const assumedTranchesValuesAfterFees = subtractArrays(assumedTranchesValues, assumedTranchesFees)

    const virtualTokenBalance = sumArray(realTranchesValues)
    await portfolio.setVirtualTokenBalance(virtualTokenBalance)

    await setNextBlockTimestamp(startTimestamp + timeElapsed * 2)
    await portfolio.updateCheckpoints()

    const protocolFeePaid = calculateInterest(DEFAULT_PROTOCOL_FEE_RATE, timeElapsed, realSeniorValue)
    const managerFeePaid = calculateInterest(SENIOR_FEE_RATE, timeElapsed, realSeniorValue)
    const expectedSeniorValue = realTranchesValuesAfterFees[2]
    const [, juniorDeficit, seniorDeficit] = subtractArrays(assumedTranchesValuesAfterFees, realTranchesValuesAfterFees)

    const equityCheckpoint = await equityTranche.getCheckpoint()
    const juniorCheckpoint = await juniorTranche.getCheckpoint()
    const seniorCheckpoint = await seniorTranche.getCheckpoint()
    expect('updateCheckpointFromPortfolio').to.be.calledOnContractWith(equityTranche, [Zero])
    expect('updateCheckpointFromPortfolio').to.be.calledOnContractWith(juniorTranche, [Zero])
    expect('updateCheckpointFromPortfolio').to.be.calledOnContractWith(seniorTranche, [expectedSeniorValue])
    expect(equityCheckpoint.deficit).to.eq(Zero)
    expect(juniorCheckpoint.deficit).to.eq(juniorDeficit)
    expect(seniorCheckpoint.deficit).to.eq(seniorDeficit)
    expect(await token.balanceOf(treasury)).to.eq(protocolFeePaid)
    expect(await token.balanceOf(managerFeeBeneficiary.address)).to.eq(managerFeePaid)
    expect(await portfolio.virtualTokenBalance()).to.eq(expectedSeniorValue)
  })

  it('senior deficit comes back', async () => {
    const { portfolio, depositToTranches, parseMockToken, wallet, protocolConfig, tranches } = await loadFixture(structuredIndexedPortfolioFixture)
    const [equityTranche, juniorTranche, seniorTranche] = tranches
    const timeElapsed = await getQuarterPortfolioDuration(portfolio)
    const depositAmounts = DEPOSIT_AMOUNTS.map(parseMockToken)

    await setTranchesAndProtocolFeeRates(protocolConfig, tranches, DEFAULT_PROTOCOL_FEE_RATE, TRANCHES_FEE_RATES)
    await depositToTranches(portfolio, depositAmounts, wallet)
    const startTimestamp = await startAndGetTimestamp(portfolio)
    await portfolio.setVirtualTokenBalance(Zero)

    await setNextBlockTimestamp(startTimestamp + timeElapsed)
    await portfolio.updateCheckpoints()

    const assumedTranchesValues = await calculateAssumedTranchesValuesAfterMultipleUpdates(portfolio, depositAmounts, timeElapsed, 2)

    const realSeniorValue = assumedTranchesValues[2]
    const realTranchesValues = [Zero, Zero, realSeniorValue]
    const realTranchesValuesAfterFees = calculateTranchesValuesAfterFees(tranches, TRANCHES_FEE_RATES, realTranchesValues, DEFAULT_PROTOCOL_FEE_RATE, timeElapsed)

    const assumedTranchesFees = subtractArrays(realTranchesValues, realTranchesValuesAfterFees)
    const assumedTranchesValuesAfterFees = subtractArrays(assumedTranchesValues, assumedTranchesFees)

    await portfolio.setVirtualTokenBalance(sumArray(realTranchesValues))
    await setNextBlockTimestamp(startTimestamp + timeElapsed * 2)
    await portfolio.updateCheckpoints()

    const expectedSeniorValue = realTranchesValuesAfterFees[2]
    const [, juniorDeficit] = subtractArrays(assumedTranchesValuesAfterFees, realTranchesValuesAfterFees)

    const equityCheckpoint = await equityTranche.getCheckpoint()
    const juniorCheckpoint = await juniorTranche.getCheckpoint()
    const seniorCheckpoint = await seniorTranche.getCheckpoint()
    expect('updateCheckpointFromPortfolio').to.be.calledOnContractWith(equityTranche, [Zero])
    expect('updateCheckpointFromPortfolio').to.be.calledOnContractWith(juniorTranche, [Zero])
    expect('updateCheckpointFromPortfolio').to.be.calledOnContractWith(seniorTranche, [expectedSeniorValue])
    expect(equityCheckpoint.deficit).to.eq(Zero)
    expect(juniorCheckpoint.deficit).to.eq(juniorDeficit)
    expect(seniorCheckpoint.deficit).to.eq(Zero)
  })

  it('junior deficit partially comes back', async () => {
    const { portfolio, depositToTranches, parseMockToken, wallet, protocolConfig, tranches } = await loadFixture(structuredIndexedPortfolioFixture)
    const [equityTranche, juniorTranche, seniorTranche] = tranches
    const timeElapsed = await getQuarterPortfolioDuration(portfolio)
    const depositAmounts = DEPOSIT_AMOUNTS.map(parseMockToken)

    await setTranchesAndProtocolFeeRates(protocolConfig, tranches, DEFAULT_PROTOCOL_FEE_RATE, TRANCHES_FEE_RATES)
    await depositToTranches(portfolio, depositAmounts, wallet)
    const startTimestamp = await startAndGetTimestamp(portfolio)
    await portfolio.setVirtualTokenBalance(Zero)

    await setNextBlockTimestamp(startTimestamp + timeElapsed)
    await portfolio.updateCheckpoints()

    const assumedTranchesValues = await calculateAssumedTranchesValuesAfterMultipleUpdates(portfolio, depositAmounts, timeElapsed, 2)

    const realJuniorValue = assumedTranchesValues[1].div(3)
    const realSeniorValue = assumedTranchesValues[2]
    const realTranchesValues = [Zero, realJuniorValue, realSeniorValue]
    const realTranchesValuesAfterFees = calculateTranchesValuesAfterFees(tranches, TRANCHES_FEE_RATES, realTranchesValues, DEFAULT_PROTOCOL_FEE_RATE, timeElapsed)

    const assumedTranchesFees = subtractArrays(realTranchesValues, realTranchesValuesAfterFees)
    const assumedTranchesValuesAfterFees = subtractArrays(assumedTranchesValues, assumedTranchesFees)

    await portfolio.setVirtualTokenBalance(sumArray(realTranchesValues))
    await setNextBlockTimestamp(startTimestamp + timeElapsed * 2)
    await portfolio.updateCheckpoints()

    const [, expectedJuniorValue, expectedSeniorValue] = realTranchesValuesAfterFees
    const [, juniorDeficit] = subtractArrays(assumedTranchesValuesAfterFees, realTranchesValuesAfterFees)

    const equityCheckpoint = await equityTranche.getCheckpoint()
    const juniorCheckpoint = await juniorTranche.getCheckpoint()
    const seniorCheckpoint = await seniorTranche.getCheckpoint()
    expect('updateCheckpointFromPortfolio').to.be.calledOnContractWith(equityTranche, [Zero])
    expect('updateCheckpointFromPortfolio').to.be.calledOnContractWith(juniorTranche, [expectedJuniorValue])
    expect('updateCheckpointFromPortfolio').to.be.calledOnContractWith(seniorTranche, [expectedSeniorValue])
    expect(equityCheckpoint.deficit).to.eq(Zero)
    expect(juniorCheckpoint.deficit).to.eq(juniorDeficit)
    expect(seniorCheckpoint.deficit).to.eq(Zero)
  })

  it('junior deficit comes back', async () => {
    const { portfolio, depositToTranches, parseMockToken, wallet, protocolConfig, tranches } = await loadFixture(structuredIndexedPortfolioFixture)
    const [equityTranche, juniorTranche, seniorTranche] = tranches
    const timeElapsed = await getQuarterPortfolioDuration(portfolio)
    const depositAmounts = DEPOSIT_AMOUNTS.map(parseMockToken)

    await setTranchesAndProtocolFeeRates(protocolConfig, tranches, DEFAULT_PROTOCOL_FEE_RATE, TRANCHES_FEE_RATES)
    await depositToTranches(portfolio, depositAmounts, wallet)
    const startTimestamp = await startAndGetTimestamp(portfolio)
    await portfolio.setVirtualTokenBalance(Zero)

    await setNextBlockTimestamp(startTimestamp + timeElapsed)
    await portfolio.updateCheckpoints()

    const assumedTranchesValues = await calculateAssumedTranchesValuesAfterMultipleUpdates(portfolio, depositAmounts, timeElapsed, 2)

    const realJuniorValue = assumedTranchesValues[1]
    const realSeniorValue = assumedTranchesValues[2]
    const realTranchesValues = [Zero, realJuniorValue, realSeniorValue]
    const realTranchesValuesAfterFees = calculateTranchesValuesAfterFees(tranches, TRANCHES_FEE_RATES, realTranchesValues, DEFAULT_PROTOCOL_FEE_RATE, timeElapsed)

    await portfolio.setVirtualTokenBalance(sumArray(realTranchesValues))
    await setNextBlockTimestamp(startTimestamp + timeElapsed * 2)
    await portfolio.updateCheckpoints()

    const [, expectedJuniorValue, expectedSeniorValue] = realTranchesValuesAfterFees

    const equityCheckpoint = await equityTranche.getCheckpoint()
    const juniorCheckpoint = await juniorTranche.getCheckpoint()
    const seniorCheckpoint = await seniorTranche.getCheckpoint()
    expect('updateCheckpointFromPortfolio').to.be.calledOnContractWith(equityTranche, [Zero])
    expect('updateCheckpointFromPortfolio').to.be.calledOnContractWith(juniorTranche, [expectedJuniorValue])
    expect('updateCheckpointFromPortfolio').to.be.calledOnContractWith(seniorTranche, [expectedSeniorValue])
    expect(equityCheckpoint.deficit).to.eq(Zero)
    expect(juniorCheckpoint.deficit).to.eq(Zero)
    expect(seniorCheckpoint.deficit).to.eq(Zero)
  })

  it('equity surplus', async () => {
    const { portfolio, depositToTranches, parseMockToken, wallet, protocolConfig, tranches } = await loadFixture(structuredIndexedPortfolioFixture)
    const [equityTranche, juniorTranche, seniorTranche] = tranches
    const timeElapsed = await getQuarterPortfolioDuration(portfolio)
    const depositAmounts = DEPOSIT_AMOUNTS.map(parseMockToken)

    await setTranchesAndProtocolFeeRates(protocolConfig, tranches, DEFAULT_PROTOCOL_FEE_RATE, TRANCHES_FEE_RATES)
    await depositToTranches(portfolio, depositAmounts, wallet)
    const startTimestamp = await startAndGetTimestamp(portfolio)
    await portfolio.setVirtualTokenBalance(Zero)

    await setNextBlockTimestamp(startTimestamp + timeElapsed)
    await portfolio.updateCheckpoints()

    const assumedTranchesValues = await calculateAssumedTranchesValuesAfterMultipleUpdates(portfolio, depositAmounts, timeElapsed, 2)

    const realEquityValue = parseMockToken(1_000)
    const realJuniorValue = assumedTranchesValues[1]
    const realSeniorValue = assumedTranchesValues[2]
    const realTranchesValues = [realEquityValue, realJuniorValue, realSeniorValue]
    const realTranchesValuesAfterFees = calculateTranchesValuesAfterFees(tranches, TRANCHES_FEE_RATES, realTranchesValues, DEFAULT_PROTOCOL_FEE_RATE, timeElapsed)

    await portfolio.setVirtualTokenBalance(sumArray(realTranchesValues))
    await setNextBlockTimestamp(startTimestamp + timeElapsed * 2)
    await portfolio.updateCheckpoints()

    const [expectedEquityValue, expectedJuniorValue, expectedSeniorValue] = realTranchesValuesAfterFees

    const equityCheckpoint = await equityTranche.getCheckpoint()
    const juniorCheckpoint = await juniorTranche.getCheckpoint()
    const seniorCheckpoint = await seniorTranche.getCheckpoint()
    expect('updateCheckpointFromPortfolio').to.be.calledOnContractWith(equityTranche, [expectedEquityValue])
    expect('updateCheckpointFromPortfolio').to.be.calledOnContractWith(juniorTranche, [expectedJuniorValue])
    expect('updateCheckpointFromPortfolio').to.be.calledOnContractWith(seniorTranche, [expectedSeniorValue])
    expect(equityCheckpoint.deficit).to.eq(Zero)
    expect(juniorCheckpoint.deficit).to.eq(Zero)
    expect(seniorCheckpoint.deficit).to.eq(Zero)
  })

  it('equity loses value', async () => {
    const { portfolio, protocolConfig, depositToTranches, parseMockToken, wallet, tranches } = await loadFixture(structuredIndexedPortfolioFixture)
    const [equityTranche, juniorTranche, seniorTranche] = tranches
    const timeElapsed = await getQuarterPortfolioDuration(portfolio)
    const depositAmounts = DEPOSIT_AMOUNTS.map(parseMockToken)

    await setTranchesAndProtocolFeeRates(protocolConfig, tranches, DEFAULT_PROTOCOL_FEE_RATE, TRANCHES_FEE_RATES)
    await depositToTranches(portfolio, depositAmounts, wallet)

    const startTimestamp = await startAndGetTimestamp(portfolio)

    const correctValues = await calculateAssumedTranchesValuesAfterMultipleUpdates(portfolio, depositAmounts, timeElapsed)
    await portfolio.setVirtualTokenBalance(sumArray(correctValues))

    await setNextBlockTimestamp(startTimestamp + timeElapsed)
    await portfolio.updateCheckpoints()

    const assumedTranchesValues = await calculateAssumedTranchesValuesAfterMultipleUpdates(portfolio, depositAmounts, timeElapsed, 2)

    const juniorRealValue = assumedTranchesValues[1]
    const seniorRealValue = assumedTranchesValues[2]
    const realTranchesValues = [Zero, juniorRealValue, seniorRealValue]
    const realTranchesValuesAfterFees = calculateTranchesValuesAfterFees(tranches, TRANCHES_FEE_RATES, realTranchesValues, DEFAULT_PROTOCOL_FEE_RATE, timeElapsed)

    await portfolio.setVirtualTokenBalance(sumArray(realTranchesValues))

    await setNextBlockTimestamp(startTimestamp + timeElapsed * 2)
    await portfolio.updateCheckpoints()

    const [, expectedJuniorValue, expectedSeniorValue] = realTranchesValuesAfterFees
    const equityCheckpoint = await equityTranche.getCheckpoint()
    const juniorCheckpoint = await juniorTranche.getCheckpoint()
    const seniorCheckpoint = await seniorTranche.getCheckpoint()
    expect('updateCheckpointFromPortfolio').to.be.calledOnContractWith(equityTranche, [Zero])
    expect('updateCheckpointFromPortfolio').to.be.calledOnContractWith(juniorTranche, [expectedJuniorValue])
    expect('updateCheckpointFromPortfolio').to.be.calledOnContractWith(seniorTranche, [expectedSeniorValue])
    expect(equityCheckpoint.deficit).to.eq(Zero)
    expect(juniorCheckpoint.deficit).to.eq(Zero)
    expect(seniorCheckpoint.deficit).to.eq(Zero)
  })

  it('junior loses value', async () => {
    const { portfolio, protocolConfig, depositToTranches, parseMockToken, wallet, tranches } = await loadFixture(structuredIndexedPortfolioFixture)
    const [equityTranche, juniorTranche, seniorTranche] = tranches
    const timeElapsed = await getQuarterPortfolioDuration(portfolio)
    const depositAmounts = DEPOSIT_AMOUNTS.map(parseMockToken)

    await setTranchesAndProtocolFeeRates(protocolConfig, tranches, DEFAULT_PROTOCOL_FEE_RATE, TRANCHES_FEE_RATES)
    await depositToTranches(portfolio, depositAmounts, wallet)

    const startTimestamp = await startAndGetTimestamp(portfolio)

    const correctValuesBeforeFees = await calculateAssumedTranchesValue(portfolio, depositAmounts, timeElapsed)
    const correctValues = calculateTranchesValuesAfterFees(tranches, TRANCHES_FEE_RATES, correctValuesBeforeFees, DEFAULT_PROTOCOL_FEE_RATE, timeElapsed)
    await portfolio.setVirtualTokenBalance(sumArray(correctValues))

    await setNextBlockTimestamp(startTimestamp + timeElapsed)
    await portfolio.updateCheckpoints()

    const assumedTranchesValues = await calculateAssumedTranchesValue(portfolio, correctValues, timeElapsed)

    const juniorRealValue = assumedTranchesValues[1].sub(parseMockToken(100))
    const seniorRealValue = assumedTranchesValues[2]
    const realTranchesValues = [Zero, juniorRealValue, seniorRealValue]
    const realTranchesValuesAfterFees = calculateTranchesValuesAfterFees(tranches, TRANCHES_FEE_RATES, realTranchesValues, DEFAULT_PROTOCOL_FEE_RATE, timeElapsed)

    const assumedTranchesFees = subtractArrays(realTranchesValues, realTranchesValuesAfterFees)
    const assumedTranchesValuesAfterFees = subtractArrays(assumedTranchesValues, assumedTranchesFees)

    await portfolio.setVirtualTokenBalance(sumArray(realTranchesValues))

    await setNextBlockTimestamp(startTimestamp + timeElapsed * 2)
    await portfolio.updateCheckpoints()

    const [, expectedJuniorValue, expectedSeniorValue] = realTranchesValuesAfterFees
    const [, juniorDeficit] = subtractArrays(assumedTranchesValuesAfterFees, realTranchesValuesAfterFees)
    const equityCheckpoint = await equityTranche.getCheckpoint()
    const juniorCheckpoint = await juniorTranche.getCheckpoint()
    const seniorCheckpoint = await seniorTranche.getCheckpoint()
    expect('updateCheckpointFromPortfolio').to.be.calledOnContractWith(equityTranche, [Zero])
    expect('updateCheckpointFromPortfolio').to.be.calledOnContractWith(juniorTranche, [expectedJuniorValue])
    expect('updateCheckpointFromPortfolio').to.be.calledOnContractWith(seniorTranche, [expectedSeniorValue])
    expect(equityCheckpoint.deficit).to.eq(Zero)
    expect(juniorCheckpoint.deficit).to.eq(juniorDeficit)
    expect(seniorCheckpoint.deficit).to.eq(Zero)
  })

  it('senior loses value', async () => {
    const { portfolio, protocolConfig, depositToTranches, parseMockToken, wallet, tranches } = await loadFixture(structuredIndexedPortfolioFixture)
    const [equityTranche, juniorTranche, seniorTranche] = tranches
    const timeElapsed = await getQuarterPortfolioDuration(portfolio)
    const depositAmounts = DEPOSIT_AMOUNTS.map(parseMockToken)

    await setTranchesAndProtocolFeeRates(protocolConfig, tranches, DEFAULT_PROTOCOL_FEE_RATE, TRANCHES_FEE_RATES)
    await depositToTranches(portfolio, depositAmounts, wallet)

    const startTimestamp = await startAndGetTimestamp(portfolio)

    const correctValuesBeforeFees = await calculateAssumedTranchesValue(portfolio, depositAmounts, timeElapsed)
    const correctValues = calculateTranchesValuesAfterFees(tranches, TRANCHES_FEE_RATES, correctValuesBeforeFees, DEFAULT_PROTOCOL_FEE_RATE, timeElapsed)
    await portfolio.setVirtualTokenBalance(sumArray(correctValues))

    await setNextBlockTimestamp(startTimestamp + timeElapsed)
    await portfolio.updateCheckpoints()

    const assumedTranchesValues = await calculateAssumedTranchesValue(portfolio, correctValues, timeElapsed)

    const seniorRealValue = assumedTranchesValues[2].sub(parseMockToken(100))
    const realTranchesValues = [Zero, Zero, seniorRealValue]
    const realTranchesValuesAfterFees = calculateTranchesValuesAfterFees(tranches, TRANCHES_FEE_RATES, realTranchesValues, DEFAULT_PROTOCOL_FEE_RATE, timeElapsed)

    const assumedTranchesFees = subtractArrays(realTranchesValues, realTranchesValuesAfterFees)
    const assumedTranchesValuesAfterFees = subtractArrays(assumedTranchesValues, assumedTranchesFees)

    await portfolio.setVirtualTokenBalance(sumArray(realTranchesValues))

    await setNextBlockTimestamp(startTimestamp + timeElapsed * 2)
    await portfolio.updateCheckpoints()

    const [,, expectedSeniorValue] = realTranchesValuesAfterFees
    const [, juniorDeficit, seniorDeficit] = subtractArrays(assumedTranchesValuesAfterFees, realTranchesValuesAfterFees)
    const equityCheckpoint = await equityTranche.getCheckpoint()
    const juniorCheckpoint = await juniorTranche.getCheckpoint()
    const seniorCheckpoint = await seniorTranche.getCheckpoint()
    expect('updateCheckpointFromPortfolio').to.be.calledOnContractWith(equityTranche, [Zero])
    expect('updateCheckpointFromPortfolio').to.be.calledOnContractWith(juniorTranche, [Zero])
    expect('updateCheckpointFromPortfolio').to.be.calledOnContractWith(seniorTranche, [expectedSeniorValue])
    expect(equityCheckpoint.deficit).to.eq(Zero)
    expect(juniorCheckpoint.deficit).to.eq(juniorDeficit)
    expect(seniorCheckpoint.deficit).to.eq(seniorDeficit)
  })

  it('loses all value', async () => {
    const { portfolio, protocolConfig, depositToTranches, parseMockToken, wallet, tranches } = await loadFixture(structuredIndexedPortfolioFixture)
    const [equityTranche, juniorTranche, seniorTranche] = tranches
    const timeElapsed = await getQuarterPortfolioDuration(portfolio)
    const depositAmounts = DEPOSIT_AMOUNTS.map(parseMockToken)

    await setTranchesAndProtocolFeeRates(protocolConfig, tranches, DEFAULT_PROTOCOL_FEE_RATE, TRANCHES_FEE_RATES)
    await depositToTranches(portfolio, depositAmounts, wallet)

    const startTimestamp = await startAndGetTimestamp(portfolio)

    const correctValuesBeforeFees = await calculateAssumedTranchesValue(portfolio, depositAmounts, timeElapsed)
    const correctValues = calculateTranchesValuesAfterFees(tranches, TRANCHES_FEE_RATES, correctValuesBeforeFees, DEFAULT_PROTOCOL_FEE_RATE, timeElapsed)
    await portfolio.setVirtualTokenBalance(sumArray(correctValues))

    await setNextBlockTimestamp(startTimestamp + timeElapsed)
    await portfolio.updateCheckpoints()

    const assumedTranchesValues = await calculateAssumedTranchesValue(portfolio, correctValues, timeElapsed)

    const realTranchesValues = [Zero, Zero, Zero]
    const realTranchesValuesAfterFees = calculateTranchesValuesAfterFees(tranches, TRANCHES_FEE_RATES, realTranchesValues, DEFAULT_PROTOCOL_FEE_RATE, timeElapsed)

    const assumedTranchesFees = subtractArrays(realTranchesValues, realTranchesValuesAfterFees)
    const assumedTranchesValuesAfterFees = subtractArrays(assumedTranchesValues, assumedTranchesFees)

    await portfolio.setVirtualTokenBalance(sumArray(realTranchesValues))

    await setNextBlockTimestamp(startTimestamp + timeElapsed * 2)
    await portfolio.updateCheckpoints()

    const [, juniorDeficit, seniorDeficit] = subtractArrays(assumedTranchesValuesAfterFees, realTranchesValuesAfterFees)
    const equityCheckpoint = await equityTranche.getCheckpoint()
    const juniorCheckpoint = await juniorTranche.getCheckpoint()
    const seniorCheckpoint = await seniorTranche.getCheckpoint()
    expect('updateCheckpointFromPortfolio').to.be.calledOnContractWith(equityTranche, [Zero])
    expect('updateCheckpointFromPortfolio').to.be.calledOnContractWith(juniorTranche, [Zero])
    expect('updateCheckpointFromPortfolio').to.be.calledOnContractWith(seniorTranche, [Zero])
    expect(equityCheckpoint.deficit).to.eq(Zero)
    expect(juniorCheckpoint.deficit).to.eq(juniorDeficit)
    expect(seniorCheckpoint.deficit).to.eq(seniorDeficit)
  })
})
