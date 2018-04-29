/* global artifacts */

const FCRToken = artifacts.require('FCRToken')
const EtherToken = artifacts.require('EtherToken')
const EventFactory = artifacts.require('EventFactory')
const Math = artifacts.require('Math')

module.exports = function (deployer) {
  deployer.deploy(
    Math
  )
  deployer.link(Math, [EtherToken, EventFactory])
}
