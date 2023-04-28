import { time, loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { anyValue } from "@nomicfoundation/hardhat-chai-matchers/withArgs";
import { expect } from "chai";
import { ethers } from "hardhat";

const IERC20_SOURCE = "openzeppelin-contracts/contracts/token/ERC20/IERC20.sol:IERC20";

const WBTC = '0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599';
const USDT = '0xdAC17F958D2ee523a2206206994597C13D831ec7';

const WBTCUSDT = '0x9Db9e0e53058C89e5B94e29621a205198648425B';

const WBTC_OWNER = '0x8EB8a3b98659Cce290402893d0123abb75E3ab28'; //'0x9ff58f4fFB29fA2266Ab25e75e2A8b3503311656';
const USDT_OWNER = '0x47ac0Fb4F2D84898e4D9E7b4DaB3C24507a6D503';


describe("SimpleRouter", function () {
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

    const get_erc20 = async (addr) => {
      const erc20 = await ethers.getContractAt(IERC20_SOURCE, addr, signer);
      return erc20.connect(signer);
    };

    const wbtc = await get_erc20(WBTC);
    const usdt = await get_erc20(USDT);

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
});

