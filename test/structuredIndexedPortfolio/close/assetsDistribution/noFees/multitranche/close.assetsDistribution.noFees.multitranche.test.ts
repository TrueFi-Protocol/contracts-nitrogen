import { expect, use } from 'chai'
import { describe, it } from 'mocha'
import { solidity } from 'ethereum-waffle'
import { setupFixtureLoader } from 'test/setup'
import { structuredIndexedPortfolioFixture } from 'fixtures/structuredIndexedPortfolioFixture'
import { getPortfolioDuration, getTranchesData, getTxTimestamp, startTimeTravelAndClosePortfolio, sumArray, timeTravelTo } from 'utils'
import { Zero } from '@ethersproject/constants'
import { BigNumber } from 'ethers'

use(solidity)

const EQUITY_DEPOSIT_ASSETS = 3_000_000
const JUNIOR_DEPOSIT_ASSETS = 2_000_000
const SENIOR_DEPOSIT_ASSETS = 1_000_000
const DEPOSIT_AMOUNTS = [
  EQUITY_DEPOSIT_ASSETS,
  JUNIOR_DEPOSIT_ASSETS,
  SENIOR_DEPOSIT_ASSETS,
]

describe('StructuredIndexedPortfolio.close.assetsDistribution.noFees.multitranche', () => {
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
      const { portfolio, token, tranches, wallet, parseMockToken, depositAndCalculateAssumedTranchesValue } = await loadFixture(structuredIndexedPortfolioFixture)
      const depositAmounts = DEPOSIT_AMOUNTS.map(parseMockToken)
      const timeElapsed = await getPortfolioDuration(portfolio)
      const [, expectedJuniorTrancheValue, expectedSeniorTrancheValue] = await depositAndCalculateAssumedTranchesValue(depositAmounts, wallet, timeElapsed)

      const startTx = await portfolio.start()
      const startTxTimestamp = await getTxTimestamp(startTx)

      const seniorUnderflow = BigNumber.from(1)
      const expectedSeniorDistributedAssets = expectedSeniorTrancheValue.sub(seniorUnderflow)
      const remainingAssets = expectedSeniorDistributedAssets
      const lostAssets = sumArray(depositAmounts).sub(remainingAssets)
      await token.burn(portfolio.address, lostAssets)
      await portfolio.setVirtualTokenBalance(remainingAssets)

      await timeTravelTo(startTxTimestamp + timeElapsed)
      await portfolio.close()

      const tranchesData = await getTranchesData(portfolio)

      const equityTrancheData = tranchesData[0]
      const equityTranche = tranches[0]
      expect(equityTrancheData.maxValueOnClose).to.eq(Zero)
      expect(equityTrancheData.distributedAssets).to.eq(Zero)
      expect(await token.balanceOf(equityTranche.address)).to.eq(Zero)
      expect('updateCheckpointFromPortfolio').to.be.calledOnContractWith(equityTranche, [Zero])

      const juniorTrancheData = tranchesData[1]
      const juniorTranche = tranches[1]
      expect(juniorTrancheData.maxValueOnClose).to.eq(expectedJuniorTrancheValue)
      expect(juniorTrancheData.distributedAssets).to.eq(Zero)
      expect(await token.balanceOf(juniorTranche.address)).to.eq(Zero)
      expect('updateCheckpointFromPortfolio').to.be.calledOnContractWith(juniorTranche, [Zero])

      const seniorTrancheData = tranchesData[2]
      const seniorTranche = tranches[2]
      expect(seniorTrancheData.maxValueOnClose).to.eq(expectedSeniorTrancheValue)
      expect(seniorTrancheData.distributedAssets).to.eq(expectedSeniorDistributedAssets)
      expect(await token.balanceOf(seniorTranche.address)).to.eq(expectedSeniorDistributedAssets)
      expect('updateCheckpointFromPortfolio').to.be.calledOnContractWith(seniorTranche, [expectedSeniorDistributedAssets])
    })

    it('senior full, junior empty, equity empty', async () => {
      const { portfolio, token, tranches, wallet, parseMockToken, depositAndCalculateAssumedTranchesValue } = await loadFixture(structuredIndexedPortfolioFixture)
      const depositAmounts = DEPOSIT_AMOUNTS.map(parseMockToken)
      const timeElapsed = await getPortfolioDuration(portfolio)
      const [, expectedJuniorTrancheValue, expectedSeniorTrancheValue] = await depositAndCalculateAssumedTranchesValue(depositAmounts, wallet, timeElapsed)

      const startTx = await portfolio.start()
      const startTxTimestamp = await getTxTimestamp(startTx)

      const remainingAssets = expectedSeniorTrancheValue
      const lostAssets = sumArray(depositAmounts).sub(remainingAssets)
      await token.burn(portfolio.address, lostAssets)
      await portfolio.setVirtualTokenBalance(remainingAssets)

      await timeTravelTo(startTxTimestamp + timeElapsed)
      await portfolio.close()

      const tranchesData = await getTranchesData(portfolio)

      const equityTrancheData = tranchesData[0]
      const equityTranche = tranches[0]
      expect(equityTrancheData.maxValueOnClose).to.eq(Zero)
      expect(equityTrancheData.distributedAssets).to.eq(Zero)
      expect(await token.balanceOf(equityTranche.address)).to.eq(Zero)
      expect('updateCheckpointFromPortfolio').to.be.calledOnContractWith(equityTranche, [Zero])

      const juniorTrancheData = tranchesData[1]
      const juniorTranche = tranches[1]
      expect(juniorTrancheData.maxValueOnClose).to.eq(expectedJuniorTrancheValue)
      expect(juniorTrancheData.distributedAssets).to.eq(Zero)
      expect(await token.balanceOf(juniorTranche.address)).to.eq(Zero)
      expect('updateCheckpointFromPortfolio').to.be.calledOnContractWith(juniorTranche, [Zero])

      const seniorTrancheData = tranchesData[2]
      const seniorTranche = tranches[2]
      expect(seniorTrancheData.maxValueOnClose).to.eq(expectedSeniorTrancheValue)
      expect(seniorTrancheData.distributedAssets).to.eq(expectedSeniorTrancheValue)
      expect(await token.balanceOf(seniorTranche.address)).to.eq(expectedSeniorTrancheValue)
      expect('updateCheckpointFromPortfolio').to.be.calledOnContractWith(seniorTranche, [expectedSeniorTrancheValue])
    })

    it('senior full, junior underflow, equity empty', async () => {
      const { portfolio, token, tranches, wallet, parseMockToken, depositAndCalculateAssumedTranchesValue } = await loadFixture(structuredIndexedPortfolioFixture)
      const depositAmounts = DEPOSIT_AMOUNTS.map(parseMockToken)
      const timeElapsed = await getPortfolioDuration(portfolio)
      const [, expectedJuniorTrancheValue, expectedSeniorTrancheValue] = await depositAndCalculateAssumedTranchesValue(depositAmounts, wallet, timeElapsed)

      const startTx = await portfolio.start()
      const startTxTimestamp = await getTxTimestamp(startTx)

      const juniorUnderflow = BigNumber.from(1)
      const expectedJuniorDistributedAssets = expectedJuniorTrancheValue.sub(juniorUnderflow)
      const remainingAssets = expectedSeniorTrancheValue.add(expectedJuniorDistributedAssets)
      const lostAssets = sumArray(depositAmounts).sub(remainingAssets)
      await token.burn(portfolio.address, lostAssets)
      await portfolio.setVirtualTokenBalance(remainingAssets)

      await timeTravelTo(startTxTimestamp + timeElapsed)
      await portfolio.close()

      const tranchesData = await getTranchesData(portfolio)

      const equityTrancheData = tranchesData[0]
      const equityTranche = tranches[0]
      expect(equityTrancheData.maxValueOnClose).to.eq(Zero)
      expect(equityTrancheData.distributedAssets).to.eq(Zero)
      expect(await token.balanceOf(equityTranche.address)).to.eq(Zero)
      expect('updateCheckpointFromPortfolio').to.be.calledOnContractWith(equityTranche, [Zero])

      const juniorTrancheData = tranchesData[1]
      const juniorTranche = tranches[1]
      expect(juniorTrancheData.maxValueOnClose).to.eq(expectedJuniorTrancheValue)
      expect(juniorTrancheData.distributedAssets).to.eq(expectedJuniorDistributedAssets)
      expect(await token.balanceOf(juniorTranche.address)).to.eq(expectedJuniorDistributedAssets)
      expect('updateCheckpointFromPortfolio').to.be.calledOnContractWith(juniorTranche, [expectedJuniorDistributedAssets])

      const seniorTrancheData = tranchesData[2]
      const seniorTranche = tranches[2]
      expect(seniorTrancheData.maxValueOnClose).to.eq(expectedSeniorTrancheValue)
      expect(seniorTrancheData.distributedAssets).to.eq(expectedSeniorTrancheValue)
      expect(await token.balanceOf(seniorTranche.address)).to.eq(expectedSeniorTrancheValue)
      expect('updateCheckpointFromPortfolio').to.be.calledOnContractWith(seniorTranche, [expectedSeniorTrancheValue])
    })

    it('senior full, junior full, equity empty', async () => {
      const { portfolio, token, tranches, wallet, parseMockToken, depositAndCalculateAssumedTranchesValue } = await loadFixture(structuredIndexedPortfolioFixture)
      const depositAmounts = DEPOSIT_AMOUNTS.map(parseMockToken)
      const timeElapsed = await getPortfolioDuration(portfolio)
      const [, expectedJuniorTrancheValue, expectedSeniorTrancheValue] = await depositAndCalculateAssumedTranchesValue(depositAmounts, wallet, timeElapsed)

      const startTx = await portfolio.start()
      const startTxTimestamp = await getTxTimestamp(startTx)

      const remainingAssets = expectedSeniorTrancheValue.add(expectedJuniorTrancheValue)
      const lostAssets = sumArray(depositAmounts).sub(remainingAssets)
      await token.burn(portfolio.address, lostAssets)
      await portfolio.setVirtualTokenBalance(remainingAssets)

      await timeTravelTo(startTxTimestamp + timeElapsed)
      await portfolio.close()

      const tranchesData = await getTranchesData(portfolio)

      const equityTrancheData = tranchesData[0]
      const equityTranche = tranches[0]
      expect(equityTrancheData.maxValueOnClose).to.eq(Zero)
      expect(equityTrancheData.distributedAssets).to.eq(Zero)
      expect(await token.balanceOf(equityTranche.address)).to.eq(Zero)
      expect('updateCheckpointFromPortfolio').to.be.calledOnContractWith(equityTranche, [Zero])

      const juniorTrancheData = tranchesData[1]
      const juniorTranche = tranches[1]
      expect(juniorTrancheData.maxValueOnClose).to.eq(expectedJuniorTrancheValue)
      expect(juniorTrancheData.distributedAssets).to.eq(expectedJuniorTrancheValue)
      expect(await token.balanceOf(juniorTranche.address)).to.eq(expectedJuniorTrancheValue)
      expect('updateCheckpointFromPortfolio').to.be.calledOnContractWith(juniorTranche, [expectedJuniorTrancheValue])

      const seniorTrancheData = tranchesData[2]
      const seniorTranche = tranches[2]
      expect(seniorTrancheData.maxValueOnClose).to.eq(expectedSeniorTrancheValue)
      expect(seniorTrancheData.distributedAssets).to.eq(expectedSeniorTrancheValue)
      expect(await token.balanceOf(seniorTranche.address)).to.eq(expectedSeniorTrancheValue)
      expect('updateCheckpointFromPortfolio').to.be.calledOnContractWith(seniorTranche, [expectedSeniorTrancheValue])
    })

    it('senior full, junior full, equity loses value', async () => {
      const { portfolio, token, tranches, wallet, parseMockToken, depositAndCalculateAssumedTranchesValue } = await loadFixture(structuredIndexedPortfolioFixture)
      const depositAmounts = DEPOSIT_AMOUNTS.map(parseMockToken)
      const timeElapsed = await getPortfolioDuration(portfolio)
      const [, expectedJuniorTrancheValue, expectedSeniorTrancheValue] = await depositAndCalculateAssumedTranchesValue(depositAmounts, wallet, timeElapsed)

      const startTx = await portfolio.start()
      const startTxTimestamp = await getTxTimestamp(startTx)

      await timeTravelTo(startTxTimestamp + timeElapsed)
      await portfolio.close()

      const expectedEquityDistributedAssets = sumArray(depositAmounts).sub(expectedSeniorTrancheValue).sub(expectedJuniorTrancheValue)
      const tranchesData = await getTranchesData(portfolio)

      const equityTrancheData = tranchesData[0]
      const equityTranche = tranches[0]
      expect(equityTrancheData.maxValueOnClose).to.eq(Zero)
      expect(equityTrancheData.distributedAssets).to.eq(expectedEquityDistributedAssets)
      expect(await token.balanceOf(equityTranche.address)).to.eq(expectedEquityDistributedAssets)
      expect('updateCheckpointFromPortfolio').to.be.calledOnContractWith(equityTranche, [expectedEquityDistributedAssets])

      const juniorTrancheData = tranchesData[1]
      const juniorTranche = tranches[1]
      expect(juniorTrancheData.maxValueOnClose).to.eq(expectedJuniorTrancheValue)
      expect(juniorTrancheData.distributedAssets).to.eq(expectedJuniorTrancheValue)
      expect(await token.balanceOf(juniorTranche.address)).to.eq(expectedJuniorTrancheValue)
      expect('updateCheckpointFromPortfolio').to.be.calledOnContractWith(juniorTranche, [expectedJuniorTrancheValue])

      const seniorTrancheData = tranchesData[2]
      const seniorTranche = tranches[2]
      expect(seniorTrancheData.maxValueOnClose).to.eq(expectedSeniorTrancheValue)
      expect(seniorTrancheData.distributedAssets).to.eq(expectedSeniorTrancheValue)
      expect(await token.balanceOf(seniorTranche.address)).to.eq(expectedSeniorTrancheValue)
      expect('updateCheckpointFromPortfolio').to.be.calledOnContractWith(seniorTranche, [expectedSeniorTrancheValue])
    })

    it('senior full, junior full, equity gains value', async () => {
      const { portfolio, token, tranches, wallet, parseMockToken, depositAndCalculateAssumedTranchesValue } = await loadFixture(structuredIndexedPortfolioFixture)
      const depositAmounts = DEPOSIT_AMOUNTS.map(parseMockToken)
      const timeElapsed = await getPortfolioDuration(portfolio)
      const [, expectedJuniorTrancheValue, expectedSeniorTrancheValue] = await depositAndCalculateAssumedTranchesValue(depositAmounts, wallet, timeElapsed)

      const startTx = await portfolio.start()
      const startTxTimestamp = await getTxTimestamp(startTx)

      const expectedEquityDistributedAssets = depositAmounts[0].add(1)
      const totalAssets = expectedEquityDistributedAssets.add(expectedJuniorTrancheValue).add(expectedSeniorTrancheValue)
      const extraAssets = totalAssets.sub(sumArray(depositAmounts))
      await token.mint(portfolio.address, extraAssets)
      await portfolio.setVirtualTokenBalance(totalAssets)

      await timeTravelTo(startTxTimestamp + timeElapsed)
      await portfolio.close()

      const tranchesData = await getTranchesData(portfolio)

      const equityTrancheData = tranchesData[0]
      const equityTranche = tranches[0]
      expect(equityTrancheData.maxValueOnClose).to.eq(Zero)
      expect(equityTrancheData.distributedAssets).to.eq(expectedEquityDistributedAssets)
      expect(await token.balanceOf(equityTranche.address)).to.eq(expectedEquityDistributedAssets)
      expect('updateCheckpointFromPortfolio').to.be.calledOnContractWith(equityTranche, [expectedEquityDistributedAssets])

      const juniorTrancheData = tranchesData[1]
      const juniorTranche = tranches[1]
      expect(juniorTrancheData.maxValueOnClose).to.eq(expectedJuniorTrancheValue)
      expect(juniorTrancheData.distributedAssets).to.eq(expectedJuniorTrancheValue)
      expect(await token.balanceOf(juniorTranche.address)).to.eq(expectedJuniorTrancheValue)
      expect('updateCheckpointFromPortfolio').to.be.calledOnContractWith(juniorTranche, [expectedJuniorTrancheValue])

      const seniorTrancheData = tranchesData[2]
      const seniorTranche = tranches[2]
      expect(seniorTrancheData.maxValueOnClose).to.eq(expectedSeniorTrancheValue)
      expect(seniorTrancheData.distributedAssets).to.eq(expectedSeniorTrancheValue)
      expect(await token.balanceOf(seniorTranche.address)).to.eq(expectedSeniorTrancheValue)
      expect('updateCheckpointFromPortfolio').to.be.calledOnContractWith(seniorTranche, [expectedSeniorTrancheValue])
    })
  })
})
