import { BigInt } from "@graphprotocol/graph-ts"
import { DayCount } from "../generated/schema"
import { ZERO_BD } from "./helpers"

/**
 * 0xEd599241FaaD49206C54fEF71b50357F8c457b27 56789129
 */
// 86400
export const DAYS_TIME = BigInt.fromI32(86400)
export const DAYS_START = BigInt.fromI32(1715317483)


export function uploadDayCount(time: BigInt): DayCount{
  let timestamp = time.toI32()
  let dayID =  BigInt.fromI32(timestamp).minus(DAYS_START).div(DAYS_TIME)
  let entity = DayCount.load(dayID.toString())
  if (!entity) {
    entity = new DayCount(dayID.toString())
    entity.stakeAmount = ZERO_BD
    entity.withdrawnAmount = ZERO_BD
    entity.managerWithdrawnAmount = ZERO_BD
    entity.profitTotalAmount = ZERO_BD
    entity.crateAt = time
  }
  entity.save()
  return entity as DayCount
}