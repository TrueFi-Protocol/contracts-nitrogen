import { waffle } from 'hardhat'

export const timeTravel = async (time: number) => {
  await waffle.provider.send('evm_increaseTime', [time])
  await waffle.provider.send('evm_mine', [])
}

export const timeTravelTo = async (timestamp: number) => {
  await waffle.provider.send('evm_mine', [timestamp])
}

export const setNextBlockTimestamp = async (timestamp: number) => {
  await waffle.provider.send('evm_setNextBlockTimestamp', [timestamp])
}
