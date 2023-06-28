import { Zero } from '@ethersproject/constants'
import { expect, use } from 'chai'
import { solidity } from 'ethereum-waffle'
import { describe, it } from 'mocha'

import { structuredIndexedPortfolioFixture, StructuredIndexedPortfolioStatus } from 'fixtures/structuredIndexedPortfolioFixture'
import { setupFixtureLoader } from 'test/setup'
import { getTxTimestamp, timeTravelTo } from 'utils'

use(solidity)

describe('StructuredIndexedPortfolio.close.capitalFormation', () => {
  const loadFixture = setupFixtureLoader()

  describe('sets Closed status', () => {
    it('manager', async () => {
      const { portfolio } = await loadFixture(structuredIndexedPortfolioFixture)
      await portfolio.close()
      expect(await portfolio.status()).to.eq(StructuredIndexedPortfolioStatus.Closed)
    })

    it('non-manager', async () => {
      const { portfolio, other } = await loadFixture(structuredIndexedPortfolioFixture)
      const startDeadline = await portfolio.startDeadline()
      await timeTravelTo(startDeadline.toNumber() + 1)
      await portfolio.connect(other).close()
      expect(await portfolio.status()).to.eq(StructuredIndexedPortfolioStatus.Closed)
    })
  })

  it('does not set endDate', async () => {
    const { portfolio } = await loadFixture(structuredIndexedPortfolioFixture)
    await portfolio.close()
    expect(await portfolio.endDate()).to.eq(Zero)
  })

  it('does not set deficit checkpoint timestamp', async () => {
    const { portfolio, tranches: [equityTranche, juniorTranche, seniorTranche] } = await loadFixture(structuredIndexedPortfolioFixture)

    const tx = await portfolio.close()
    const expectedTimestamp = await getTxTimestamp(tx)

    const equityCheckpoint = await equityTranche.getCheckpoint()
    const juniorCheckpoint = await juniorTranche.getCheckpoint()
    const seniorCheckpoint = await seniorTranche.getCheckpoint()
    expect(equityCheckpoint.timestamp).to.eq(expectedTimestamp)
    expect(juniorCheckpoint.timestamp).to.eq(expectedTimestamp)
    expect(seniorCheckpoint.timestamp).to.eq(expectedTimestamp)
  })

  it('calls updateCheckpointFromPortfolio', async () => {
    const { portfolio, tranches, wallet, parseMockToken, depositToTranches } = await loadFixture(structuredIndexedPortfolioFixture)
    const equityAssets = parseMockToken(3_000_000)
    const juniorAssets = parseMockToken(2_000_000)
    const seniorAssets = parseMockToken(1_000_000)
    const depositAssets = [equityAssets, juniorAssets, seniorAssets]
    await depositToTranches(portfolio, depositAssets, wallet)

    await portfolio.close()

    expect('updateCheckpointFromPortfolio').to.be.calledOnContractWith(tranches[0], [Zero])
    expect('updateCheckpointFromPortfolio').to.be.calledOnContractWith(tranches[1], [Zero])
    expect('updateCheckpointFromPortfolio').to.be.calledOnContractWith(tranches[2], [Zero])
  })

  it('emits event', async () => {
    const { portfolio } = await loadFixture(structuredIndexedPortfolioFixture)
    await expect(portfolio.close())
      .to.emit(portfolio, 'PortfolioStatusChanged')
      .withArgs(StructuredIndexedPortfolioStatus.Closed)
  })

  describe('before start deadline', () => {
    it('no investments, manager', async () => {
      const { portfolio } = await loadFixture(structuredIndexedPortfolioFixture)
      await expect(portfolio.close()).not.to.be.reverted
    })

    it('no investments, non-manager', async () => {
      const { portfolio, other } = await loadFixture(structuredIndexedPortfolioFixture)
      await expect(portfolio.connect(other).close())
        .to.be.revertedWith('SIP: Cannot close before start deadline')
    })
  })

  describe('after start deadline', () => {
    it('no investments, manager', async () => {
      const { portfolio } = await loadFixture(structuredIndexedPortfolioFixture)
      const startDeadline = await portfolio.startDeadline()
      await timeTravelTo(startDeadline.toNumber() + 1)
      await expect(portfolio.close()).not.to.be.reverted
    })

    it('no investments, non-manager', async () => {
      const { portfolio, other } = await loadFixture(structuredIndexedPortfolioFixture)
      const startDeadline = await portfolio.startDeadline()
      await timeTravelTo(startDeadline.toNumber() + 1)
      await expect(portfolio.connect(other).close()).not.to.be.reverted
    })
  })
})
