/* global artifacts */

const FCRToken = artifacts.require('FCRToken')

module.exports = function (deployer) {
  deployer.deploy(
    FCRToken
  )
}
