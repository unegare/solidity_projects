//SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8;

import "hardhat/console.sol";
import "@uniswap/v3-core/contracts/interfaces/IUniswapV3Pool.sol";

contract UniV3DataLoader {
  constructor() {
  }

  struct BriefTickInfo {
    int128 liquidity_net;
    int24 tick;
  }

  struct State {
    int24 slot0tick;
    uint160 slot0sqrtPriceX96;
    int24 tickSpacing;
    uint counter;
    int total_sum;
    int sum_from_slot0tick;
    int24 tick_to_look_up;
    uint bitmap;
    int i;
    int j;
  }

  function load(IUniswapV3Pool pool, bool enable_print) external view returns (State memory state, BriefTickInfo[] memory ticks) {
    state = State({
      slot0tick: 0,
      slot0sqrtPriceX96: 0,
      tickSpacing: 0,
      counter: 0,
      total_sum: 0,
      sum_from_slot0tick: 0,
      tick_to_look_up: 0,
      bitmap: 0,
      i: 0,
      j: 0
    });
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
      ) = pool.slot0();
      state.slot0tick = _tick;
      state.slot0sqrtPriceX96 = sqrtPriceX96;
    }

    state.tickSpacing = pool.tickSpacing();

    state.counter = 0;
    {
      for (state.i = -30; state.i < 30; state.i++) {
        state.bitmap = pool.tickBitmap(int16(state.i));
        if (state.bitmap != 0) {
          for (state.j = 0; state.j < 256; state.j++) {
            if (state.bitmap & (1<<uint(int(state.j))) != 0) {
              state.counter++;
            }
          }
        }
      }
    }
    ticks = new BriefTickInfo[](state.counter);
    state.counter = 0;

    state.total_sum= 0;
    state.sum_from_slot0tick = int128(pool.liquidity());
    for (state.i = -30; state.i < 30; state.i++) {
      state.bitmap = pool.tickBitmap(int16(state.i));
      if (state.bitmap != 0) {
        state.tick_to_look_up = int24(state.i)*256*state.tickSpacing;
        for (state.j = 0; state.j < 256; state.j++) {
          if (state.bitmap & (1<<uint(int(state.j))) != 0) {
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
//              uint128 liquidityGross,
              ,
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
            ) = pool.ticks(state.tick_to_look_up);
            ticks[state.counter] = BriefTickInfo({
              liquidity_net: liquidityNet,
              tick: state.tick_to_look_up
            });
            state.counter++;
            state.total_sum += liquidityNet;
            if (state.slot0tick < state.tick_to_look_up) {
              state.sum_from_slot0tick += liquidityNet;
            }
//            if (enable_print) {
//              console.log('\ntick: %s | %s | %s', uint(int(tick_to_look_up)), uint(int(i)), uint(int(j)));
//              console.log('liquidityGross: %s', liquidityGross);
//              console.log('liquidityNet:');
//              console.logInt(int(liquidityNet));
//            }
//            if (state.counter >= flag_limit) {
//              break;
//            }
          }
          state.tick_to_look_up += state.tickSpacing;
        }
      }
    }
    if (enable_print) {
      console.log('\ntotal initialized  ticks:', state.counter);
      console.logInt(state.total_sum);
      console.logInt(state.sum_from_slot0tick);
      int cell = 0;
      assembly {
        cell := mload(ticks)
      }
      console.logInt(cell);
      assembly {
        cell := mload(add(ticks, 0x20))
      }
      console.logInt(cell);
      assembly {
        cell := mload(add(mload(add(ticks, 0x20)), 0x0))
      }
      console.logInt(cell);
      assembly {
        cell := mload(add(mload(add(ticks, 0x20)), 0x20))
      }
      console.logInt(cell);
      assembly {
        cell := mload(add(mload(add(ticks, 0x40)), 0x0))
      }
      console.logInt(cell);
      assembly {
        cell := mload(add(mload(add(ticks, 0x40)), 0x20))
      }
      console.logInt(cell);
    }
  }
}
