import { BigInt, Bytes, log } from "@graphprotocol/graph-ts"
import { ManagerWithdrawn, Registered, RewardPaid, Staked, Withdrawn } from "../generated/VaultProxy/VaultProxy"
import { ONE_BD, ZERO_BD, ZONE_ADDRESS, uploadSystemCount, uploadAddressCount, ONE_HUNDRED } from "./helpers"
import { rewardAddressCount } from "./helpers"
import { uploadDayCount } from "./upload"

export function handleRewardPaid(event: RewardPaid): void {
  let sysEntity = uploadSystemCount()
  if (sysEntity.crateAt.equals(ZERO_BD)) sysEntity.crateAt = event.block.timestamp
  sysEntity.updateAt = event.block.timestamp

  let rewardPaidAmount = sysEntity.rewardPaidAmount
  rewardPaidAmount = rewardPaidAmount.plus(event.params.amount)
  sysEntity.rewardPaidAmount = rewardPaidAmount
  sysEntity.actualBalance = sysEntity.actualBalance.minus(event.params.amount)
  sysEntity.profitTotalAmount = sysEntity.profitTotalAmount.plus(event.params.amount)

  sysEntity.save()

  let dayCountEntity = uploadDayCount(event.block.timestamp)
  dayCountEntity.profitTotalAmount = dayCountEntity.profitTotalAmount.plus(event.params.amount)
  dayCountEntity.save()

  // 个人信息统计
  let userEntity = uploadAddressCount(event.params.account.toHexString())
  if (userEntity.crateAt.equals(ZERO_BD)) userEntity.crateAt = event.block.timestamp
  userEntity.updateAt = event.block.timestamp
  userEntity.rewardPaidAmount = userEntity.rewardPaidAmount.plus(event.params.amount)
  userEntity.teamRewardPaidAmount = userEntity.teamRewardPaidAmount.plus(event.params.amount)
  userEntity.save()
  // 严重当前用户的被邀请人不是零地址，就让上一级的用户团队领取金额+
  if (userEntity.referrer.notEqual(ZONE_ADDRESS)) {
    rewardAddressCount(userEntity.referrer, event.params.amount)
  }
}

export function handleStaked(event: Staked): void {
  let sysEntity = uploadSystemCount()
  if (sysEntity.crateAt.equals(ZERO_BD)) sysEntity.crateAt = event.block.timestamp
  sysEntity.updateAt = event.block.timestamp

  let addressList = sysEntity.addressList
  let isStakeAddress = false // 判断当前用户地址是否已经质押过
  for (let i = 0; i < addressList.length; i++) {
    if (addressList[i].equals(event.params.account)) {
      isStakeAddress = true
    }
  }
  if (!isStakeAddress) {
    addressList.push(event.params.account)
    let addressTotal = sysEntity.addressTotal
    addressTotal = addressTotal.plus(ONE_BD)
    sysEntity.addressTotal = addressTotal
    sysEntity.addressList = addressList
  }

  let stakeAmount = sysEntity.stakeAmount
  stakeAmount = stakeAmount.plus(event.params.amount)
  sysEntity.stakeAmount = stakeAmount
  sysEntity.stakeAmountTotal = sysEntity.stakeAmountTotal.plus(event.params.amount)
  sysEntity.actualBalance =  sysEntity.actualBalance.plus(event.params.amount)

  let dayCountEntity = uploadDayCount(event.block.timestamp)
  dayCountEntity.stakeAmount = dayCountEntity.stakeAmount.plus(event.params.amount)
  dayCountEntity.save()

  // 个人信息统计
  let userEntity = uploadAddressCount(event.params.account.toHexString())
  if (userEntity.crateAt.equals(ZERO_BD)) userEntity.crateAt = event.block.timestamp
  userEntity.updateAt = event.block.timestamp
  userEntity.stakeAmountTotal = userEntity.stakeAmountTotal.plus(event.params.amount)
  userEntity.stakeAmount = userEntity.stakeAmount.plus(event.params.amount)
  userEntity.teamStakeAmount = userEntity.teamStakeAmount.plus(event.params.amount)
  userEntity.teamStakeAmountTotal = userEntity.teamStakeAmountTotal.plus(event.params.amount)

  let shouldTeam = userEntity.stakeAmount.ge(ONE_HUNDRED) && !userEntity.activated
  if (shouldTeam) {
    userEntity.activated = true
    userEntity.teamAddressTotal = userEntity.teamAddressTotal.plus(ONE_BD)
  }

  // 循环往上级添加团队人数、团队质押、团队质押总额
  let referrer = userEntity.referrer
  let isWhileNum = ZERO_BD
  while(referrer.notEqual(ZONE_ADDRESS)) {
    let upperEntity = uploadAddressCount(referrer.toHexString())
    if (shouldTeam) {
      upperEntity.teamAddressTotal = upperEntity.teamAddressTotal.plus(ONE_BD)
      let teamAddressList = upperEntity.teamAddressList
      teamAddressList.push(event.params.account)
      if (isWhileNum.equals(ZERO_BD)) {
        upperEntity.teamAddressList = teamAddressList
      }
    }
    upperEntity.teamStakeAmount = upperEntity.teamStakeAmount.plus(event.params.amount)
    upperEntity.teamStakeAmountTotal = upperEntity.teamStakeAmountTotal.plus(event.params.amount)
    upperEntity.save()
    referrer = upperEntity.referrer
    isWhileNum = isWhileNum.plus(ONE_BD)
  }


  if (userEntity.stakeAmount.ge(ONE_HUNDRED)) {
    let efficientAddressList = sysEntity.efficientAddressList
    let isEfficientAddress = false // 判断当前用户地址是否已经质押过
    for (let i = 0; i < efficientAddressList.length; i++) {
      if (efficientAddressList[i].equals(event.params.account)) {
        isEfficientAddress = true
      }
    }
    if (!isEfficientAddress) {
      efficientAddressList.push(event.params.account)
      sysEntity.efficientAddressTotal = BigInt.fromI32(efficientAddressList.length)
      sysEntity.efficientAddressList = efficientAddressList
    }
  }
  sysEntity.save()

  userEntity.save()
}

