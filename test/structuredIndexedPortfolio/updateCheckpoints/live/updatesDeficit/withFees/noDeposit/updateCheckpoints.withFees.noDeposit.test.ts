import { Zero } from '@ethersproject/constants'
import { expect, use } from 'chai'
import { solidity } from 'ethereum-waffle'
import { structuredIndexedPortfolioFixture } from 'fixtures/structuredIndexedPortfolioFixture'
import { setupFixtureLoader } from 'test/setup'
import {
  getHalfPortfolioDuration,
  setNextBlockTimestamp,
  setTranchesAndProtocolFeeRates,
  startAndGetTimestamp,
  subtractFees,
  sumArray,
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

describe('StructuredIndexedPortfolio.updateCheckpoints.withFees.noDeposit', () => {
  const loadFixture = setupFixtureLoader()

  it('immediately after start', async () => {
    const { portfolio, protocolConfig, tranches } = await loadFixture(structuredIndexedPortfolioFixture)
    const [equityTranche, juniorTranche, seniorTranche] = tranches
    await setTranchesAndProtocolFeeRates(protocolConfig, tranches, DEFAULT_PROTOCOL_FEE_RATE, TRANCHES_FEE_RATES)
    await portfolio.start()
    await portfolio.updateCheckpoints()

    const equityCheckpoint = await equityTranche.getCheckpoint()
    const juniorCheckpoint = await juniorTranche.getCheckpoint()
    const seniorCheckpoint = await seniorTranche.getCheckpoint()
    expect('updateCheckpointFromPortfolio').to.be.calledOnContractWith(equityTranche, [Zero])
    expect('updateCheckpointFromPortfolio').to.be.calledOnContractWith(juniorTranche, [Zero])
    expect('updateCheckpointFromPortfolio').to.be.calledOnContractWith(seniorTranche, [Zero])
    expect(equityCheckpoint.deficit).to.eq(Zero)
    expect(juniorCheckpoint.deficit).to.eq(Zero)
    expect(seniorCheckpoint.deficit).to.eq(Zero)
  })

  it('half portfolio duration', async () => {
    const { portfolio, protocolConfig, tranches } = await loadFixture(structuredIndexedPortfolioFixture)
    const [equityTranche, juniorTranche, seniorTranche] = tranches
    const halfPortfolioDuration = await getHalfPortfolioDuration(portfolio)
    await setTranchesAndProtocolFeeRates(protocolConfig, tranches, DEFAULT_PROTOCOL_FEE_RATE, TRANCHES_FEE_RATES)
    const startTimestamp = await startAndGetTimestamp(portfolio)

    await setNextBlockTimestamp(startTimestamp + halfPortfolioDuration)
    await portfolio.updateCheckpoints()

    const equityCheckpoint = await equityTranche.getCheckpoint()
    const juniorCheckpoint = await juniorTranche.getCheckpoint()
    const seniorCheckpoint = await seniorTranche.getCheckpoint()
    expect('updateCheckpointFromPortfolio').to.be.calledOnContractWith(equityTranche, [Zero])
    expect('updateCheckpointFromPortfolio').to.be.calledOnContractWith(juniorTranche, [Zero])
    expect('updateCheckpointFromPortfolio').to.be.calledOnContractWith(seniorTranche, [Zero])
    expect(equityCheckpoint.deficit).to.eq(Zero)
    expect(juniorCheckpoint.deficit).to.eq(Zero)
    expect(seniorCheckpoint.deficit).to.eq(Zero)
  })

  it('real total assets non-zero', async () => {
    const { portfolio, protocolConfig, tranches, parseMockToken, token } = await loadFixture(structuredIndexedPortfolioFixture)
    const [equityTranche, juniorTranche, seniorTranche] = tranches
    const halfPortfolioDuration = await getHalfPortfolioDuration(portfolio)
    await setTranchesAndProtocolFeeRates(protocolConfig, tranches, DEFAULT_PROTOCOL_FEE_RATE, TRANCHES_FEE_RATES)
    const startTimestamp = await startAndGetTimestamp(portfolio)

    const virtualTokenBalance = sumArray(DEPOSIT_AMOUNTS.map(parseMockToken))
    await token.mint(portfolio.address, virtualTokenBalance)
    await portfolio.setVirtualTokenBalance(virtualTokenBalance)
    await setNextBlockTimestamp(startTimestamp + halfPortfolioDuration)
    await portfolio.updateCheckpoints()

    const expectedEquityValue = subtractFees(virtualTokenBalance, halfPortfolioDuration, DEFAULT_PROTOCOL_FEE_RATE, EQUITY_FEE_RATE)
    const equityCheckpoint = await equityTranche.getCheckpoint()
    const juniorCheckpoint = await juniorTranche.getCheckpoint()
    const seniorCheckpoint = await seniorTranche.getCheckpoint()
    expect('updateCheckpointFromPortfolio').to.be.calledOnContractWith(equityTranche, [expectedEquityValue])
    expect('updateCheckpointFromPortfolio').to.be.calledOnContractWith(juniorTranche, [Zero])
    expect('updateCheckpointFromPortfolio').to.be.calledOnContractWith(seniorTranche, [Zero])
    expect(equityCheckpoint.deficit).to.eq(Zero)
    expect(juniorCheckpoint.deficit).to.eq(Zero)
    expect(seniorCheckpoint.deficit).to.eq(Zero)
  })

  it('multiple updates', async () => {
    const { portfolio, protocolConfig, tranches } = await loadFixture(structuredIndexedPortfolioFixture)
    const [equityTranche, juniorTranche, seniorTranche] = tranches
    const halfPortfolioDuration = await getHalfPortfolioDuration(portfolio)
    await setTranchesAndProtocolFeeRates(protocolConfig, tranches, DEFAULT_PROTOCOL_FEE_RATE, TRANCHES_FEE_RATES)
    const startTimestamp = await startAndGetTimestamp(portfolio)

    await setNextBlockTimestamp(startTimestamp + halfPortfolioDuration)
    await portfolio.updateCheckpoints()
    await portfolio.updateCheckpoints()
    await portfolio.updateCheckpoints()
    await portfolio.updateCheckpoints()

    const equityCheckpoint = await equityTranche.getCheckpoint()
    const juniorCheckpoint = await juniorTranche.getCheckpoint()
    const seniorCheckpoint = await seniorTranche.getCheckpoint()
    expect('updateCheckpointFromPortfolio').to.be.calledOnContractWith(equityTranche, [Zero])
    expect('updateCheckpointFromPortfolio').to.be.calledOnContractWith(juniorTranche, [Zero])
    expect('updateCheckpointFromPortfolio').to.be.calledOnContractWith(seniorTranche, [Zero])
    expect(equityCheckpoint.deficit).to.eq(Zero)
    expect(juniorCheckpoint.deficit).to.eq(Zero)
    expect(seniorCheckpoint.deficit).to.eq(Zero)
  })
})
