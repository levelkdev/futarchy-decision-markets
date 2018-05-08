/* global artifacts */

const FCRToken = artifacts.require('FCRToken')
const EtherToken = artifacts.require('EtherToken')
const EventFactory = artifacts.require('EventFactory')
const LMSRMarketMaker = artifacts.require('LMSRMarketMaker')
const StandardMarket = artifacts.require('StandardMarket')
const StandardMarketFactory = artifacts.require('StandardMarketFactory')
const Math = artifacts.require('Math')
const StandardMarketWithPriceLoggerFactory = artifacts.require('StandardMarketWithPriceLoggerFactory')

module.exports = function (deployer) {
  deployer.deploy(
    Math
  )
  deployer.link(Math, [EtherToken, EventFactory, LMSRMarketMaker, StandardMarket, StandardMarketFactory, StandardMarketWithPriceLoggerFactory])
}