export function handleWithdrawn(event: Withdrawn): void {
  let dayCountEntity = uploadDayCount(event.block.timestamp)
  dayCountEntity.withdrawnAmount = dayCountEntity.withdrawnAmount.plus(event.params.amount)
  dayCountEntity.save()

  let sysEntity = uploadSystemCount()
  if (sysEntity.crateAt.equals(ZERO_BD)) sysEntity.crateAt = event.block.timestamp
  sysEntity.updateAt = event.block.timestamp

  let withdrawnAmount = sysEntity.withdrawnAmount
  withdrawnAmount = withdrawnAmount.plus(event.params.amount)
  sysEntity.withdrawnAmount = withdrawnAmount
  // 总质押金额 需要减去当前质押金额
  sysEntity.stakeAmount = sysEntity.stakeAmount.minus(event.params.amount)
  sysEntity.actualBalance =  sysEntity.actualBalance.minus(event.params.amount)

  // 个人信息统计
  let userEntity = uploadAddressCount(event.params.account.toHexString())
  if (userEntity.crateAt.equals(ZERO_BD)) userEntity.crateAt = event.block.timestamp
  userEntity.updateAt = event.block.timestamp
  userEntity.withdrawnAmount = userEntity.withdrawnAmount.plus(event.params.amount)
  userEntity.teamWithdrawnAmount = userEntity.teamWithdrawnAmount.plus(event.params.amount)
  userEntity.stakeAmount = userEntity.stakeAmount.minus(event.params.amount)
  userEntity.teamStakeAmount = userEntity.teamStakeAmount.minus(event.params.amount)

  let shouldTeam = userEntity.stakeAmount.lt(ONE_HUNDRED) && userEntity.activated

  if (shouldTeam) {
    userEntity.activated = false
    userEntity.teamAddressTotal = userEntity.teamAddressTotal.minus(ZERO_BD)
  }
  let referrer = userEntity.referrer
  let isWhileNum = ZERO_BD
  while(referrer.notEqual(ZONE_ADDRESS)) {
    let upperEntity = uploadAddressCount(referrer.toHexString())
    if (shouldTeam) {
      upperEntity.teamAddressTotal = upperEntity.teamAddressTotal.minus(ONE_BD)
      if (isWhileNum.equals(ZERO_BD)) {
        let teamAddressList = upperEntity.teamAddressList
        let teamList: Bytes[] = []
        for (let i = 0; i < teamAddressList.length; i++) {
          const element = teamAddressList[i];
          if (element.notEqual(event.params.account)) {
            teamList.push(element)
          }
        }
        upperEntity.teamAddressList = teamList
      }
      
    }
    upperEntity.teamWithdrawnAmount = upperEntity.teamWithdrawnAmount.plus(event.params.amount)
    upperEntity.teamStakeAmount = upperEntity.teamStakeAmount.minus(event.params.amount)
    upperEntity.save()
    referrer = upperEntity.referrer
    isWhileNum = isWhileNum.plus(ONE_BD)
  }
  
  if (userEntity.stakeAmount.lt(ONE_HUNDRED)) {
    let efficientAddressList = sysEntity.efficientAddressList
    let newEfficientAddressList: Bytes[] = []
    for (let i = 0; i < efficientAddressList.length; i++) {
      if (efficientAddressList[i].notEqual(event.params.account)) {
        let s1 = efficientAddressList[i]
        newEfficientAddressList.push(s1)
      }
    }
    sysEntity.efficientAddressTotal = BigInt.fromI32(newEfficientAddressList.length)
    sysEntity.efficientAddressList = newEfficientAddressList
  }
  sysEntity.save()

  userEntity.save()
}

