import { Zero } from '@ethersproject/constants'
import { MockERC4626Vault__factory } from 'build/types'
import { expect, use } from 'chai'
import { solidity } from 'ethereum-waffle'
import { structuredIndexedPortfolioFixture } from 'fixtures/structuredIndexedPortfolioFixture'
import { setupFixtureLoader } from 'test/setup'
import {
  ONE_YEAR_IN_SECONDS,
  getTxTimestamp,
  timeTravelTo,
  startTimeTravelAndClosePortfolio,
  calculateInterest,
  ONE_DAY_IN_SECONDS,
  createAndRegisterInvestment,
  startAndGetTimestamp,
  calculateTranchesValuesAfterTime,
  sumArray,
} from 'utils'

use(solidity)

const DEFAULT_PROTOCOL_FEE_RATE = 400
const EQUITY_FEE_RATE = 100
const EQUITY_DEPOSIT_ASSETS = 1_000_000

describe('StructuredIndexedPortfolio.calculateWaterfall.withFees.unitranche', () => {
  const loadFixture = setupFixtureLoader()

  describe('no assets deposited', () => {
    it('capital formation', async () => {
      const { unitranchePortfolio, unitranche, setProtocolAndTranchesFeeRates } = await loadFixture(structuredIndexedPortfolioFixture)
      await setProtocolAndTranchesFeeRates([unitranche], DEFAULT_PROTOCOL_FEE_RATE, [EQUITY_FEE_RATE])
      const waterfall = await unitranchePortfolio.calculateWaterfall()
      expect(waterfall).to.deep.eq([Zero])
    })

    it('live', async () => {
      const { unitranchePortfolio, unitranche, setProtocolAndTranchesFeeRates } = await loadFixture(structuredIndexedPortfolioFixture)
      await setProtocolAndTranchesFeeRates([unitranche], DEFAULT_PROTOCOL_FEE_RATE, [EQUITY_FEE_RATE])
      await unitranchePortfolio.start()
      const waterfall = await unitranchePortfolio.calculateWaterfall()
      expect(waterfall).to.deep.eq([Zero])
    })

    it('closed', async () => {
      const { unitranchePortfolio, unitranche, setProtocolAndTranchesFeeRates } = await loadFixture(structuredIndexedPortfolioFixture)
      await setProtocolAndTranchesFeeRates([unitranche], DEFAULT_PROTOCOL_FEE_RATE, [EQUITY_FEE_RATE])

      await startTimeTravelAndClosePortfolio(unitranchePortfolio)

      const waterfall = await unitranchePortfolio.calculateWaterfall()
      expect(waterfall).to.deep.eq([Zero])
    })
  })

  describe('with assets deposited', () => {
    it('capital formation', async () => {
      const { unitranchePortfolio, unitranchePortfolioCreationTx, approveAndDepositToTranche, parseMockToken, unitranche, wallet, setProtocolAndTranchesFeeRates } = await loadFixture(structuredIndexedPortfolioFixture)
      await setProtocolAndTranchesFeeRates([unitranche], DEFAULT_PROTOCOL_FEE_RATE, [EQUITY_FEE_RATE])
      const equityDepositAssets = parseMockToken(EQUITY_DEPOSIT_ASSETS)
      await approveAndDepositToTranche(unitranche, equityDepositAssets, wallet)

      const portfolioCreationTxTimestamp = await getTxTimestamp(unitranchePortfolioCreationTx)
      await timeTravelTo(portfolioCreationTxTimestamp + ONE_YEAR_IN_SECONDS)

      const waterfall = await unitranchePortfolio.calculateWaterfall()
      expect(waterfall).to.deep.eq([equityDepositAssets])
    })

    it('live', async () => {
      const { unitranchePortfolio, parseMockToken, approveAndDepositToTranche, unitranche, wallet, setProtocolAndTranchesFeeRates } = await loadFixture(structuredIndexedPortfolioFixture)
      await setProtocolAndTranchesFeeRates([unitranche], DEFAULT_PROTOCOL_FEE_RATE, [EQUITY_FEE_RATE])
      const equityDepositAssets = parseMockToken(EQUITY_DEPOSIT_ASSETS)
      await approveAndDepositToTranche(unitranche, equityDepositAssets, wallet)

      const startTx = await unitranchePortfolio.start()
      const startTxTimestamp = await getTxTimestamp(startTx)

      const protocolFees = calculateInterest(DEFAULT_PROTOCOL_FEE_RATE, ONE_YEAR_IN_SECONDS, equityDepositAssets)
      const trancheFees = calculateInterest(EQUITY_FEE_RATE, ONE_YEAR_IN_SECONDS, equityDepositAssets)

      await timeTravelTo(startTxTimestamp + ONE_YEAR_IN_SECONDS)

      const waterfall = await unitranchePortfolio.calculateWaterfall()
      const expectedEquityAssets = equityDepositAssets.sub(protocolFees).sub(trancheFees)
      expect(waterfall).to.deep.eq([expectedEquityAssets])
    })

    it('investment gained value', async () => {
      const { unitranchePortfolio, unitranche, parseMockToken, approveAndDepositToTranche, wallet, setProtocolAndTranchesFeeRates } = await loadFixture(structuredIndexedPortfolioFixture)
      await setProtocolAndTranchesFeeRates([unitranche], DEFAULT_PROTOCOL_FEE_RATE, [EQUITY_FEE_RATE])
      const equityDepositAssets = parseMockToken(EQUITY_DEPOSIT_ASSETS)
      const investmentDepositAmount = equityDepositAssets.div(2)
      const doubleInvestmentAmount = investmentDepositAmount.mul(2)

      await approveAndDepositToTranche(unitranche, equityDepositAssets, wallet)

      const startTxTimestamp = await startAndGetTimestamp(unitranchePortfolio)
      const investment = await createAndRegisterInvestment(unitranchePortfolio, wallet, MockERC4626Vault__factory)
      const depositTx = await unitranchePortfolio.executeDeposit(investment.address, investmentDepositAmount)
      const increaseValueTx = await investment.setValue(doubleInvestmentAmount)

      const depositTxTimestamp = await getTxTimestamp(depositTx)
      const increaseValueTxTimestamp = await getTxTimestamp(increaseValueTx)

      const registerTimeElapsed = investment.createTxTimestamp - startTxTimestamp
      const depositTimeElapsed = depositTxTimestamp - investment.createTxTimestamp
      const increaseValueTimeElapsed = increaseValueTxTimestamp - depositTxTimestamp

      const tranchesValuesAfterRegister = await calculateTranchesValuesAfterTime(unitranchePortfolio, [equityDepositAssets], registerTimeElapsed)
      const tranchesValuesAfterDeposit = await calculateTranchesValuesAfterTime(unitranchePortfolio, tranchesValuesAfterRegister, depositTimeElapsed)
      const portfolioValueAfterIncrease = sumArray(tranchesValuesAfterDeposit).add(investmentDepositAmount)
      const tranchesValuesAfterFees = await calculateTranchesValuesAfterTime(unitranchePortfolio, tranchesValuesAfterDeposit, increaseValueTimeElapsed, portfolioValueAfterIncrease)

      expect((await unitranchePortfolio.calculateWaterfall())[0]).to.deep.eq(tranchesValuesAfterFees[0])
    })

    it('investment lost value', async () => {
      const { unitranchePortfolio, unitranche, parseMockToken, approveAndDepositToTranche, wallet, setProtocolAndTranchesFeeRates } = await loadFixture(structuredIndexedPortfolioFixture)
      await setProtocolAndTranchesFeeRates([unitranche], DEFAULT_PROTOCOL_FEE_RATE, [EQUITY_FEE_RATE])
      const equityDepositAssets = parseMockToken(EQUITY_DEPOSIT_ASSETS)
      const investmentDepositAmount = equityDepositAssets.div(2)
      const halfInvestmentAmount = investmentDepositAmount.div(2)

      await approveAndDepositToTranche(unitranche, equityDepositAssets, wallet)

      const startTxTimestamp = await startAndGetTimestamp(unitranchePortfolio)
      const investment = await createAndRegisterInvestment(unitranchePortfolio, wallet, MockERC4626Vault__factory)
      const depositTx = await unitranchePortfolio.executeDeposit(investment.address, investmentDepositAmount)
      const increaseValueTx = await investment.setValue(halfInvestmentAmount)

      const depositTxTimestamp = await getTxTimestamp(depositTx)
      const increaseValueTxTimestamp = await getTxTimestamp(increaseValueTx)

      const registerTimeElapsed = investment.createTxTimestamp - startTxTimestamp
      const depositTimeElapsed = depositTxTimestamp - investment.createTxTimestamp
      const increaseValueTimeElapsed = increaseValueTxTimestamp - depositTxTimestamp

      const tranchesValuesAfterRegister = await calculateTranchesValuesAfterTime(unitranchePortfolio, [equityDepositAssets], registerTimeElapsed)
      const tranchesValuesAfterDeposit = await calculateTranchesValuesAfterTime(unitranchePortfolio, tranchesValuesAfterRegister, depositTimeElapsed)
      const portfolioValueAfterIncrease = sumArray(tranchesValuesAfterDeposit).sub(halfInvestmentAmount)
      const tranchesValuesAfterFees = await calculateTranchesValuesAfterTime(unitranchePortfolio, tranchesValuesAfterDeposit, increaseValueTimeElapsed, portfolioValueAfterIncrease)

      expect((await unitranchePortfolio.calculateWaterfall())[0]).to.deep.eq(tranchesValuesAfterFees[0])
    })

    it('closed', async () => {
      const { unitranchePortfolio, parseMockToken, approveAndDepositToTranche, unitranche, wallet, setProtocolAndTranchesFeeRates } = await loadFixture(structuredIndexedPortfolioFixture)
      await setProtocolAndTranchesFeeRates([unitranche], DEFAULT_PROTOCOL_FEE_RATE, [EQUITY_FEE_RATE])
      const equityDepositAssets = parseMockToken(EQUITY_DEPOSIT_ASSETS)
      await approveAndDepositToTranche(unitranche, equityDepositAssets, wallet)

      const closeTxTimestamp = await startTimeTravelAndClosePortfolio(unitranchePortfolio)
      const timeElapsedAfterClose = ONE_DAY_IN_SECONDS
      await timeTravelTo(closeTxTimestamp + timeElapsedAfterClose)

      const equityTrancheVirtualTokenBalance = await unitranche.virtualTokenBalance()
      const protocolFees = calculateInterest(DEFAULT_PROTOCOL_FEE_RATE, timeElapsedAfterClose, equityTrancheVirtualTokenBalance)

      const waterfall = await unitranchePortfolio.calculateWaterfall()
      const expectedEquityAssets = equityTrancheVirtualTokenBalance.sub(protocolFees)
      expect(waterfall).to.deep.eq([expectedEquityAssets])
    })
  })
})
