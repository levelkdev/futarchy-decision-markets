pragma solidity ^0.4.18;

import '@gnosis.pm/gnosis-core-contracts/contracts/Events/EventFactory.sol';
import '@gnosis.pm/gnosis-core-contracts/contracts/Tokens/EtherToken.sol';
import '@gnosis.pm/gnosis-core-contracts/contracts/Oracles/CentralizedOracleFactory.sol';
import 'zeppelin-solidity/contracts/math/SafeMath.sol';

contract TokenRatioFutarchy {
  using SafeMath for uint256;

  // Events
  event AssetTokenCollateralEventCreation(CategoricalEvent categoricalEvent, StandardToken collateralToken);

  // Storage
  CategoricalEvent public _assetTokenCollateralEvent;
  CategoricalEvent public _genericTokenCollateralEvent;

  StandardToken public _assetToken;
  StandardToken public _genericToken;

  Oracle public _centralizedOracle;
  EventFactory public _eventFactory;
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

    _assetToken = assetToken;
    _genericToken = genericToken;
    _centralizedOracle = centralizedOracleFactory.createCentralizedOracle(ipfsHash);
    _eventFactory = eventFactory;
    _endDate = now.add(duration);
  }

  function createAssetTokenCollateralEvent() public {
    require(address(_assetTokenCollateralEvent) == 0);
    _assetTokenCollateralEvent = _eventFactory.createCategoricalEvent(
      _assetToken,
      _centralizedOracle,
      2
    );
    AssetTokenCollateralEventCreation(_assetTokenCollateralEvent, _assetToken);
  }

  function createGenericTokenCollateralEvent() public {
    require(address(_genericTokenCollateralEvent) == 0);
    _genericTokenCollateralEvent = _eventFactory.createCategoricalEvent(
      _genericToken,
      _centralizedOracle,
      2
    );
    AssetTokenCollateralEventCreation(_genericTokenCollateralEvent, _genericToken);
  }
}
