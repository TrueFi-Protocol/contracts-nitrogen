import { expect } from 'chai'
import { structuredIndexedPortfolioFixture } from 'fixtures/structuredIndexedPortfolioFixture'
import { setupFixtureLoader } from 'test/setup'
import { getProtocolConfigFeeRateForSender, getProtocolConfigFeeRateForWallet } from 'utils/getProtocolConfigFeeRate'

describe('ProtocolConfig.protocolFeeRate', () => {
  const loadFixture = setupFixtureLoader()

  it('returns default fee rate for no custom fee rate set', async () => {
    const { protocolConfig, other } = await loadFixture(structuredIndexedPortfolioFixture)
    const defaultProtocolFeeRate = 500
    await protocolConfig.setDefaultProtocolFeeRate(defaultProtocolFeeRate)
    expect(await getProtocolConfigFeeRateForWallet(protocolConfig, other)).to.eq(defaultProtocolFeeRate)
  })

  it('returns custom fee rate if set', async () => {
    const { protocolConfig, other } = await loadFixture(structuredIndexedPortfolioFixture)
    const customFeeRate = 500
    await protocolConfig.setCustomProtocolFeeRate(other.address, customFeeRate)
    expect(await getProtocolConfigFeeRateForWallet(protocolConfig, other)).to.eq(customFeeRate)
  })

  it('returns fee rate for msg.sender if address not passed', async () => {
    const { protocolConfig, other } = await loadFixture(structuredIndexedPortfolioFixture)
    const customFeeRate = 500
    await protocolConfig.setCustomProtocolFeeRate(other.address, customFeeRate)
    expect(await getProtocolConfigFeeRateForSender(protocolConfig, other)).to.eq(customFeeRate)
  })
})
