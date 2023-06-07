import { expect, use } from 'chai'
import { deploy } from 'ethereum-mars'
import { defaultAccounts } from 'ethereum-waffle'
import { providers } from 'ethers'
import ganache from 'ganache'
import { deployNitrogen } from 'scripts/deployment/deployNitrogen'
import chaiAsPromised from 'chai-as-promised'
import { existsSync, readFileSync, unlinkSync } from 'fs'

use(chaiAsPromised)

const EXPECTED_CONTRACTS = [
  'indexedPortfoliosProtocolConfig',
  'indexedPortfoliosProtocolConfig_proxy',
  'structuredIndexedPortfolio',
  'structuredIndexedPortfolioFactory',
  'trancheVault',
  'vaultsRegistry',
  'vaultsRegistry_proxy',
  'managerRoleGranter',
].sort()

describe('deployNitrogen', () => {
  const originalLog = console.log

  before(() => {
    console.log = () => undefined
  })

  after(() => {
    console.log = originalLog
  })

  async function createProvider() {
    const ganacheProvider = ganache.provider({
      accounts: defaultAccounts,
      gasLimit: 15_000_000,
      logging: {
        quiet: true,
      },
    })

    const provider = new providers.Web3Provider(ganacheProvider as unknown as providers.ExternalProvider)
    const network = await provider.getNetwork()
    network.name = 'ganache'

    return provider
  }

  it('deployment passes without errors', async () => {
    const deploymentsTestFile = 'deployments-test.json'
    const { secretKey: privateKey } = defaultAccounts[0]
    const provider = await createProvider()
    const deploymentOptions = {
      network: provider,
      privateKey,
      noConfirm: true,
      disableCommandLineOptions: true,
      outputFile: deploymentsTestFile,
    }

    if (existsSync(deploymentsTestFile)) {
      unlinkSync(deploymentsTestFile)
    }

    await expect(deploy(deploymentOptions, deployNitrogen))
      .not.to.be.rejected

    const fileContent = readFileSync(deploymentsTestFile)
    const deploymentJson = JSON.parse(fileContent.toString())
    const sortedDeployedContracts = Object.keys(deploymentJson['ganache']).sort()

    expect(sortedDeployedContracts).to.deep.eq(EXPECTED_CONTRACTS)
  })
})