export function handleRegistered(event: Registered): void {
  let entity = uploadAddressCount(event.params.account.toHexString())
  if (entity.crateAt.equals(ZERO_BD)) entity.crateAt = event.block.timestamp
  entity.updateAt = event.block.timestamp

  entity.referrer = event.params.referrer
  entity.upperId = event.params.referrer.toHexString()
  // log.info("referrer: {}, account:{}", [event.params.referrer.toHexString(), event.params.account.toHexString()])
  entity.save()
  let shouldTeam = entity.stakeAmount.ge(ONE_HUNDRED) && !entity.activated
  if (shouldTeam) {
    entity.activated = true
    entity.teamAddressTotal = entity.teamAddressTotal.plus(ONE_BD)
  }

  // 循环往上级添加团队人数、团队质押、团队质押总额
  let referrer = entity.referrer
  let isWhileNum = ZERO_BD
  while(referrer.notEqual(ZONE_ADDRESS)) {
    let upperEntity = uploadAddressCount(referrer.toHexString())
    if (shouldTeam) {
      upperEntity.teamAddressTotal = upperEntity.teamAddressTotal.plus(ONE_BD)
      let teamAddressList = upperEntity.teamAddressList
      teamAddressList.push(event.params.account)
      if (isWhileNum.equals(ZERO_BD)) {
        upperEntity.teamAddressList = teamAddressList
      }
    }
    upperEntity.teamWithdrawnAmount = upperEntity.teamWithdrawnAmount.plus(entity.withdrawnAmount)
    upperEntity.teamRewardPaidAmount = upperEntity.teamRewardPaidAmount.plus(entity.rewardPaidAmount)
    upperEntity.teamStakeAmount = upperEntity.teamStakeAmount.plus(entity.stakeAmount)
    upperEntity.save()
    referrer = upperEntity.referrer
    isWhileNum = isWhileNum.plus(ONE_BD)
  }
  // account: Bytes,referrer: Bytes, withdrawnAmount: BigInt,rewardPaidAmount: BigInt, stakeAmount: BigInt, isDrr: boolean
  // 当前用户把之前个人数据、绑定到上一级用户
  // bindAddressCount(event.params.account, event.params.referrer, entity.withdrawnAmount, entity.rewardPaidAmount, entity.stakeAmount, true)
}

export function handleManagerWithdrawn(event: ManagerWithdrawn): void {
  let sysEntity = uploadSystemCount()
  if (sysEntity.crateAt.equals(ZERO_BD)) sysEntity.crateAt = event.block.timestamp
  sysEntity.updateAt = event.block.timestamp

  sysEntity.managerWithdrawnAmount = sysEntity.managerWithdrawnAmount.plus(event.params.amount)

  sysEntity.save()

  
  let dayCountEntity = uploadDayCount(event.block.timestamp)
  dayCountEntity.managerWithdrawnAmount = dayCountEntity.managerWithdrawnAmount.plus(event.params.amount)
  dayCountEntity.save()
}