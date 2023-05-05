// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.10;

//import 'hardhat/console.sol';

import '@uniswap/v2-core/contracts/interfaces/IUniswapV2Pair.sol';
//import '../v2-core/contracts/interfaces/IERC20.sol';
//import '../v2-periphery/contracts/libraries/UniswapV2Library.sol';
import '../openzeppelin-contracts/contracts/token/ERC20/utils/SafeERC20.sol';

import '@uniswap/v3-core/contracts/interfaces/IUniswapV3Pool.sol';
import '@uniswap/v3-core/contracts/interfaces/callback/IUniswapV3SwapCallback.sol';
import '../openzeppelin-contracts/contracts/utils/math/SafeCast.sol';
//import '../v3-core/contracts/libraries/TickMath.sol';

contract SimpleRouter is IUniswapV3SwapCallback{
  using SafeERC20 for IERC20;
  using SafeCast for uint256;

  address _sender;

  /// @dev The minimum value that can be returned from #getSqrtRatioAtTick. Equivalent to getSqrtRatioAtTick(MIN_TICK)
  uint160 internal constant MIN_SQRT_RATIO = 4295128739;
  /// @dev The maximum value that can be returned from #getSqrtRatioAtTick. Equivalent to getSqrtRatioAtTick(MAX_TICK)
  uint160 internal constant MAX_SQRT_RATIO = 1461446703485210103287273052203988822378723970342;

  constructor() {
    _sender = address(0x0);
  }

  modifier checkDeadline(uint256 deadline) {
    require(block.timestamp <= deadline, 'Transaction too old');
    _;
  }

  modifier isLocked() {
    require(_sender != address(0x0), 'SR not locked');
    _;
  }

  modifier isNotLocked() {
    require(_sender == address(0x0), 'SR is locked');
    _;
  }

  struct V2SwapParams {
    IUniswapV2Pair pool;
    IERC20 from;
    IERC20 to;
    uint amount_from;
    uint amount_to;
    uint deadline;
  }

  function v2swapInDirectOrder(V2SwapParams calldata params) external checkDeadline(params.deadline) returns (uint amount_out) {
    (uint112 reserve0, uint112 reserve1, uint32 _b) = params.pool.getReserves();
    amount_out = v2getAmountOut(params.amount_from, reserve0, reserve1);
    require(amount_out >= params.amount_to, 'SO'); // slippage overrun

    params.from.safeTransferFrom(msg.sender, address(params.pool), params.amount_from);
    params.pool.swap(0, amount_out, msg.sender, new bytes(0));
  }

  function v2swapInRevertedOrder(V2SwapParams calldata params) external checkDeadline(params.deadline) returns (uint amount_out) {
    (uint112 reserve0, uint112 reserve1, uint32 _b) = params.pool.getReserves();
    amount_out = v2getAmountOut(params.amount_from, reserve1, reserve0);
    require(amount_out >= params.amount_to, 'SO'); // slippage overrun

    params.from.safeTransferFrom(msg.sender, address(params.pool), params.amount_from);
    params.pool.swap(amount_out, 0, msg.sender, new bytes(0));
  }


  // SafeMath disabled since the solidity version is above 0.8
  // given an input amount of an asset and pair reserves, returns the maximum output amount of the other asset
  function v2getAmountOut(uint amountIn, uint reserveIn, uint reserveOut) internal pure returns (uint amountOut) {
    require(amountIn > 0, 'UniswapV2Library: INSUFFICIENT_INPUT_AMOUNT');
    require(reserveIn > 0 && reserveOut > 0, 'UniswapV2Library: INSUFFICIENT_LIQUIDITY');
    uint amountInWithFee = amountIn * 997;
    uint numerator = amountInWithFee * reserveOut;
    uint denominator = reserveIn * 1000 + amountInWithFee;
    amountOut = numerator / denominator;
  }


  struct V3SwapParams {
    IUniswapV3Pool pool;
    IERC20 from;
    IERC20 to;
    uint256 deadline;
    uint256 amount_from;
    uint256 amount_to;
    uint160 sqrtPriceLimitX96;
  }

  function v3swap(V3SwapParams calldata params)
    external
    checkDeadline(params.deadline)
    isNotLocked()
    returns (uint256 amount_out)
  {
    _sender = msg.sender;

    bool zeroForOne = params.from < params.to;

    (int256 amount0, int256 amount1) =
        params.pool.swap(
            msg.sender,
            zeroForOne,
            params.amount_from.toInt256(),
            params.sqrtPriceLimitX96 == 0
                ? (zeroForOne ? MIN_SQRT_RATIO + 1 : MAX_SQRT_RATIO - 1)
                : params.sqrtPriceLimitX96,
            abi.encodePacked(params.from, params.to)
        );

    amount_out = uint256(-(zeroForOne ? amount1 : amount0));

    require(amount_out >= params.amount_to, 'Too little received');

    _sender = address(0x0);
  }

  /// @inheritdoc IUniswapV3SwapCallback
  function uniswapV3SwapCallback(
    int256 amount0Delta,
    int256 amount1Delta,
    bytes calldata _data
  ) external override isLocked() {
    require(amount0Delta > 0 || amount1Delta > 0); // swaps entirely within 0-liquidity regions are not supported
    
    IERC20 _token_from;
    IERC20 _token_to;
    assembly {
      _token_from := calldataload(add(add(4, 0x60), 20))
      _token_to := calldataload(add(add(4, 0x60), 40))
    }

    (bool isExactInput, uint256 amountToPay) =
      amount0Delta > 0
        ? (_token_from < _token_to, uint256(amount0Delta))
        : (_token_to < _token_from, uint256(amount1Delta));
    if (isExactInput) {
      _token_from.safeTransferFrom(_sender, msg.sender, amountToPay);
    } else {
      revert('isExactInput false');
    }
  }
}

