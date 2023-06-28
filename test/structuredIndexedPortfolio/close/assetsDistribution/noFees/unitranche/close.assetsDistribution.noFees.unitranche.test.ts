import { expect, use } from 'chai'
import { describe, it } from 'mocha'
import { solidity } from 'ethereum-waffle'
import { setupFixtureLoader } from 'test/setup'
import { structuredIndexedPortfolioFixture } from 'fixtures/structuredIndexedPortfolioFixture'
import { getPortfolioDuration, getTranchesData, getTxTimestamp, startTimeTravelAndClosePortfolio, timeTravelTo } from 'utils'
import { Zero } from '@ethersproject/constants'

use(solidity)

const EQUITY_DEPOSIT_ASSETS = 1_000_000

describe('StructuredIndexedPortfolio.close.assetsDistribution.noFees.unitranche', () => {
  const loadFixture = setupFixtureLoader()

  it('no deposits', async () => {
    const { unitranchePortfolio: portfolio, unitranche: tranche, token } = await loadFixture(structuredIndexedPortfolioFixture)

    await startTimeTravelAndClosePortfolio(portfolio)

    const tranchesData = await getTranchesData(portfolio)
    const trancheData = tranchesData[0]
    expect(trancheData.maxValueOnClose).to.eq(Zero)
    expect(trancheData.distributedAssets).to.eq(Zero)
    expect(await token.balanceOf(tranche.address)).to.eq(Zero)
    expect('updateCheckpointFromPortfolio').to.be.calledOnContractWith(tranche, [Zero])
  })

  describe('with deposits', () => {
    it('value decreased', async () => {
      const { unitranchePortfolio: portfolio, unitranche: tranche, token, wallet, approveAndDepositToTranche, parseMockToken } = await loadFixture(structuredIndexedPortfolioFixture)
      const depositAssets = parseMockToken(EQUITY_DEPOSIT_ASSETS)
      const timeElapsed = await getPortfolioDuration(portfolio)

      await approveAndDepositToTranche(tranche, depositAssets, wallet)

      const startTx = await portfolio.start()
      const startTxTimestamp = await getTxTimestamp(startTx)

      const lostAssets = depositAssets.div(3)
      const remainingAssets = depositAssets.sub(lostAssets)
      await token.burn(portfolio.address, lostAssets)
      await portfolio.setVirtualTokenBalance(remainingAssets)

      await timeTravelTo(startTxTimestamp + timeElapsed)
      await portfolio.close()

      const tranchesData = await getTranchesData(portfolio)
      const trancheData = tranchesData[0]
      expect(trancheData.maxValueOnClose).to.eq(Zero)
      expect(trancheData.distributedAssets).to.eq(remainingAssets)
      expect(await token.balanceOf(tranche.address)).to.eq(remainingAssets)
      expect('updateCheckpointFromPortfolio').to.be.calledOnContractWith(tranche, [remainingAssets])
    })

    it('value increased', async () => {
      const { unitranchePortfolio: portfolio, unitranche: tranche, token, wallet, approveAndDepositToTranche, parseMockToken } = await loadFixture(structuredIndexedPortfolioFixture)
      const depositAssets = parseMockToken(EQUITY_DEPOSIT_ASSETS)
      const timeElapsed = await getPortfolioDuration(portfolio)

      await approveAndDepositToTranche(tranche, depositAssets, wallet)

      const startTx = await portfolio.start()
      const startTxTimestamp = await getTxTimestamp(startTx)

      const gainedValue = depositAssets.div(3)
      const totalAssets = depositAssets.add(gainedValue)
      await token.mint(portfolio.address, gainedValue)
      await portfolio.setVirtualTokenBalance(totalAssets)

      await timeTravelTo(startTxTimestamp + timeElapsed)
      await portfolio.close()

      const tranchesData = await getTranchesData(portfolio)
      const trancheData = tranchesData[0]
      expect(trancheData.maxValueOnClose).to.eq(Zero)
      expect(trancheData.distributedAssets).to.eq(totalAssets)
      expect(await token.balanceOf(tranche.address)).to.eq(totalAssets)
      expect('updateCheckpointFromPortfolio').to.be.calledOnContractWith(tranche, [totalAssets])
    })
  })
})
