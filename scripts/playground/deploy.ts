import { deploy, Options } from 'ethereum-mars'
import { deployNitrogen } from '../deployment/deployNitrogen'
import { PlaygroundOptions } from './runNitrogen'

const getOptions = ({ privateKey, provider, deploymentsFile }: PlaygroundOptions): Options => ({
  privateKey,
  network: provider,
  noConfirm: true,
  verify: false,
  disableCommandLineOptions: true,
  outputFile: deploymentsFile,
})

export function deployNitrogenPlayground(playgroundOptions: PlaygroundOptions) {
  const options = getOptions(playgroundOptions)
  return deploy(options, deployNitrogen)
}
