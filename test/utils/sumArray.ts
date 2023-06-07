import { BigNumber, BigNumberish } from 'ethers'

function add(a: BigNumberish, b: BigNumberish) {
  if (typeof a === 'number' && typeof b === 'number') {
    return a + b
  }
  return BigNumber.from(a).add(b)
}

export function sumArray(arr: number[]): number
export function sumArray(arr: BigNumberish[]): BigNumber
export function sumArray(arr: BigNumberish[]) {
  return arr.reduce(add, 0)
}
