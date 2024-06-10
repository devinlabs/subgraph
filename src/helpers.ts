import { BigInt, Bytes } from "@graphprotocol/graph-ts"
import { AddressCheck, AiBoxCount } from "../generated/schema"

export let ZERO_BD = BigInt.fromI32(0)
export let ONE_BD = BigInt.fromI32(1)
export let ONE_HUNDRED = BigInt.fromI64(100000000000000000000)
export let ZONE_ADDRESS = Bytes.fromHexString("0x0000000000000000000000000000000000000000")


// ai-box count upload
export function uploadSystemCount():AiBoxCount {
  let entity = AiBoxCount.load(ZERO_BD.toString())
  if (!entity) {
    entity = new AiBoxCount(ZERO_BD.toString())
    entity.addressTotal = ZERO_BD
    entity.crateAt = ZERO_BD
    entity.updateAt = ZERO_BD
    entity.stakeAmount = ZERO_BD
    entity.withdrawnAmount = ZERO_BD
    entity.rewardPaidAmount = ZERO_BD
    entity.addressList = []
    entity.stakeAmountTotal = ZERO_BD
    entity.actualBalance = ZERO_BD
    entity.profitTotalAmount = ZERO_BD
    entity.efficientAddressList = []
    entity.efficientAddressTotal = ZERO_BD
    entity.managerWithdrawnAmount = ZERO_BD
  }
  entity.save()
  return entity as AiBoxCount
}

// address count upload
export function uploadAddressCount(address:string):AddressCheck {
  let entity = AddressCheck.load(address.toString())
  if (!entity) {
    entity = new AddressCheck(address.toString())
    entity.teamAddressTotal = ONE_BD
    entity.teamAddressTotalList = []
    entity.crateAt = ZERO_BD
    entity.updateAt = ZERO_BD
    entity.teamStakeAmount = ZERO_BD
    entity.teamWithdrawnAmount = ZERO_BD
    entity.teamRewardPaidAmount = ZERO_BD
    entity.teamAddressList = []
    entity.referrer = ZONE_ADDRESS
    entity.stakeAmount = ZERO_BD
    entity.withdrawnAmount = ZERO_BD
    entity.rewardPaidAmount = ZERO_BD
    entity.upperId = ''
    entity.stakeAmountTotal = ZERO_BD
    entity.teamStakeAmountTotal = ZERO_BD
  }
  entity.save()
  return entity as AddressCheck
}

// 质押无限循环注入
export function stakeAddressCount(account: Bytes, amount: BigInt, referrer: Bytes, isDrr: boolean):void {
  let upperEntity = uploadAddressCount(referrer.toHexString())
  upperEntity.teamStakeAmount = upperEntity.teamStakeAmount.plus(amount)
  upperEntity.teamStakeAmountTotal = upperEntity.teamStakeAmountTotal.plus(amount)
  // 团队地址列表、人数
  let teamAddressList = upperEntity.teamAddressList
  let isTeamStakeAddress = false // 判断当前用户地址是否已经质押过
  for (let i = 0; i < teamAddressList.length; i++) {
    if (teamAddressList[i].equals(account)) {
      isTeamStakeAddress = true
    }
  }
  if (!isTeamStakeAddress) {
    if (account.notEqual(referrer)) {
      teamAddressList.push(account)
      if (isDrr) upperEntity.teamAddressList = teamAddressList
    }
  }
  
  // 团队地址列表、人数 - total
  let teamAddressTotalList = upperEntity.teamAddressTotalList
  let isTeamStakeAddressTotal = false // 判断当前用户地址是否已经质押过
  for (let i = 0; i < teamAddressTotalList.length; i++) {
    if (teamAddressTotalList[i].equals(account)) {
      isTeamStakeAddressTotal = true
    }
  }
  if (!isTeamStakeAddressTotal) {
    if (account.notEqual(referrer)) {
      teamAddressTotalList.push(account)
      upperEntity.teamAddressTotalList = teamAddressTotalList
      upperEntity.teamAddressTotal = BigInt.fromI32(teamAddressTotalList.length).plus(ONE_BD)
    }
  }
  // end
  upperEntity.save()
  if (upperEntity.referrer.notEqual(ZONE_ADDRESS)) {
    stakeAddressCount(account, amount, upperEntity.referrer, false)
  }
}

// 赎回无限循环注入
export function withdrawAddressCount(account: Bytes, amount: BigInt):void {
  let upperEntity = uploadAddressCount(account.toHexString())
  upperEntity.teamWithdrawnAmount = upperEntity.teamWithdrawnAmount.plus(amount)
  upperEntity.teamStakeAmount = upperEntity.teamStakeAmount.minus(amount)
  upperEntity.save()
  if (upperEntity.referrer.notEqual(ZONE_ADDRESS)) {
    withdrawAddressCount(upperEntity.referrer, amount)
  }
}

// 领取无限循环注入
export function rewardAddressCount(account: Bytes, amount: BigInt):void {
  let upperEntity = uploadAddressCount(account.toHexString())
  upperEntity.teamRewardPaidAmount = upperEntity.teamRewardPaidAmount.plus(amount)
  upperEntity.save()
  if (upperEntity.referrer.notEqual(ZONE_ADDRESS)) {
    rewardAddressCount(upperEntity.referrer, amount)
  }
}

// 绑定关系后无限循环注入
export function bindAddressCount(account: Bytes,referrer: Bytes, withdrawnAmount: BigInt,rewardPaidAmount: BigInt, stakeAmount: BigInt, isDrr: boolean):void {
  let upperEntity = uploadAddressCount(referrer.toHexString())
  upperEntity.teamWithdrawnAmount = upperEntity.teamWithdrawnAmount.plus(withdrawnAmount)
  upperEntity.teamRewardPaidAmount = upperEntity.teamRewardPaidAmount.plus(rewardPaidAmount)
  upperEntity.teamStakeAmount = upperEntity.teamStakeAmount.plus(stakeAmount)
  // 团队地址列表、人数
  let teamAddressList = upperEntity.teamAddressList
  let isTeamStakeAddress = false // 判断当前用户地址是否已经质押过
  for (let i = 0; i < teamAddressList.length; i++) {
    if (teamAddressList[i].equals(account)) {
      isTeamStakeAddress = true
    }
  }
  if (!isTeamStakeAddress) {
    if (account.notEqual(referrer)) {
      teamAddressList.push(account)
      if (isDrr) upperEntity.teamAddressList = teamAddressList
    }
  }
  // 团队地址列表、人数 - total
  let teamAddressTotalList = upperEntity.teamAddressTotalList
  let isTeamStakeAddressTotal = false // 判断当前用户地址是否已经质押过
  for (let i = 0; i < teamAddressTotalList.length; i++) {
    if (teamAddressTotalList[i].equals(account)) {
      isTeamStakeAddressTotal = true
    }
  }
  if (!isTeamStakeAddressTotal) {
    if (account.notEqual(referrer)) {
      teamAddressTotalList.push(account)
      upperEntity.teamAddressTotalList = teamAddressTotalList
      upperEntity.teamAddressTotal = BigInt.fromI32(teamAddressTotalList.length).plus(ONE_BD)
    }
  }
  // end
  upperEntity.save()
  if (upperEntity.referrer.notEqual(ZONE_ADDRESS)) {
    bindAddressCount(account, upperEntity.referrer, withdrawnAmount, rewardPaidAmount, stakeAmount, false)
  }
}