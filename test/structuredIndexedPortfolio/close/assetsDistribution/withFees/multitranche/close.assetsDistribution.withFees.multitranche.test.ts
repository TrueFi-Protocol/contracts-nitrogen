import { expect, use } from 'chai'
import { describe, it } from 'mocha'
import { solidity } from 'ethereum-waffle'
import { setupFixtureLoader } from 'test/setup'
import { structuredIndexedPortfolioFixture } from 'fixtures/structuredIndexedPortfolioFixture'
import {
  calculateInterest,
  calculateTranchesValuesAfterFees,
  getPortfolioDuration,
  getTranchesData,
  ONE_YEAR_IN_SECONDS,
  percentToBips,
  setNextBlockTimestamp,
  startAndGetTimestamp,
  startTimeTravelAndClosePortfolio,
  subtractArrays,
  sumArray,
} from 'utils'
import { Zero } from '@ethersproject/constants'
import { calculateWaterfallFees } from 'fixtures/utils'

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
const EQUITY_DEPOSIT_ASSETS = 3_000_000
const JUNIOR_DEPOSIT_ASSETS = 2_000_000
const SENIOR_DEPOSIT_ASSETS = 1_000_000
const DEPOSIT_AMOUNTS = [
  EQUITY_DEPOSIT_ASSETS,
  JUNIOR_DEPOSIT_ASSETS,
  SENIOR_DEPOSIT_ASSETS,
]

