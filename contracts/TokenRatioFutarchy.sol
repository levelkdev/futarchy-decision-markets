pragma solidity ^0.4.18;

import '@gnosis.pm/gnosis-core-contracts/contracts/Events/EventFactory.sol';
import '@gnosis.pm/gnosis-core-contracts/contracts/Tokens/EtherToken.sol';
import '@gnosis.pm/gnosis-core-contracts/contracts/Oracles/CentralizedOracleFactory.sol';
import 'zeppelin-solidity/contracts/math/SafeMath.sol';

contract TokenRatioFutarchy {
  using SafeMath for uint256;

  // Storage
  CategoricalEvent public _genericTokenCollateralEvent;
  CategoricalEvent public _assetTokenCollateralEvent;
  uint256 public _endDate;

  function TokenRatioFutarchy(
    uint256 duration,
    StandardToken assetToken,
    StandardToken genericToken,
    CentralizedOracleFactory centralizedOracleFactory,
    EventFactory eventFactory,
    bytes ipfsHash
  ) public {
    require(duration > 0);
    Oracle oracle = centralizedOracleFactory.createCentralizedOracle(ipfsHash);

    _endDate = now.add(duration);
    _genericTokenCollateralEvent = eventFactory.createCategoricalEvent(
      genericToken,
      oracle,
      2
    );
    _assetTokenCollateralEvent = eventFactory.createCategoricalEvent(
      assetToken,
      oracle,
      2
    );
  }
}
