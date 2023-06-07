import { expect, use } from 'chai'
import { describe, it } from 'mocha'
import { solidity } from 'ethereum-waffle'
import { setupFixtureLoader } from 'test/setup'
import { structuredIndexedPortfolioFixture } from 'fixtures/structuredIndexedPortfolioFixture'
import { MockERC4626Vault__factory } from 'build/types'
import { createAndRegisterInvestment } from 'utils/createAndRegisterInvestment'
import { Zero } from '@ethersproject/constants'

use(solidity)

const DEPOSIT_AMOUNT = 100

describe('StructuredIndexedPortfolio.investmentsValue', () => {
  const loadFixture = setupFixtureLoader()

  it('no registered', async () => {
    const { portfolio } = await loadFixture(structuredIndexedPortfolioFixture)
    expect(await portfolio.investmentsValue()).to.eq(Zero)
  })

  describe('one registered', () => {
    it('no deposited', async () => {
      const { portfolio, wallet } = await loadFixture(structuredIndexedPortfolioFixture)
      await portfolio.start()
      await createAndRegisterInvestment(portfolio, wallet, MockERC4626Vault__factory)

      expect(await portfolio.investmentsValue()).to.eq(Zero)
    })

    it('someone else deposited', async () => {
      const { portfolio, parseMockToken, wallet } = await loadFixture(structuredIndexedPortfolioFixture)
      const amount = parseMockToken(DEPOSIT_AMOUNT)

      await portfolio.start()
      const investment = await createAndRegisterInvestment(portfolio, wallet, MockERC4626Vault__factory)
      await investment.approveAndDeposit(amount, wallet.address)

      expect(await portfolio.investmentsValue()).to.eq(Zero)
    })

    it('portfolio deposited', async () => {
      const { portfolio, parseMockToken, wallet } = await loadFixture(structuredIndexedPortfolioFixture)
      const amount = parseMockToken(DEPOSIT_AMOUNT)

      await portfolio.start()
      const investment = await createAndRegisterInvestment(portfolio, wallet, MockERC4626Vault__factory)
      await investment.approveAndDeposit(amount, portfolio.address)

      expect(await portfolio.investmentsValue()).to.eq(amount)
    })

    it('two deposited', async () => {
      const { portfolio, parseMockToken, wallet } = await loadFixture(structuredIndexedPortfolioFixture)
      const amount = parseMockToken(DEPOSIT_AMOUNT)

      await portfolio.start()
      const investment = await createAndRegisterInvestment(portfolio, wallet, MockERC4626Vault__factory)
      await investment.approveAndDeposit(amount, portfolio.address)
      await investment.approveAndDeposit(amount, wallet.address)

      expect(await portfolio.investmentsValue()).to.eq(amount)
    })

    it('gained value', async () => {
      const { portfolio, parseMockToken, wallet } = await loadFixture(structuredIndexedPortfolioFixture)
      const amount = parseMockToken(DEPOSIT_AMOUNT)
      const twiceAmount = amount.mul(2)

      await portfolio.start()
      const investment = await createAndRegisterInvestment(portfolio, wallet, MockERC4626Vault__factory)
      await investment.approveAndDeposit(amount, portfolio.address)

      await investment.setValue(twiceAmount)

      expect(await portfolio.investmentsValue()).to.eq(twiceAmount)
    })

    it('gained value, two depositors', async () => {
      const { portfolio, parseMockToken, wallet } = await loadFixture(structuredIndexedPortfolioFixture)
      const amount = parseMockToken(DEPOSIT_AMOUNT)

      await portfolio.start()
      const investment = await createAndRegisterInvestment(portfolio, wallet, MockERC4626Vault__factory)
      await investment.approveAndDeposit(amount, portfolio.address)
      await investment.approveAndDeposit(amount, wallet.address)

      await investment.setValue(amount.mul(3))

      const expectedValue = amount.add(amount.div(2))
      expect(await portfolio.investmentsValue()).to.eq(expectedValue)
    })

    it('gained value before second depositor', async () => {
      const { portfolio, parseMockToken, wallet } = await loadFixture(structuredIndexedPortfolioFixture)
      const amount = parseMockToken(DEPOSIT_AMOUNT)
      const twiceAmount = amount.mul(2)

      await portfolio.start()
      const investment = await createAndRegisterInvestment(portfolio, wallet, MockERC4626Vault__factory)
      await investment.approveAndDeposit(amount, portfolio.address)
      await investment.setValue(twiceAmount)
      await investment.approveAndDeposit(amount, wallet.address)

      expect(await portfolio.investmentsValue()).to.eq(twiceAmount)
    })

    it('lost some value', async () => {
      const { portfolio, parseMockToken, wallet } = await loadFixture(structuredIndexedPortfolioFixture)
      const amount = parseMockToken(DEPOSIT_AMOUNT)
      const oneThirdAmount = amount.div(3)

      await portfolio.start()
      const investment = await createAndRegisterInvestment(portfolio, wallet, MockERC4626Vault__factory)
      await investment.approveAndDeposit(amount, portfolio.address)

      await investment.setValue(oneThirdAmount)

      expect(await portfolio.investmentsValue()).to.eq(oneThirdAmount)
    })

    it('lost all value', async () => {
      const { portfolio, parseMockToken, wallet } = await loadFixture(structuredIndexedPortfolioFixture)
      const amount = parseMockToken(DEPOSIT_AMOUNT)

      await portfolio.start()
      const investment = await createAndRegisterInvestment(portfolio, wallet, MockERC4626Vault__factory)
      await investment.approveAndDeposit(amount, portfolio.address)

      await investment.setValue(Zero)

      expect(await portfolio.investmentsValue()).to.eq(Zero)
    })

    it('lost some value, two depositors', async () => {
      const { portfolio, parseMockToken, wallet } = await loadFixture(structuredIndexedPortfolioFixture)
      const amount = parseMockToken(DEPOSIT_AMOUNT)
      const oneThirdAmount = amount.div(3)
      const amountOfInvestors = 2

      await portfolio.start()
      const investment = await createAndRegisterInvestment(portfolio, wallet, MockERC4626Vault__factory)
      await investment.approveAndDeposit(amount, portfolio.address)
      await investment.approveAndDeposit(amount, wallet.address)

      await investment.setValue(oneThirdAmount)

      const expectedInvestmentValue = oneThirdAmount.div(amountOfInvestors)
      expect(await portfolio.investmentsValue()).to.eq(expectedInvestmentValue)
    })
  })

  describe('two registered', () => {
    it('no deposited', async () => {
      const { portfolio, wallet } = await loadFixture(structuredIndexedPortfolioFixture)
      await portfolio.start()
      await createAndRegisterInvestment(portfolio, wallet, MockERC4626Vault__factory)
      await createAndRegisterInvestment(portfolio, wallet, MockERC4626Vault__factory)

      expect(await portfolio.investmentsValue()).to.eq(Zero)
    })

    it('one deposited', async () => {
      const { portfolio, wallet, parseMockToken } = await loadFixture(structuredIndexedPortfolioFixture)
      const amount = parseMockToken(DEPOSIT_AMOUNT)

      await portfolio.start()
      const firstInvestment = await createAndRegisterInvestment(portfolio, wallet, MockERC4626Vault__factory)
      await createAndRegisterInvestment(portfolio, wallet, MockERC4626Vault__factory)

      await firstInvestment.approveAndDeposit(amount, portfolio.address)

      expect(await portfolio.investmentsValue()).to.eq(amount)
    })

    it('two deposited', async () => {
      const { portfolio, wallet, parseMockToken } = await loadFixture(structuredIndexedPortfolioFixture)
      const amount = parseMockToken(DEPOSIT_AMOUNT)

      await portfolio.start()
      const firstInvestment = await createAndRegisterInvestment(portfolio, wallet, MockERC4626Vault__factory)
      const secondInvestment = await createAndRegisterInvestment(portfolio, wallet, MockERC4626Vault__factory)

      await firstInvestment.approveAndDeposit(amount, portfolio.address)
      await secondInvestment.approveAndDeposit(amount, portfolio.address)

      expect(await portfolio.investmentsValue()).to.eq(amount.mul(2))
    })

    it('one lost some value, two deposited', async () => {
      const { portfolio, wallet, parseMockToken } = await loadFixture(structuredIndexedPortfolioFixture)
      const amount = parseMockToken(DEPOSIT_AMOUNT)
      const oneFourthAmount = amount.div(4)

      await portfolio.start()
      const firstInvestment = await createAndRegisterInvestment(portfolio, wallet, MockERC4626Vault__factory)
      const secondInvestment = await createAndRegisterInvestment(portfolio, wallet, MockERC4626Vault__factory)

      await firstInvestment.approveAndDeposit(amount, portfolio.address)
      await secondInvestment.approveAndDeposit(amount, portfolio.address)

      await firstInvestment.setValue(oneFourthAmount)

      const expectedInvestmentValue = amount.add(oneFourthAmount)
      expect(await portfolio.investmentsValue()).to.eq(expectedInvestmentValue)
    })
  })
})