describe('StructuredIndexedPortfolio.close.assetsDistribution.withFees.multitranche', () => {
  const loadFixture = setupFixtureLoader()

  it('no deposits', async () => {
    const { portfolio, tranches, token } = await loadFixture(structuredIndexedPortfolioFixture)

    await startTimeTravelAndClosePortfolio(portfolio)

    const tranchesData = await getTranchesData(portfolio)
    for (const trancheIndex in tranchesData) {
      const trancheData = tranchesData[trancheIndex]
      const tranche = tranches[trancheIndex]

      expect(trancheData.maxValueOnClose).to.eq(Zero)
      expect(trancheData.distributedAssets).to.eq(Zero)
      expect(await token.balanceOf(tranche.address)).to.eq(Zero)
      expect('updateCheckpointFromPortfolio').to.be.calledOnContractWith(tranche, [Zero])
    }
  })

  describe('with deposits', () => {
    it('senior underflow, junior empty, equity empty', async () => {
      const { portfolio, token, tranches, wallet, parseMockToken, depositAndCalculateAssumedTranchesValue, setProtocolAndTranchesFeeRates } = await loadFixture(structuredIndexedPortfolioFixture)
      const depositAmounts = DEPOSIT_AMOUNTS.map(parseMockToken)
      const timeElapsed = await getPortfolioDuration(portfolio)
      await setProtocolAndTranchesFeeRates(tranches, DEFAULT_PROTOCOL_FEE_RATE, TRANCHES_FEE_RATES)
      const [, expectedJuniorTrancheValue, expectedSeniorTrancheValue] = await depositAndCalculateAssumedTranchesValue(depositAmounts, wallet, timeElapsed)

      const startTimestamp = await startAndGetTimestamp(portfolio)

      const seniorUnderflow = 1
      const expectedSeniorTrancheValueWithUnderflow = expectedSeniorTrancheValue.sub(seniorUnderflow)
      const remainingAssets = expectedSeniorTrancheValueWithUnderflow
      const lostAssets = sumArray(depositAmounts).sub(remainingAssets)
      await token.burn(portfolio.address, lostAssets)
      await portfolio.setVirtualTokenBalance(remainingAssets)

      await setNextBlockTimestamp(startTimestamp + timeElapsed)
      await portfolio.close()
      const fees = await calculateWaterfallFees(portfolio, depositAmounts, timeElapsed, remainingAssets)

      const expectedTranchesValues = [Zero, expectedJuniorTrancheValue, expectedSeniorTrancheValue]
      const [, expectedJuniorTrancheValueAfterFees, expectedSeniorTrancheValueAfterFees] = subtractArrays(expectedTranchesValues, fees)
      const expectedSeniorDistributedAssets = expectedSeniorTrancheValueAfterFees.sub(seniorUnderflow)

      const tranchesData = await getTranchesData(portfolio)

      const equityTrancheData = tranchesData[0]
      const equityTranche = tranches[0]
      expect(equityTrancheData.maxValueOnClose).to.eq(Zero)
      expect(equityTrancheData.distributedAssets).to.eq(Zero)
      expect(await token.balanceOf(equityTranche.address)).to.eq(Zero)
      expect('updateCheckpointFromPortfolio').to.be.calledOnContractWith(equityTranche, [Zero])

      const juniorTrancheData = tranchesData[1]
      const juniorTranche = tranches[1]
      expect(juniorTrancheData.maxValueOnClose).to.eq(expectedJuniorTrancheValueAfterFees)
      expect(juniorTrancheData.distributedAssets).to.eq(Zero)
      expect(await token.balanceOf(juniorTranche.address)).to.eq(Zero)
      expect('updateCheckpointFromPortfolio').to.be.calledOnContractWith(juniorTranche, [Zero])

      const seniorTrancheData = tranchesData[2]
      const seniorTranche = tranches[2]
      expect(seniorTrancheData.maxValueOnClose).to.eq(expectedSeniorTrancheValueAfterFees)
      expect(seniorTrancheData.distributedAssets).to.eq(expectedSeniorDistributedAssets)
      expect(await token.balanceOf(seniorTranche.address)).to.eq(expectedSeniorDistributedAssets)
      expect('updateCheckpointFromPortfolio').to.be.calledOnContractWith(seniorTranche, [expectedSeniorDistributedAssets])
    })

    it('senior full, junior empty, equity empty', async () => {
      const { portfolio, token, tranches, wallet, parseMockToken, depositAndCalculateAssumedTranchesValue, setProtocolAndTranchesFeeRates } = await loadFixture(structuredIndexedPortfolioFixture)
      const depositAmounts = DEPOSIT_AMOUNTS.map(parseMockToken)
      const timeElapsed = await getPortfolioDuration(portfolio)
      await setProtocolAndTranchesFeeRates(tranches, DEFAULT_PROTOCOL_FEE_RATE, TRANCHES_FEE_RATES)
      const [, expectedJuniorTrancheValue, expectedSeniorTrancheValue] = await depositAndCalculateAssumedTranchesValue(depositAmounts, wallet, timeElapsed)

      const startTimestamp = await startAndGetTimestamp(portfolio)

      const remainingAssets = expectedSeniorTrancheValue
      const lostAssets = sumArray(depositAmounts).sub(remainingAssets)
      await token.burn(portfolio.address, lostAssets)
      await portfolio.setVirtualTokenBalance(remainingAssets)

      await setNextBlockTimestamp(startTimestamp + timeElapsed)
      await portfolio.close()

      const expectedTranchesValues = [Zero, expectedJuniorTrancheValue, expectedSeniorTrancheValue]
      const fees = await calculateWaterfallFees(portfolio, depositAmounts, timeElapsed, remainingAssets)
      const [, expectedJuniorTrancheValueAfterFees, expectedSeniorTrancheValueAfterFees] = subtractArrays(expectedTranchesValues, fees)

      const tranchesData = await getTranchesData(portfolio)

      const equityTrancheData = tranchesData[0]
      const equityTranche = tranches[0]
      expect(equityTrancheData.maxValueOnClose).to.eq(Zero)
      expect(equityTrancheData.distributedAssets).to.eq(Zero)
      expect(await token.balanceOf(equityTranche.address)).to.eq(Zero)
      expect('updateCheckpointFromPortfolio').to.be.calledOnContractWith(equityTranche, [Zero])

      const juniorTrancheData = tranchesData[1]
      const juniorTranche = tranches[1]
      expect(juniorTrancheData.maxValueOnClose).to.eq(expectedJuniorTrancheValueAfterFees)
      expect(juniorTrancheData.distributedAssets).to.eq(Zero)
      expect(await token.balanceOf(juniorTranche.address)).to.eq(Zero)
      expect('updateCheckpointFromPortfolio').to.be.calledOnContractWith(juniorTranche, [Zero])

      const seniorTrancheData = tranchesData[2]
      const seniorTranche = tranches[2]
      expect(seniorTrancheData.maxValueOnClose).to.eq(expectedSeniorTrancheValueAfterFees)
      expect(seniorTrancheData.distributedAssets).to.eq(expectedSeniorTrancheValueAfterFees)
      expect(await token.balanceOf(seniorTranche.address)).to.eq(expectedSeniorTrancheValueAfterFees)
      expect('updateCheckpointFromPortfolio').to.be.calledOnContractWith(seniorTranche, [expectedSeniorTrancheValueAfterFees])
    })

    it('senior full, junior underflow, equity empty', async () => {
      const { portfolio, token, tranches, wallet, parseMockToken, depositAndCalculateAssumedTranchesValue, setProtocolAndTranchesFeeRates } = await loadFixture(structuredIndexedPortfolioFixture)
      const depositAmounts = DEPOSIT_AMOUNTS.map(parseMockToken)
      const timeElapsed = await getPortfolioDuration(portfolio)
      await setProtocolAndTranchesFeeRates(tranches, DEFAULT_PROTOCOL_FEE_RATE, TRANCHES_FEE_RATES)
      const [, expectedJuniorTrancheValue, expectedSeniorTrancheValue] = await depositAndCalculateAssumedTranchesValue(depositAmounts, wallet, timeElapsed)

      const startTimestamp = await startAndGetTimestamp(portfolio)

      const juniorValueUnderflow = 1
      const expectedJuniorTrancheValueWithUnderflow = expectedJuniorTrancheValue.sub(juniorValueUnderflow)
      const remainingAssets = expectedSeniorTrancheValue.add(expectedJuniorTrancheValueWithUnderflow)
      const lostAssets = sumArray(depositAmounts).sub(remainingAssets)
      await token.burn(portfolio.address, lostAssets)
      await portfolio.setVirtualTokenBalance(remainingAssets)

      await setNextBlockTimestamp(startTimestamp + timeElapsed)
      await portfolio.close()

      const expectedTranchesValues = [Zero, expectedJuniorTrancheValue, expectedSeniorTrancheValue]
      const [, expectedJuniorTrancheValueAfterFees, expectedSeniorTrancheValueAfterFees] =
        calculateTranchesValuesAfterFees(tranches, TRANCHES_FEE_RATES, expectedTranchesValues, DEFAULT_PROTOCOL_FEE_RATE, timeElapsed)
      const expectedJuniorDistributedAssets = expectedJuniorTrancheValueAfterFees.sub(juniorValueUnderflow)

      const tranchesData = await getTranchesData(portfolio)

      const equityTrancheData = tranchesData[0]
      const equityTranche = tranches[0]
      expect(equityTrancheData.maxValueOnClose).to.eq(Zero)
      expect(equityTrancheData.distributedAssets).to.eq(Zero)
      expect(await token.balanceOf(equityTranche.address)).to.eq(Zero)
      expect('updateCheckpointFromPortfolio').to.be.calledOnContractWith(equityTranche, [Zero])

      const juniorTrancheData = tranchesData[1]
      const juniorTranche = tranches[1]
      expect(juniorTrancheData.maxValueOnClose).to.eq(expectedJuniorTrancheValueAfterFees)
      expect(juniorTrancheData.distributedAssets).to.eq(expectedJuniorDistributedAssets)
      expect(await token.balanceOf(juniorTranche.address)).to.eq(expectedJuniorDistributedAssets)
      expect('updateCheckpointFromPortfolio').to.be.calledOnContractWith(juniorTranche, [expectedJuniorDistributedAssets])

      const seniorTrancheData = tranchesData[2]
      const seniorTranche = tranches[2]
      expect(seniorTrancheData.maxValueOnClose).to.eq(expectedSeniorTrancheValueAfterFees)
      expect(seniorTrancheData.distributedAssets).to.eq(expectedSeniorTrancheValueAfterFees)
      expect(await token.balanceOf(seniorTranche.address)).to.eq(expectedSeniorTrancheValueAfterFees)
      expect('updateCheckpointFromPortfolio').to.be.calledOnContractWith(seniorTranche, [expectedSeniorTrancheValueAfterFees])
    })

    it('senior full, junior full, equity empty', async () => {
      const { portfolio, token, tranches, wallet, parseMockToken, depositAndCalculateAssumedTranchesValue, setProtocolAndTranchesFeeRates } = await loadFixture(structuredIndexedPortfolioFixture)
      const depositAmounts = DEPOSIT_AMOUNTS.map(parseMockToken)
      const timeElapsed = await getPortfolioDuration(portfolio)
      await setProtocolAndTranchesFeeRates(tranches, DEFAULT_PROTOCOL_FEE_RATE, TRANCHES_FEE_RATES)
      const [, expectedJuniorTrancheValue, expectedSeniorTrancheValue] = await depositAndCalculateAssumedTranchesValue(depositAmounts, wallet, timeElapsed)

      const startTimestamp = await startAndGetTimestamp(portfolio)

      const expectedJuniorTrancheValueWithUnderflow = expectedJuniorTrancheValue
      const remainingAssets = expectedSeniorTrancheValue.add(expectedJuniorTrancheValueWithUnderflow)
      const lostAssets = sumArray(depositAmounts).sub(remainingAssets)
      await token.burn(portfolio.address, lostAssets)
      await portfolio.setVirtualTokenBalance(remainingAssets)

      await setNextBlockTimestamp(startTimestamp + timeElapsed)
      await portfolio.close()

      const expectedTranchesValues = [Zero, expectedJuniorTrancheValue, expectedSeniorTrancheValue]
      const [, expectedJuniorTrancheValueAfterFees, expectedSeniorTrancheValueAfterFees] =
        calculateTranchesValuesAfterFees(tranches, TRANCHES_FEE_RATES, expectedTranchesValues, DEFAULT_PROTOCOL_FEE_RATE, timeElapsed)

      const tranchesData = await getTranchesData(portfolio)

      const equityTrancheData = tranchesData[0]
      const equityTranche = tranches[0]
      expect(equityTrancheData.maxValueOnClose).to.eq(Zero)
      expect(equityTrancheData.distributedAssets).to.eq(Zero)
      expect(await token.balanceOf(equityTranche.address)).to.eq(Zero)
      expect('updateCheckpointFromPortfolio').to.be.calledOnContractWith(equityTranche, [Zero])

      const juniorTrancheData = tranchesData[1]
      const juniorTranche = tranches[1]
      expect(juniorTrancheData.maxValueOnClose).to.eq(expectedJuniorTrancheValueAfterFees)
      expect(juniorTrancheData.distributedAssets).to.eq(expectedJuniorTrancheValueAfterFees)
      expect(await token.balanceOf(juniorTranche.address)).to.eq(expectedJuniorTrancheValueAfterFees)
      expect('updateCheckpointFromPortfolio').to.be.calledOnContractWith(juniorTranche, [expectedJuniorTrancheValueAfterFees])

      const seniorTrancheData = tranchesData[2]
      const seniorTranche = tranches[2]
      expect(seniorTrancheData.maxValueOnClose).to.eq(expectedSeniorTrancheValueAfterFees)
      expect(seniorTrancheData.distributedAssets).to.eq(expectedSeniorTrancheValueAfterFees)
      expect(await token.balanceOf(seniorTranche.address)).to.eq(expectedSeniorTrancheValueAfterFees)
      expect('updateCheckpointFromPortfolio').to.be.calledOnContractWith(seniorTranche, [expectedSeniorTrancheValueAfterFees])
    })

    it('senior full, junior full, equity loses value', async () => {
      const { portfolio, token, tranches, wallet, parseMockToken, depositAndCalculateAssumedTranchesValue, setProtocolAndTranchesFeeRates } = await loadFixture(structuredIndexedPortfolioFixture)
      const depositAmounts = DEPOSIT_AMOUNTS.map(parseMockToken)
      const timeElapsed = await getPortfolioDuration(portfolio)
      await setProtocolAndTranchesFeeRates(tranches, DEFAULT_PROTOCOL_FEE_RATE, TRANCHES_FEE_RATES)
      const [, expectedJuniorTrancheValue, expectedSeniorTrancheValue] = await depositAndCalculateAssumedTranchesValue(depositAmounts, wallet, timeElapsed)

      const startTimestamp = await startAndGetTimestamp(portfolio)

      const totalAssets = sumArray(depositAmounts)
      const expectedEquityTrancheValue = totalAssets.sub(expectedJuniorTrancheValue).sub(expectedSeniorTrancheValue)

      await setNextBlockTimestamp(startTimestamp + timeElapsed)
      await portfolio.close()

      const expectedTranchesValues = [expectedEquityTrancheValue, expectedJuniorTrancheValue, expectedSeniorTrancheValue]
      const [expectedEquityDistributedAssets, expectedJuniorTrancheValueAfterFees, expectedSeniorTrancheValueAfterFees] =
        calculateTranchesValuesAfterFees(tranches, TRANCHES_FEE_RATES, expectedTranchesValues, DEFAULT_PROTOCOL_FEE_RATE, timeElapsed)

      const tranchesData = await getTranchesData(portfolio)

      const equityTrancheData = tranchesData[0]
      const equityTranche = tranches[0]
      expect(equityTrancheData.maxValueOnClose).to.eq(Zero)
      expect(equityTrancheData.distributedAssets).to.eq(expectedEquityDistributedAssets)
      expect(await token.balanceOf(equityTranche.address)).to.eq(expectedEquityDistributedAssets)
      expect('updateCheckpointFromPortfolio').to.be.calledOnContractWith(equityTranche, [expectedEquityDistributedAssets])

      const juniorTrancheData = tranchesData[1]
      const juniorTranche = tranches[1]
      expect(juniorTrancheData.maxValueOnClose).to.eq(expectedJuniorTrancheValueAfterFees)
      expect(juniorTrancheData.distributedAssets).to.eq(expectedJuniorTrancheValueAfterFees)
      expect(await token.balanceOf(juniorTranche.address)).to.eq(expectedJuniorTrancheValueAfterFees)
      expect('updateCheckpointFromPortfolio').to.be.calledOnContractWith(juniorTranche, [expectedJuniorTrancheValueAfterFees])

      const seniorTrancheData = tranchesData[2]
      const seniorTranche = tranches[2]
      expect(seniorTrancheData.maxValueOnClose).to.eq(expectedSeniorTrancheValueAfterFees)
      expect(seniorTrancheData.distributedAssets).to.eq(expectedSeniorTrancheValueAfterFees)
      expect(await token.balanceOf(seniorTranche.address)).to.eq(expectedSeniorTrancheValueAfterFees)
      expect('updateCheckpointFromPortfolio').to.be.calledOnContractWith(seniorTranche, [expectedSeniorTrancheValueAfterFees])
    })

    it('senior full, junior full, equity gains value', async () => {
      const { portfolio, token, tranches, wallet, parseMockToken, depositAndCalculateAssumedTranchesValue, setProtocolAndTranchesFeeRates } = await loadFixture(structuredIndexedPortfolioFixture)
      const depositAmounts = DEPOSIT_AMOUNTS.map(parseMockToken)
      const timeElapsed = await getPortfolioDuration(portfolio)
      await setProtocolAndTranchesFeeRates(tranches, DEFAULT_PROTOCOL_FEE_RATE, TRANCHES_FEE_RATES)
      const [, expectedJuniorTrancheValue, expectedSeniorTrancheValue] = await depositAndCalculateAssumedTranchesValue(depositAmounts, wallet, timeElapsed)

      const startTimestamp = await startAndGetTimestamp(portfolio)

      const expectedEquityTrancheValue = depositAmounts[0].add(1)
      const totalAssets = expectedEquityTrancheValue.add(expectedJuniorTrancheValue).add(expectedSeniorTrancheValue)
      const extraAssets = totalAssets.sub(sumArray(depositAmounts))
      await token.mint(portfolio.address, extraAssets)
      await portfolio.setVirtualTokenBalance(totalAssets)

      await setNextBlockTimestamp(startTimestamp + timeElapsed)
      await portfolio.close()

      const expectedTranchesValues = [expectedEquityTrancheValue, expectedJuniorTrancheValue, expectedSeniorTrancheValue]
      const [expectedEquityTrancheValueAfterFees, expectedJuniorTrancheValueAfterFees, expectedSeniorTrancheValueAfterFees] =
        calculateTranchesValuesAfterFees(tranches, TRANCHES_FEE_RATES, expectedTranchesValues, DEFAULT_PROTOCOL_FEE_RATE, timeElapsed)

      const tranchesData = await getTranchesData(portfolio)

      const equityTrancheData = tranchesData[0]
      const equityTranche = tranches[0]
      expect(equityTrancheData.maxValueOnClose).to.eq(Zero)
      expect(equityTrancheData.distributedAssets).to.eq(expectedEquityTrancheValueAfterFees)
      expect(await token.balanceOf(equityTranche.address)).to.eq(expectedEquityTrancheValueAfterFees)
      expect('updateCheckpointFromPortfolio').to.be.calledOnContractWith(equityTranche, [expectedEquityTrancheValueAfterFees])

      const juniorTrancheData = tranchesData[1]
      const juniorTranche = tranches[1]
      expect(juniorTrancheData.maxValueOnClose).to.eq(expectedJuniorTrancheValueAfterFees)
      expect(juniorTrancheData.distributedAssets).to.eq(expectedJuniorTrancheValueAfterFees)
      expect(await token.balanceOf(juniorTranche.address)).to.eq(expectedJuniorTrancheValueAfterFees)
      expect('updateCheckpointFromPortfolio').to.be.calledOnContractWith(juniorTranche, [expectedJuniorTrancheValueAfterFees])

      const seniorTrancheData = tranchesData[2]
      const seniorTranche = tranches[2]
      expect(seniorTrancheData.maxValueOnClose).to.eq(expectedSeniorTrancheValueAfterFees)
      expect(seniorTrancheData.distributedAssets).to.eq(expectedSeniorTrancheValueAfterFees)
      expect(await token.balanceOf(seniorTranche.address)).to.eq(expectedSeniorTrancheValueAfterFees)
      expect('updateCheckpointFromPortfolio').to.be.calledOnContractWith(seniorTranche, [expectedSeniorTrancheValueAfterFees])
    })

    it('equity fee bigger than equity value', async () => {
      const { portfolio, token, tranches, wallet, parseMockToken, depositAndCalculateAssumedTranchesValue, setProtocolAndTranchesFeeRates } = await loadFixture(structuredIndexedPortfolioFixture)
      const depositAmounts = DEPOSIT_AMOUNTS.map(parseMockToken)
      const timeElapsed = await getPortfolioDuration(portfolio)
      const maxFeeRate = Math.round(percentToBips(120) * ONE_YEAR_IN_SECONDS / timeElapsed)
      const tranchesFeeRates = [maxFeeRate, TRANCHES_FEE_RATES[1], TRANCHES_FEE_RATES[2]]
      await setProtocolAndTranchesFeeRates(tranches, DEFAULT_PROTOCOL_FEE_RATE, tranchesFeeRates)
      const [, expectedJuniorTrancheValue, expectedSeniorTrancheValue] = await depositAndCalculateAssumedTranchesValue(depositAmounts, wallet, timeElapsed)

      const startTimestamp = await startAndGetTimestamp(portfolio)

      const totalAssets = sumArray(depositAmounts)
      const expectedEquityTrancheValue = totalAssets.sub(expectedJuniorTrancheValue).sub(expectedSeniorTrancheValue)

      await setNextBlockTimestamp(startTimestamp + timeElapsed)
      await portfolio.close()

      const expectedTranchesValues = [expectedEquityTrancheValue, expectedJuniorTrancheValue, expectedSeniorTrancheValue]
      const [, expectedJuniorTrancheValueAfterFees, expectedSeniorTrancheValueAfterFees] =
        calculateTranchesValuesAfterFees(tranches, tranchesFeeRates, expectedTranchesValues, DEFAULT_PROTOCOL_FEE_RATE, timeElapsed)

      const newJuniorTrancheBalance = expectedJuniorTrancheValue
      const newJuniorTrancheFees = calculateInterest(TRANCHES_FEE_RATES[1] + DEFAULT_PROTOCOL_FEE_RATE, timeElapsed, newJuniorTrancheBalance)
      const expectedJuniorDistributedAssets = newJuniorTrancheBalance.sub(newJuniorTrancheFees)

      const tranchesData = await getTranchesData(portfolio)

      const equityTrancheData = tranchesData[0]
      const equityTranche = tranches[0]
      expect(equityTrancheData.maxValueOnClose).to.eq(Zero)
      expect(equityTrancheData.distributedAssets).to.eq(Zero)
      expect(await token.balanceOf(equityTranche.address)).to.eq(Zero)
      expect('updateCheckpointFromPortfolio').to.be.calledOnContractWith(equityTranche, [Zero])

      const juniorTrancheData = tranchesData[1]
      const juniorTranche = tranches[1]
      expect(juniorTrancheData.maxValueOnClose).to.eq(expectedJuniorTrancheValueAfterFees)
      expect(juniorTrancheData.distributedAssets).to.eq(expectedJuniorDistributedAssets)
      expect(await token.balanceOf(juniorTranche.address)).to.eq(expectedJuniorDistributedAssets)
      expect('updateCheckpointFromPortfolio').to.be.calledOnContractWith(juniorTranche, [expectedJuniorTrancheValueAfterFees])

      const seniorTrancheData = tranchesData[2]
      const seniorTranche = tranches[2]
      expect(seniorTrancheData.maxValueOnClose).to.eq(expectedSeniorTrancheValueAfterFees)
      expect(seniorTrancheData.distributedAssets).to.eq(expectedSeniorTrancheValueAfterFees)
      expect(await token.balanceOf(seniorTranche.address)).to.eq(expectedSeniorTrancheValueAfterFees)
      expect('updateCheckpointFromPortfolio').to.be.calledOnContractWith(seniorTranche, [expectedSeniorTrancheValueAfterFees])
    })

    it('junior fee bigger than junior value', async () => {
      const { portfolio, token, tranches, wallet, parseMockToken, depositAndCalculateAssumedTranchesValue, setProtocolAndTranchesFeeRates } = await loadFixture(structuredIndexedPortfolioFixture)
      const depositAmounts = DEPOSIT_AMOUNTS.map(parseMockToken)
      const timeElapsed = await getPortfolioDuration(portfolio)
      const maxFeeRate = Math.round(percentToBips(200) * ONE_YEAR_IN_SECONDS / timeElapsed)
      const tranchesFeeRates = [TRANCHES_FEE_RATES[0], maxFeeRate, TRANCHES_FEE_RATES[2]]
      await setProtocolAndTranchesFeeRates(tranches, DEFAULT_PROTOCOL_FEE_RATE, tranchesFeeRates)
      const [, expectedJuniorTrancheValue, expectedSeniorTrancheValue] = await depositAndCalculateAssumedTranchesValue(depositAmounts, wallet, timeElapsed)

      const startTimestamp = await startAndGetTimestamp(portfolio)

      const totalAssets = sumArray(depositAmounts)
      const expectedEquityTrancheValue = totalAssets.sub(expectedJuniorTrancheValue).sub(expectedSeniorTrancheValue)

      await setNextBlockTimestamp(startTimestamp + timeElapsed)
      await portfolio.close()

      const expectedTranchesValues = [expectedEquityTrancheValue, expectedJuniorTrancheValue, expectedSeniorTrancheValue]
      const [expectedEquityTrancheValueAfterFees, , expectedSeniorTrancheValueAfterFees] =
        calculateTranchesValuesAfterFees(tranches, tranchesFeeRates, expectedTranchesValues, DEFAULT_PROTOCOL_FEE_RATE, timeElapsed)

      const expectedEquityDistributedAssets = expectedEquityTrancheValueAfterFees

      const tranchesData = await getTranchesData(portfolio)

      const equityTrancheData = tranchesData[0]
      const equityTranche = tranches[0]
      expect(equityTrancheData.maxValueOnClose).to.eq(Zero)
      expect(equityTrancheData.distributedAssets).to.eq(expectedEquityDistributedAssets)
      expect(await token.balanceOf(equityTranche.address)).to.eq(expectedEquityDistributedAssets)
      expect('updateCheckpointFromPortfolio').to.be.calledOnContractWith(equityTranche, [expectedEquityDistributedAssets])

      const juniorTrancheData = tranchesData[1]
      const juniorTranche = tranches[1]
      expect(juniorTrancheData.maxValueOnClose).to.eq(Zero)
      expect(juniorTrancheData.distributedAssets).to.eq(Zero)
      expect(await token.balanceOf(juniorTranche.address)).to.eq(Zero)
      expect('updateCheckpointFromPortfolio').to.be.calledOnContractWith(juniorTranche, [Zero])

      const seniorTrancheData = tranchesData[2]
      const seniorTranche = tranches[2]
      expect(seniorTrancheData.maxValueOnClose).to.eq(expectedSeniorTrancheValueAfterFees)
      expect(seniorTrancheData.distributedAssets).to.eq(expectedSeniorTrancheValueAfterFees)
      expect(await token.balanceOf(seniorTranche.address)).to.eq(expectedSeniorTrancheValueAfterFees)
      expect('updateCheckpointFromPortfolio').to.be.calledOnContractWith(seniorTranche, [expectedSeniorTrancheValueAfterFees])
    })

    it('senior fee bigger than senior value', async () => {
      const { portfolio, token, tranches, wallet, parseMockToken, depositAndCalculateAssumedTranchesValue, setProtocolAndTranchesFeeRates } = await loadFixture(structuredIndexedPortfolioFixture)
      const depositAmounts = DEPOSIT_AMOUNTS.map(parseMockToken)
      const timeElapsed = await getPortfolioDuration(portfolio)
      const maxFeeRate = Math.round(percentToBips(200) * ONE_YEAR_IN_SECONDS / timeElapsed)
      const tranchesFeeRates = [TRANCHES_FEE_RATES[0], TRANCHES_FEE_RATES[1], maxFeeRate]
      await setProtocolAndTranchesFeeRates(tranches, DEFAULT_PROTOCOL_FEE_RATE, tranchesFeeRates)
      const [, expectedJuniorTrancheValue, expectedSeniorTrancheValue] = await depositAndCalculateAssumedTranchesValue(depositAmounts, wallet, timeElapsed)

      const startTimestamp = await startAndGetTimestamp(portfolio)

      const totalAssets = sumArray(depositAmounts)
      const expectedEquityTrancheValue = totalAssets.sub(expectedJuniorTrancheValue).sub(expectedSeniorTrancheValue)

      await setNextBlockTimestamp(startTimestamp + timeElapsed)
      await portfolio.close()

      const expectedTranchesValues = [expectedEquityTrancheValue, expectedJuniorTrancheValue, expectedSeniorTrancheValue]
      const [expectedEquityTrancheValueAfterFees, expectedJuniorTrancheValueAfterFees] =
        calculateTranchesValuesAfterFees(tranches, tranchesFeeRates, expectedTranchesValues, DEFAULT_PROTOCOL_FEE_RATE, timeElapsed)
      const expectedEquityDistributedAssets = expectedEquityTrancheValueAfterFees

      const tranchesData = await getTranchesData(portfolio)

      const equityTrancheData = tranchesData[0]
      const equityTranche = tranches[0]
      expect(equityTrancheData.maxValueOnClose).to.eq(Zero)
      expect(equityTrancheData.distributedAssets).to.eq(expectedEquityDistributedAssets)
      expect(await token.balanceOf(equityTranche.address)).to.eq(expectedEquityDistributedAssets)
      expect('updateCheckpointFromPortfolio').to.be.calledOnContractWith(equityTranche, [expectedEquityDistributedAssets])

      const juniorTrancheData = tranchesData[1]
      const juniorTranche = tranches[1]
      expect(juniorTrancheData.maxValueOnClose).to.eq(expectedJuniorTrancheValueAfterFees)
      expect(juniorTrancheData.distributedAssets).to.eq(expectedJuniorTrancheValueAfterFees)
      expect(await token.balanceOf(juniorTranche.address)).to.eq(expectedJuniorTrancheValueAfterFees)
      expect('updateCheckpointFromPortfolio').to.be.calledOnContractWith(juniorTranche, [expectedJuniorTrancheValueAfterFees])

      const seniorTrancheData = tranchesData[2]
      const seniorTranche = tranches[2]
      expect(seniorTrancheData.maxValueOnClose).to.eq(Zero)
      expect(seniorTrancheData.distributedAssets).to.eq(Zero)
      expect(await token.balanceOf(seniorTranche.address)).to.eq(Zero)
      expect('updateCheckpointFromPortfolio').to.be.calledOnContractWith(seniorTranche, [Zero])
    })
  })
})
