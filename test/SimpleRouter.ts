import { time, loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { anyValue } from "@nomicfoundation/hardhat-chai-matchers/withArgs";
import { expect } from "chai";
import { ethers } from "hardhat";

const IERC20_SOURCE = "openzeppelin-contracts/contracts/token/ERC20/IERC20.sol:IERC20";

const WBTC = '0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599';
const USDT = '0xdAC17F958D2ee523a2206206994597C13D831ec7';
const USDC = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48';

const WBTCUSDT = '0x9Db9e0e53058C89e5B94e29621a205198648425B';
const WBTCUSDC = '0x99ac8cA7087fA4A2A1FB6357269965A2014ABc35';

const WBTC_OWNER = '0x8EB8a3b98659Cce290402893d0123abb75E3ab28'; //'0x9ff58f4fFB29fA2266Ab25e75e2A8b3503311656';
const USDT_OWNER = '0x47ac0Fb4F2D84898e4D9E7b4DaB3C24507a6D503';
const USDC_OWNER = '0x47ac0Fb4F2D84898e4D9E7b4DaB3C24507a6D503'; // '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48'; 


describe("SimpleRouter", function () {
  const get_erc20 = async (addr, signer) => {
    const erc20 = await ethers.getContractAt(IERC20_SOURCE, addr, signer);
    return erc20.connect(signer);
  };

  it('v3swapTest', async function() {
    await hre.network.provider.request({
      method: "hardhat_impersonateAccount",
      params: [WBTC_OWNER],
    });
    await hre.network.provider.request({
      method: "hardhat_setLoggingEnabled",
      params: [true],
    });


    const SR = await ethers.getContractFactory("SimpleRouter");
    const sr = await SR.deploy();

    const signer = await ethers.getSigner(WBTC_OWNER);

    const wbtc = await get_erc20(WBTC, signer);
    const usdt = await get_erc20(USDT, signer);

    const get_balances = async () => {
      const wbtc_balance = await wbtc.balanceOf(signer.address);
      const usdt_balance = await usdt.balanceOf(signer.address);
      return {wbtc_balance, usdt_balance};
    };
    
    console.log('signer.address: ', signer.address);
    const {
      wbtc_balance: wbtc_balance_old,
      usdt_balance: usdt_balance_old,
    } = await get_balances();
    console.log('wbtc balance: ', wbtc_balance_old);
    console.log('usdt balance: ', usdt_balance_old);

    await wbtc.approve(sr.address, wbtc_balance_old);


//  struct V3SwapParams {
//    IUniswapV3Pool pool;
//    IERC20 from;
//    IERC20 to;
//    uint256 deadline;
//    uint256 amount_from;
//    uint256 amount_to;
//    uint160 sqrtPriceLimitX96;
//  }
    const params = {
      pool: WBTCUSDT,
      from: WBTC,
      to: USDT,
      deadline: ethers.BigNumber.from(await time.latest()).add(ethers.BigNumber.from(1_000_000_000_000)),
      amount_from: ethers.BigNumber.from(100_000_000).mul(ethers.BigNumber.from(1)),
      amount_to: ethers.BigNumber.from(0),
      sqrtPriceLimitX96: ethers.BigNumber.from(0),
    };
//    const params_encoded = sr.interface.encodeFunctionData('v3swap', [params]);

    const gas = await sr.connect(signer).estimateGas.v3swap(params);
    console.log('gas:', gas);
    await sr.connect(signer).v3swap(params);

    const {
      wbtc_balance: wbtc_balance_new,
      usdt_balance: usdt_balance_new,
    } = await get_balances();
    console.log('wbtc balance: ', wbtc_balance_new);
    console.log('usdt balance: ', usdt_balance_new);

    console.log('wbtc delta  : ', wbtc_balance_new.sub(wbtc_balance_old));
    console.log('usdt delta  : ', usdt_balance_new.sub(usdt_balance_old));

    await hre.network.provider.request({
      method: "hardhat_stopImpersonatingAccount",
      params: [WBTC_OWNER],
    });
  });
  it('v3swap-min-amount-test', async function() {
    await hre.network.provider.request({
      method: "hardhat_impersonateAccount",
      params: [WBTC_OWNER],
    });
    await hre.network.provider.request({
      method: "hardhat_impersonateAccount",
      params: [USDC_OWNER],
    });
    await hre.network.provider.request({
      method: "hardhat_setLoggingEnabled",
      params: [true],
    });

    const SimpleRouter = await ethers.getContractFactory('SimpleRouter');
    const sr = await SimpleRouter.deploy();

    const [signer] = await ethers.getSigners();
    const wbtc_signer = await ethers.getSigner(WBTC_OWNER);
    const usdc_signer = await ethers.getSigner(USDC_OWNER);

    const wbtc = await get_erc20(WBTC, wbtc_signer);
    const usdc = await get_erc20(USDC, usdc_signer);

    const get_balances = async () => {
      const wbtc_balance = await wbtc.balanceOf(signer.address);
      const usdc_balance = await usdc.balanceOf(signer.address);
      return {wbtc_balance, usdc_balance};
    };

    const amount_from = ethers.BigNumber.from(1_000_000);

    {
      const tx = await usdc.transfer(signer.address, amount_from);
      await tx.wait();
      const tx2 = await usdc.connect(signer).approve(sr.address, amount_from);
      await tx2.wait();
    }

    console.log('signer.address:', signer.address);
    const {
      wbtc_balance: wbtc_balance_old,
      usdc_balance: usdc_balance_old,
    } = await get_balances(signer);

    console.log('wbtc_balance:', wbtc_balance_old);
    console.log('usdc_balance:', usdc_balance_old);

    {
      const tx = await sr.v3swap({
        pool: WBTCUSDC,
        from: USDC,
        to: WBTC,
        deadline: ethers.BigNumber.from('0xfffffffffffffffffffffffff'),
        amount_from: ethers.BigNumber.from(1_000_000),
        amount_to: ethers.BigNumber.from(0),
        sqrtPriceLimitX96: ethers.BigNumber.from(0),
      });
      await tx.wait();
    }


    const {
      wbtc_balance: wbtc_balance_new,
      usdc_balance: usdc_balance_new,
    } = await get_balances(signer);

    console.log('wbtc_balance:', wbtc_balance_new);
    console.log('usdc_balance:', usdc_balance_new);
    console.log('delta:\nwbtc:', wbtc_balance_new.sub(wbtc_balance_old));
    console.log('usdc:', usdc_balance_new.sub(usdc_balance_old));

    await hre.network.provider.request({
      method: "hardhat_stopImpersonatingAccount",
      params: [WBTC_OWNER],
    });
    await hre.network.provider.request({
      method: "hardhat_stopImpersonatingAccount",
      params: [USDC_OWNER],
    });
  });
});

