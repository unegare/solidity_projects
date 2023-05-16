//SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8;

import "hardhat/console.sol";
import "@uniswap/v3-core/contracts/interfaces/IUniswapV3Pool.sol";

contract UniV3DataLoader {
  constructor() {
  }

  function load(address pool, uint flag_limit, bool enable_print) external view returns (int total_sum, int sum_from_slot0tick) {
    int24 slot0tick;
    {
      (
          uint160 sqrtPriceX96,
//          int24 tick,
          int24 _tick,
          uint16 observationIndex,
          uint16 observationCardinality,
          uint16 observationCardinalityNext,
          uint8 feeProtocol,
          bool unlocked
      ) = IUniswapV3Pool(pool).slot0();
      slot0tick = _tick;
    }

    int24 tickSpacing = IUniswapV3Pool(pool).tickSpacing();

//    int24 compressedTick = tick / tickSpacing;
//    {
//      (
//        uint128 liquidityGross,
//        int128 liquidityNet,
//        uint256 feeGrowthOutside0X128,
//        uint256 feeGrowthOutside1X128,
//        int56 tickCumulativeOutside,
//        uint160 secondsPerLiquidityOutsideX128,
//        uint32 secondsOutside,
//        bool initialized
//      ) = IUniswapV3Pool(pool).ticks(compressedTick);
//    }

//    for (int i = 0; i < 30; i++) {
//      console.log('%s: %s', uint(i), IUniswapV3Pool(pool).tickBitmap(int16(i)));
//    }

    int acc = 0;
    int acc2 = int128(IUniswapV3Pool(pool).liquidity());

    uint flag = 0;
    for (int8 i = 0; i < 30; i++) {
      uint bitmap = IUniswapV3Pool(pool).tickBitmap(int16(i));
      if (bitmap != 0) {
        int24 tick_to_look_up = int24(i)*256*tickSpacing;
        for (int16 j = 0; j < 256; j++) {
          if (bitmap & (1<<uint(int(j))) != 0) {
//            (
//              uint128 liquidityGross,
//              int128 liquidityNet,
//              uint256 feeGrowthOutside0X128,
//              uint256 feeGrowthOutside1X128,
//              int56 tickCumulativeOutside,
//              uint160 secondsPerLiquidityOutsideX128,
//              uint32 secondsOutside,
//              bool initialized
//            ) = IUniswapV3Pool(pool).ticks(tick_to_look_up);

            (
              uint128 liquidityGross,
              int128 liquidityNet,
              ,
              ,
              ,
              ,
              ,
//              uint256 feeGrowthOutside0X128,
//              uint256 feeGrowthOutside1X128,
//              int56 tickCumulativeOutside,
//              uint160 secondsPerLiquidityOutsideX128,
//              uint32 secondsOutside,
//              bool initialized
            ) = IUniswapV3Pool(pool).ticks(tick_to_look_up);
            acc += liquidityNet;
            if (slot0tick < tick_to_look_up) {
              acc2 += liquidityNet;
            }
            if (enable_print) {
              console.log('\ntick: %s | %s | %s', uint(int(tick_to_look_up)), uint(int(i)), uint(int(j)));
              console.log('liquidityGross: %s', liquidityGross);
              console.log('liquidityNet:');
              console.logInt(int(liquidityNet));
            }
            flag++;
            if (flag >= flag_limit) {
              break;
            }
          }
          tick_to_look_up += tickSpacing;
        }
      }
    }
    if (enable_print) {
      console.log('\ntotal initialized  ticks:', flag);
      console.logInt(acc);
      console.logInt(acc2);
    }
    total_sum = acc;
    sum_from_slot0tick = acc2;
  }
}
