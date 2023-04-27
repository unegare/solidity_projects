describe('SigUtils', function() {
  it('getDaiDigest', async function() {
    const SigUtils = await hre.ethers.getContractFactory('SigUtils');
    const sigUtils = await SigUtils.deploy(hre.ethers.BigNumber.from('0x06c37168a7db5138defc7866392bb87a741f9b3d104deb5094588ce041cae335')); // USDC
    console.log(await sigUtils.getDaiDigest('0x6BbdbfD213f174e5E3Ad7e7c395aBEa0F05a585C', '0x6BbdbfD213f174e5E3Ad7e7c395aBEa0F05a585C', hre.ethers.BigNumber.from('0x0'), hre.ethers.BigNumber.from(((1n<<256n)-1n).toString()), true));
  });
  it('getUSDCDigest', async function() {
    const SigUtils = await hre.ethers.getContractFactory('SigUtils');
    const sigUtils = await SigUtils.deploy(hre.ethers.BigNumber.from('0x06c37168a7db5138defc7866392bb87a741f9b3d104deb5094588ce041cae335')); // USDC
//    const PERMIT_TYPEHASH = '0x6e71edae12b1b97f4d1f60370fef10105fa2faae0126114a169c64845d6126c9';
    const permit_params = {
      owner: '0x6BbdbfD213f174e5E3Ad7e7c395aBEa0F05a585C',
      spender: '0x6BbdbfD213f174e5E3Ad7e7c395aBEa0F05a585C',
      value: ethers.BigNumber.from(1_000_000),
      nonce: ethers.BigNumber.from(0),
      deadline: ethers.BigNumber.from(((1n<<256n)-1n).toString()),
    };
    console.log(await sigUtils.getTypedDataHash(permit_params));
  });
});
