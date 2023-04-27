//SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.10;

import "hardhat/console.sol";
import "@uniswap/v3-core/contracts/interfaces/IUniswapV3Pool.sol";

contract UniV3InfoPoller {
  constructor() {
  }

  struct PoolPosition {
    address pool;
    bytes32 position;
  }

  struct PositionInfo {
    address token0;
    address token1;
    uint amount0;
    uint amount1;
  }

  function pollReserveData(PoolPosition[] calldata poolPositions) view external returns (PositionInfo[] memory posInfo) {
    console.log('before new');
    posInfo = new PositionInfo[](poolPositions.length);
    for (uint i = 0; i < poolPositions.length; i++) {
      console.log('before call');
      (
        uint128 _liquidity,
        uint256 feeGrowthInside0LastX128,
        uint256 feeGrowthInside1LastX128,
        uint128 tokensOwed0,
        uint128 tokensOwed1
      ) = IUniswapV3Pool(poolPositions[i].pool).positions(poolPositions[i].position);
      console.log('before create');
      PositionInfo memory pInfo = PositionInfo( {
        token0: IUniswapV3Pool(poolPositions[i].pool).token0(),
        token1: IUniswapV3Pool(poolPositions[i].pool).token1(),
        amount0: tokensOwed0,
        amount1: tokensOwed1
      } );
      console.log('before set');
      posInfo[i] = pInfo;
    }
  }
}
