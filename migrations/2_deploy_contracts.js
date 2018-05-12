/* global artifacts */

const EtherToken = artifacts.require('EtherToken')
const EventFactory = artifacts.require('EventFactory')
const LMSRMarketMaker = artifacts.require('LMSRMarketMaker')
const StandardMarket = artifacts.require('StandardMarket')
const StandardMarketFactory = artifacts.require('StandardMarketFactory')
const Math = artifacts.require('Math')
const StandardMarketWithPriceLoggerFactory = artifacts.require('StandardMarketWithPriceLoggerFactory')
const FutarchyOracleFactory = artifacts.require('FutarchyOracleFactory')

module.exports = async function (deployer) {
  deployer.deploy(
    Math
  )
  deployer.link(Math, [EtherToken, EventFactory, LMSRMarketMaker, StandardMarket, StandardMarketFactory, StandardMarketWithPriceLoggerFactory, FutarchyOracleFactory])

  await deployer.deploy(EventFactory)
  await deployer.deploy(StandardMarketWithPriceLoggerFactory)

  deployer.deploy(
    FutarchyOracleFactory,
    EventFactory.address,
    StandardMarketWithPriceLoggerFactory.address
  )
}
