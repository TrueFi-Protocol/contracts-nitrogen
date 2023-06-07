import { expect, use } from 'chai'
import { describe, it } from 'mocha'
import { solidity } from 'ethereum-waffle'
import { setupFixtureLoader } from 'test/setup'
import { structuredIndexedPortfolioFixture } from 'fixtures/structuredIndexedPortfolioFixture'
import { calculateTotalPendingFees, getPortfolioDuration, getTranchesData, ONE_YEAR_IN_SECONDS, percentToBips, setNextBlockTimestamp, startAndGetTimestamp, startTimeTravelAndClosePortfolio } from 'utils'
import { Zero } from '@ethersproject/constants'

use(solidity)

const DEFAULT_PROTOCOL_FEE_RATE = 400
const EQUITY_FEE_RATE = 100
const EQUITY_DEPOSIT_ASSETS = 1_000_000

describe('StructuredIndexedPortfolio.close.assetsDistribution.withFees.unitranche', () => {
  const loadFixture = setupFixtureLoader()

  it('no deposits', async () => {
    const { unitranchePortfolio: portfolio, unitranche: tranche, token, setProtocolAndTranchesFeeRates } = await loadFixture(structuredIndexedPortfolioFixture)
    await setProtocolAndTranchesFeeRates([tranche], DEFAULT_PROTOCOL_FEE_RATE, [EQUITY_FEE_RATE])

    await startTimeTravelAndClosePortfolio(portfolio)

    const tranchesData = await getTranchesData(portfolio)
    const trancheData = tranchesData[0]
    expect(trancheData.maxValueOnClose).to.eq(Zero)
    expect(trancheData.distributedAssets).to.eq(Zero)
    expect(await token.balanceOf(tranche.address)).to.eq(Zero)
    expect('updateCheckpointFromPortfolio').to.be.calledOnContractWith(tranche, [Zero, Zero])
  })

  describe('with deposits', () => {
    it('value decreased', async () => {
      const { unitranchePortfolio: portfolio, unitranche: tranche, token, wallet, approveAndDepositToTranche, parseMockToken, setProtocolAndTranchesFeeRates } = await loadFixture(structuredIndexedPortfolioFixture)
      const depositAssets = parseMockToken(EQUITY_DEPOSIT_ASSETS)
      const timeElapsed = await getPortfolioDuration(portfolio)
      await setProtocolAndTranchesFeeRates([tranche], DEFAULT_PROTOCOL_FEE_RATE, [EQUITY_FEE_RATE])
      await approveAndDepositToTranche(tranche, depositAssets, wallet)

      const startTimestamp = await startAndGetTimestamp(portfolio)

      const lostAssets = depositAssets.div(3)
      const remainingAssets = depositAssets.sub(lostAssets)
      await token.burn(portfolio.address, lostAssets)
      await portfolio.setVirtualTokenBalance(remainingAssets)

      await setNextBlockTimestamp(startTimestamp + timeElapsed)
      await portfolio.close()

      const totalFees = calculateTotalPendingFees([remainingAssets], DEFAULT_PROTOCOL_FEE_RATE, [EQUITY_FEE_RATE], timeElapsed)
      const remainingAssetsAfterFees = remainingAssets.sub(totalFees)

      const tranchesData = await getTranchesData(portfolio)
      const trancheData = tranchesData[0]
      expect(trancheData.maxValueOnClose).to.eq(Zero)
      expect(trancheData.distributedAssets).to.eq(remainingAssetsAfterFees)
      expect(await token.balanceOf(tranche.address)).to.eq(remainingAssetsAfterFees)
      expect('updateCheckpointFromPortfolio').to.be.calledOnContractWith(tranche, [remainingAssetsAfterFees, Zero])
    })

    it('value increased', async () => {
      const { unitranchePortfolio: portfolio, unitranche: tranche, token, wallet, approveAndDepositToTranche, parseMockToken, setProtocolAndTranchesFeeRates } = await loadFixture(structuredIndexedPortfolioFixture)
      const depositAssets = parseMockToken(EQUITY_DEPOSIT_ASSETS)
      const timeElapsed = await getPortfolioDuration(portfolio)
      await setProtocolAndTranchesFeeRates([tranche], DEFAULT_PROTOCOL_FEE_RATE, [EQUITY_FEE_RATE])
      await approveAndDepositToTranche(tranche, depositAssets, wallet)

      const startTimestamp = await startAndGetTimestamp(portfolio)

      const gainedValue = depositAssets.div(3)
      const totalAssets = depositAssets.add(gainedValue)
      await token.mint(portfolio.address, gainedValue)
      await portfolio.setVirtualTokenBalance(totalAssets)

      await setNextBlockTimestamp(startTimestamp + timeElapsed)
      await portfolio.close()

      const totalFees = calculateTotalPendingFees([totalAssets], DEFAULT_PROTOCOL_FEE_RATE, [EQUITY_FEE_RATE], timeElapsed)
      const totalAssetsAfterFees = totalAssets.sub(totalFees)

      const tranchesData = await getTranchesData(portfolio)
      const trancheData = tranchesData[0]
      expect(trancheData.maxValueOnClose).to.eq(Zero)
      expect(trancheData.distributedAssets).to.eq(totalAssetsAfterFees)
      expect(await token.balanceOf(tranche.address)).to.eq(totalAssetsAfterFees)
      expect('updateCheckpointFromPortfolio').to.be.calledOnContractWith(tranche, [totalAssetsAfterFees, Zero])
    })

    it('fee bigger than value', async () => {
      const { unitranchePortfolio: portfolio, unitranche: tranche, token, wallet, approveAndDepositToTranche, parseMockToken, setProtocolAndTranchesFeeRates } = await loadFixture(structuredIndexedPortfolioFixture)
      const depositAssets = parseMockToken(EQUITY_DEPOSIT_ASSETS)
      const timeElapsed = await getPortfolioDuration(portfolio)
      const maxFeeRate = Math.round(percentToBips(200) * ONE_YEAR_IN_SECONDS / timeElapsed)
      await setProtocolAndTranchesFeeRates([tranche], DEFAULT_PROTOCOL_FEE_RATE, [maxFeeRate])
      await approveAndDepositToTranche(tranche, depositAssets, wallet)

      const startTimestamp = await startAndGetTimestamp(portfolio)
      await setNextBlockTimestamp(startTimestamp + timeElapsed)
      await portfolio.close()

      const tranchesData = await getTranchesData(portfolio)
      const trancheData = tranchesData[0]
      expect(trancheData.maxValueOnClose).to.eq(Zero)
      expect(trancheData.distributedAssets).to.eq(Zero)
      expect(await token.balanceOf(tranche.address)).to.eq(Zero)
      expect('updateCheckpointFromPortfolio').to.be.calledOnContractWith(tranche, [Zero, Zero])
    })
  })
})
