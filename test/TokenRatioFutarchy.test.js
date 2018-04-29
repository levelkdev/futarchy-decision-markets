import { expect } from 'chai'

const FCRToken = artifacts.require('FCRToken')
const EtherToken = artifacts.require('EtherToken')
const CentralizedOracleFactory = artifacts.require('CentralizedOracleFactory')
const EventFactory = artifacts.require('EventFactory')
const Math = artifacts.require('Math')
const TokenRatioFutarchy = artifacts.require('TokenRatioFutarchy')

import lkTestHelpers from 'lk-test-helpers'
import moment from 'moment'
import { web3 } from './helpers/w3'
const { expectThrow, increaseTime, latestTime } = lkTestHelpers(web3)

const { accounts } = web3.eth

describe('TokenRatioFutarchy', () => {
  let genericToken, assetToken, oracleFactory, eventFactory, ipfsHash

  beforeEach(async () => {
    genericToken  = await EtherToken.new()
    assetToken    = await FCRToken.new()
    oracleFactory = await CentralizedOracleFactory.new()
    eventFactory  = await EventFactory.new()
    ipfsHash      = 'QmYwAPJzv5CZsnA625s3Xf2nemtYgPpHdWEz79ojWnPbdG'
  })

  describe('when deployed', () => {
    it('sets token to the correct address', async () => {
      const duration = moment.duration({weeks: 2}).asSeconds()
      // const tokenRatioFutarchy = await TokenRatioFutarchy.new(
      //   duration,
      //   assetToken.address,
      //   genericToken.address,
      //   oracleFactory.address,
      //   eventFactory.address,
      //   ipfsHash
      // )
    })
  })
})
